"""Business logic: events, audit, serialization, dispatch, hospital ranking, simulation."""
import asyncio, json, os
from datetime import datetime
from fastapi import WebSocket
from sqlalchemy.orm import Session
from . import routing
from .db import SessionLocal
from .models import *

ACTIVE = ["offered", "en_route", "on_scene", "transporting", "at_hospital"]
AUTOSIM = os.getenv("RESQ_AUTOSIM", "1") == "1"
TICK = float(os.getenv("RESQ_SIM_TICK", "1.0"))
LOOP: asyncio.AbstractEventLoop | None = None


# ---------- realtime ----------
class Manager:
    def __init__(self):
        self.conns: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept(); self.conns.append(ws)

    def drop(self, ws):
        if ws in self.conns:
            self.conns.remove(ws)

    async def broadcast(self, ev: dict):
        for ws in list(self.conns):
            try:
                await ws.send_json(ev)
            except Exception:
                self.drop(ws)


manager = Manager()


def emit(ev: dict):
    if LOOP is None or not manager.conns:
        return
    asyncio.run_coroutine_threadsafe(manager.broadcast(ev), LOOP)


def audit(db: Session, actor: str, action: str, entity: str, entity_id=None, detail=""):
    db.add(AuditLog(actor=actor, action=action, entity=entity, entity_id=entity_id, detail=detail))


def track(db: Session, inc_id, asg_id, event, message, lat=None, lng=None, eta=None):
    db.add(TrackingEvent(incident_id=inc_id, assignment_id=asg_id, event=event, message=message, lat=lat, lng=lng, eta_min=eta))


# ---------- serialization ----------
def iso(d):
    return d.isoformat() + "Z" if d else None


def j(s):
    return json.loads(s) if s else None


def ser_amb(a: Ambulance):
    return {"id": a.id, "code": a.code, "driver_name": a.driver_name, "phone": a.phone, "lat": a.lat, "lng": a.lng,
            "status": a.status, "crew_level": a.crew_level, "note": a.note}


def ser_hosp(h: Hospital):
    return {"id": h.id, "name": h.name, "lat": h.lat, "lng": h.lng, "phone": h.phone, "total_beds": h.total_beds,
            "available_beds": h.available_beds, "icu_beds": h.icu_beds,
            "capabilities": [c for c in (h.capabilities or "").split(",") if c], "receiving": h.receiving,
            "status": getattr(h, "status", "verified") or "verified",
            "last_admission_at": iso(getattr(h, "last_admission_at", None)),
            "updated_at": iso(h.updated_at)}


def ser_asg(a: Assignment):
    h = getattr(a, "hospital", None)
    return {"id": a.id, "incident_id": a.incident_id, "ambulance_id": a.ambulance_id,
            "ambulance_code": a.ambulance.code if a.ambulance else None,
            "driver_name": a.ambulance.driver_name if a.ambulance else None,
            "driver_phone": a.ambulance.phone if a.ambulance else None,
            "status": a.status,
            "explanation": a.explanation, "ranking": j(a.ranking) or [], "scene_route": j(a.scene_route),
            "hospital_route": j(a.hospital_route), "hospital_id": a.hospital_id,
            "hospital_name": h.name if h else None,
            "hospital_available_beds": h.available_beds if h else None,
            "hospital_icu_beds": h.icu_beds if h else None,
            "hospital_phone": h.phone if h else None,
            "leg": a.leg,
            "leg_complete": bool(a.leg_complete), "remaining_eta": a.remaining_eta,
            "offered_at": iso(a.offered_at), "responded_at": iso(a.responded_at), "completed_at": iso(a.completed_at)}


def ser_inc(i: Incident):
    sh = getattr(i, "selected_hospital", None)
    return {"id": i.id, "camera_id": i.camera_id, "camera_name": i.camera.name if i.camera else None,
            "lat": i.lat, "lng": i.lng, "location_name": i.location_name, "status": i.status, "priority": i.priority,
            "source": i.source, "confidence": i.confidence, "notes": i.notes, "verified_by": i.verified_by,
            "required_ambulances": getattr(i, "required_ambulances", 1) or 1,
            "police_notified": bool(getattr(i, "police_notified", False)),
            "green_corridor": bool(getattr(i, "green_corridor", False)),
            "verification_answers": j(getattr(i, "verification_answers", None)),
            "assessment": j(i.assessment), "recommended_hospital_id": i.recommended_hospital_id,
            "selected_hospital_id": i.selected_hospital_id,
            "selected_hospital_name": sh.name if sh else None,
            "selected_hospital_beds": sh.available_beds if sh else None,
            "selected_hospital_icu": sh.icu_beds if sh else None,
            "selected_hospital_phone": sh.phone if sh else None,
            "hospital_warning": i.hospital_warning,
            "is_demo": i.is_demo, "created_at": iso(i.created_at), "completed_at": iso(i.completed_at),
            "evidence": [{"id": e.id, "url": f"/evidence/{e.filename}", "seq": e.seq, "captured_at": iso(e.captured_at)} for e in i.evidence],
            "assignments": [ser_asg(a) for a in i.assignments]}


# ---------- dispatch & timeout ----------
async def schedule_timeout(aid: int, delay: float = 60.0):
    await asyncio.sleep(delay)
    try:
        with SessionLocal() as db:
            a = db.get(Assignment, aid)
            if a and a.status == "offered":
                code = a.ambulance.code if a.ambulance else f"Unit #{a.ambulance_id}"
                inc = db.get(Incident, a.incident_id)
                a.status = "declined"
                a.responded_at = datetime.utcnow()
                audit(db, "system", "offer_timeout", "assignment", aid, f"{code} response timed out after 60s")
                track(db, inc.id, aid, "timeout", f"{code} did not respond within 60s — auto-forwarding to next nearest unit")
                db.commit()
                emit({"type": "assignment_updated", "incident_id": inc.id, "ambulance_id": a.ambulance_id, "level": "warning",
                      "message": f"Dispatch timeout: {code} did not respond within 60s. Auto-forwarding to next nearest ambulance."})
                dispatch(db, inc, "system")
    except Exception as e:
        print("Timeout scheduler error:", e)


def dispatch(db: Session, inc: Incident, actor="system"):
    """Rank eligible ambulances by simulated route ETA and send an offer to the best one."""
    busy = {a.ambulance_id for a in db.query(Assignment).filter(Assignment.status.in_(ACTIVE))}
    declined = {a.ambulance_id for a in db.query(Assignment).filter_by(incident_id=inc.id) if a.status in ("declined", "cancelled")}
    ambs = db.query(Ambulance).order_by(Ambulance.id).all()
    cands, excluded = [], []
    for a in ambs:
        if a.status != "available":
            excluded.append(f"{a.code} ({a.status})")
        elif a.id in busy:
            excluded.append(f"{a.code} (already has an active assignment)")
        elif a.id in declined:
            excluded.append(f"{a.code} (declined this incident)")
        else:
            r = routing.route((a.lat, a.lng), (inc.lat, inc.lng))
            cands.append({"ambulance_id": a.id, "code": a.code, "distance_km": r["distance_km"], "eta_min": r["eta_min"], "route": r})
    cands.sort(key=lambda c: (c["eta_min"], c["distance_km"]))
    if not cands:
        inc.status = "no_ambulance"
        audit(db, actor, "dispatch_failed", "incident", inc.id, "No eligible ambulance")
        track(db, inc.id, None, "no_ambulance", "No suitable ambulance available — dispatcher action required")
        db.commit()
        emit({"type": "alert", "level": "error", "incident_id": inc.id,
              "message": f"Incident #{inc.id}: NO suitable ambulance available. Retry dispatch when one frees up."})
        emit({"type": "incident_updated", "incident_id": inc.id})
        return None
    best = cands[0]
    expl = (f"{best['code']} selected: ranked #1 of {len(cands)} eligible ambulance(s) by SIMULATED road-route ETA "
            f"({best['eta_min']} min, {best['distance_km']} km). ")
    if len(cands) > 1:
        expl += "Next best: " + "; ".join(f"{c['code']} {c['eta_min']} min" for c in cands[1:3]) + ". "
    if excluded:
        expl += "Not eligible: " + ", ".join(excluded) + "."
    ranking = [{k: v for k, v in c.items() if k != "route"} for c in cands]
    asg = Assignment(incident_id=inc.id, ambulance_id=best["ambulance_id"], status="offered", explanation=expl,
                     ranking=json.dumps(ranking), scene_route=json.dumps(best["route"]), remaining_eta=best["eta_min"])
    db.add(asg)
    if inc.status not in ("en_route", "on_scene", "transporting", "at_hospital"):
        inc.status = "dispatching"
    audit(db, actor, "offer_sent", "incident", inc.id, expl)
    track(db, inc.id, None, "offer_sent", f"Assignment offered to {best['code']}")
    db.commit()
    db.refresh(asg)
    emit({"type": "assignment_updated", "incident_id": inc.id, "ambulance_id": asg.ambulance_id,
          "message": f"New assignment offer for {best['code']} — Incident #{inc.id}", "level": "warning"})
    emit({"type": "incident_updated", "incident_id": inc.id})
    if LOOP is not None:
        asyncio.run_coroutine_threadsafe(schedule_timeout(asg.id, 60.0), LOOP)
    return asg


# ---------- hospital recommendation ----------
def recommend_hospitals(db: Session, inc: Incident):
    a = j(inc.assessment) or {}
    needs = set(a.get("needs", []))
    if a.get("severity") == "critical":
        needs.add("trauma")
    patients = max(1, int(a.get("patients", 1)))
    out = []
    for h in db.query(Hospital).order_by(Hospital.id):
        caps = {c for c in (h.capabilities or "").split(",") if c}
        why = []
        if getattr(h, "status", "verified") != "verified":
            why.append("pending admin verification")
        if not h.receiving:
            why.append("not receiving patients")
        if h.available_beds < patients:
            why.append(f"only {h.available_beds} bed(s) free for {patients} patient(s)")
        if "icu" in needs and h.icu_beds < 1:
            why.append("no ICU bed")
        missing = sorted(needs - caps - {"icu"})
        if missing:
            why.append("lacks " + "/".join(missing))
        r = routing.route((inc.lat, inc.lng), (h.lat, h.lng))
        out.append({"hospital": ser_hosp(h), "eligible": not why, "excluded_reasons": why,

                    "eta_min": r["eta_min"], "distance_km": r["distance_km"], "route": r})
    elig = sorted([o for o in out if o["eligible"]], key=lambda o: o["eta_min"])
    for n, o in enumerate(elig):
        o["rank"] = n + 1
        o["explanation"] = (f"{o['hospital']['name']}: receiving, {o['hospital']['available_beds']} simulated free bed(s), "
                            f"meets required care ({', '.join(sorted(needs)) or 'general'}), SIMULATED ETA {o['eta_min']} min"
                            + (" — fastest eligible." if n == 0 else "."))
    inelig = [o for o in out if not o["eligible"]]
    return elig + inelig, needs


# ---------- simulation ----------
def finish_leg(db: Session, a: Assignment, leg: str):
    route = j(a.scene_route if leg == "scene" else a.hospital_route)
    amb = db.get(Ambulance, a.ambulance_id)
    amb.lat, amb.lng = route["coords"][-1]
    a.remaining_eta = 0.0
    a.leg_complete = True


def start_leg(db: Session, a: Assignment, leg: str):
    a.leg = leg
    a.leg_complete = False
    route = j(a.scene_route if leg == "scene" else a.hospital_route)
    a.remaining_eta = route["eta_min"]
    db.commit()
    if AUTOSIM and LOOP is not None:
        asyncio.run_coroutine_threadsafe(run_leg(a.id, leg), LOOP)


async def run_leg(aid: int, leg: str):
    with SessionLocal() as db:
        a = db.get(Assignment, aid)
        route = j(a.scene_route if leg == "scene" else a.hospital_route)
        amb_id, inc_id, code = a.ambulance_id, a.incident_id, a.ambulance.code
    coords, eta = route["coords"], route["eta_min"]
    cum = routing.cumulative(coords)
    steps = int(max(12, min(40, eta * 6)))
    for s in range(1, steps + 1):
        await asyncio.sleep(TICK)
        with SessionLocal() as db:
            a = db.get(Assignment, aid)
            if a is None or a.leg != leg or a.leg_complete or a.status not in ("en_route", "transporting"):
                return
            lat, lng = routing.point_at(coords, cum, s / steps)
            amb = db.get(Ambulance, amb_id)
            amb.lat, amb.lng = lat, lng
            a.remaining_eta = round(eta * (1 - s / steps), 1)
            a.leg_complete = s == steps
            if s % 6 == 0 or s == steps:
                track(db, inc_id, aid, "position", f"{code} position update", lat, lng, a.remaining_eta)
            db.commit()
            rem = a.remaining_eta
        emit({"type": "tracking", "incident_id": inc_id, "assignment_id": aid, "ambulance_id": amb_id,
              "lat": lat, "lng": lng, "remaining_eta": rem, "leg": leg, "simulated": True})
    with SessionLocal() as db:
        a = db.get(Assignment, aid)
        track(db, inc_id, aid, "leg_complete", f"{code} reached the {'scene' if leg == 'scene' else 'hospital'} (simulated)")
        db.commit()
    emit({"type": "assignment_updated", "incident_id": inc_id, "ambulance_id": amb_id, "level": "success",
          "message": f"{code} has reached the {'accident scene' if leg == 'scene' else 'hospital'} (simulated)"})
