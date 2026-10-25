import asyncio, hashlib, json, secrets, uuid
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from . import core, routing, detection
from .core import *
from .db import get_db, EVIDENCE, SessionLocal
from .models import *
from .seed import seed, h

TOKENS: dict[str, int] = {}


@asynccontextmanager
async def lifespan(app):
    core.LOOP = asyncio.get_running_loop()
    seed()
    yield


app = FastAPI(title="ResQRoute AI — local prototype API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], allow_methods=["*"], allow_headers=["*"])
app.mount("/evidence", StaticFiles(directory=str(EVIDENCE)), name="evidence")


def user_dep(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    tok = (authorization or "").replace("Bearer ", "")
    uid = TOKENS.get(tok)
    u = db.get(User, uid) if uid else None
    if not u:
        raise HTTPException(401, "Not authenticated")
    return u


def need(*roles):
    def dep(u: User = Depends(user_dep)):
        if u.role != "admin" and u.role not in roles:
            raise HTTPException(403, f"Role '{u.role}' is not allowed to do this")
        return u
    return dep


def get_or_404(db, model, id_):
    o = db.get(model, id_)
    if not o:
        raise HTTPException(404, f"{model.__name__} {id_} not found")
    return o


def own_check(u: User, a: Assignment):
    if u.role == "driver" and u.ambulance_id != a.ambulance_id:
        raise HTTPException(403, "This assignment belongs to another ambulance")


# ---------------- auth ----------------
class Login(BaseModel):
    username: str
    password: str


def ser_user(u):
    return {"id": u.id, "username": u.username, "name": u.name, "role": u.role, "ambulance_id": u.ambulance_id, "hospital_id": u.hospital_id}


@app.post("/api/auth/login")
def login(b: Login, db: Session = Depends(get_db)):
    u = db.query(User).filter_by(username=b.username).first()
    if not u or u.password_hash != h(b.password):
        raise HTTPException(401, "Invalid username or password")
    tok = secrets.token_hex(16)
    TOKENS[tok] = u.id
    audit(db, u.username, "login", "user", u.id); db.commit()
    return {"token": tok, "user": ser_user(u)}


@app.get("/api/auth/me")
def me(u: User = Depends(user_dep)):
    return ser_user(u)


@app.get("/api/health")
def health():
    return {"status": "ok", "external_services_required": False, "simulation": True}


# ---------------- data ----------------
@app.get("/api/bootstrap")
def bootstrap(db: Session = Depends(get_db), u: User = Depends(user_dep)):
    return {"incidents": [ser_inc(i) for i in db.query(Incident).order_by(Incident.id.desc())],
            "ambulances": [ser_amb(a) for a in db.query(Ambulance).order_by(Ambulance.id)],
            "hospitals": [ser_hosp(x) for x in db.query(Hospital).order_by(Hospital.id)],
            "cameras": [{"id": c.id, "name": c.name, "location_name": c.location_name, "lat": c.lat, "lng": c.lng, "status": c.status} for c in db.query(Camera)]}


@app.get("/api/network")
def network():
    return routing.network()


@app.get("/api/route")
def get_route(from_lat: float, from_lng: float, to_lat: float, to_lng: float):
    return routing.route((from_lat, from_lng), (to_lat, to_lng))


# ---------------- incidents ----------------
class IncidentIn(BaseModel):
    camera_id: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    confidence: Optional[float] = None
    source: str = "heuristic"
    notes: str = ""


@app.post("/api/incidents")
def create_incident(b: IncidentIn, db: Session = Depends(get_db), u: User = Depends(need())):
    cam = db.get(Camera, b.camera_id) if b.camera_id else None
    lat = b.lat if b.lat is not None else (cam.lat if cam else None)
    lng = b.lng if b.lng is not None else (cam.lng if cam else None)
    if lat is None or lng is None:
        raise HTTPException(422, "camera_id or lat/lng is required")
    inc = Incident(camera_id=cam.id if cam else None, lat=lat, lng=lng, location_name=cam.location_name if cam else "Manual location",
                   source=b.source, confidence=b.confidence, notes=b.notes, status="dispatching", required_ambulances=1)
    db.add(inc); db.flush()
    src_label = "PyTorch AI Model (resqroute_accident_model.pt)" if b.source in ("ai_model", "ml_model") else b.source
    conf_str = f"{round((b.confidence or 0.85) * 100)}%" if b.confidence is not None else "n/a"
    audit(db, u.username, "accident_detected", "incident", inc.id, f"source={src_label} confidence={conf_str}")
    track(db, inc.id, None, "detected", f"AI Surveillance ({src_label}) detected collision with {conf_str} confidence — automated nearest ambulance allocation initiated")
    db.commit()
    # AUTOMATIC AMBULANCE ALLOCATION
    asg = dispatch(db, inc, "ResQRoute AI Surveillance")

    # AUTOMATIC NEAREST HOSPITAL ALLOCATION BASED ON SEAT AVAILABILITY
    recs, _ = recommend_hospitals(db, inc)
    elig = [r for r in recs if r["eligible"]]
    hosp_name = "Emergency Trauma Centre"
    hosp_beds = 0
    if elig:
        top_h = elig[0]
        inc.recommended_hospital_id = inc.selected_hospital_id = top_h["hospital"]["id"]
        hosp_name = top_h["hospital"]["name"]
        hosp_beds = top_h["hospital"]["available_beds"]
        if asg:
            asg.hospital_id = top_h["hospital"]["id"]
            asg.hospital_route = json.dumps(top_h["route"])
        track(db, inc.id, asg.id if asg else None, "hospital_assigned",
              f"Nearest hospital assigned by seat availability: {hosp_name} ({hosp_beds} beds free, {top_h['hospital']['icu_beds']} ICU, ETA {top_h['eta_min']} min)")

    db.commit()
    db.refresh(inc)
    unit_str = asg.ambulance.code if asg and asg.ambulance else "nearest unit"
    emit({"type": "incident_created", "incident_id": inc.id, "level": "error",
          "message": f"🚨 ACCIDENT DETECTED by AI Model at {inc.location_name}! Confidence: {conf_str} (>= 80% Threshold). Nearest ambulance ({unit_str}) dispatched & Nearest hospital assigned based on seat availability: {hosp_name} ({hosp_beds} beds free)."})
    return ser_inc(inc)


@app.get("/api/incidents")
def list_incidents(db: Session = Depends(get_db), u: User = Depends(user_dep)):
    return [ser_inc(i) for i in db.query(Incident).order_by(Incident.id.desc())]


@app.get("/api/incidents/{iid}")
def one_incident(iid: int, db: Session = Depends(get_db), u: User = Depends(user_dep)):
    return ser_inc(get_or_404(db, Incident, iid))


@app.post("/api/incidents/{iid}/evidence")
async def add_evidence(iid: int, file: UploadFile = File(...), db: Session = Depends(get_db), u: User = Depends(need())):
    inc = get_or_404(db, Incident, iid)
    data = await file.read()
    if not data or len(data) > 8_000_000:
        raise HTTPException(422, "Empty or too large image")
    fn = f"inc{iid}_{uuid.uuid4().hex[:8]}.jpg"
    (EVIDENCE / fn).write_bytes(data)
    seq = len(inc.evidence) + 1
    db.add(Evidence(incident_id=iid, filename=fn, seq=seq))
    audit(db, u.username, "evidence_uploaded", "incident", iid, fn); db.commit()
    emit({"type": "evidence_added", "incident_id": iid, "message": f"Evidence image {seq} available for incident #{iid}", "level": "info"})
    return {"ok": True, "seq": seq, "url": f"/evidence/{fn}"}


class Verify(BaseModel):
    action: str  # confirm | reject | escalate
    notes: str = ""


@app.post("/api/incidents/{iid}/verify")
def verify(iid: int, b: Verify, db: Session = Depends(get_db), u: User = Depends(need())):
    inc = get_or_404(db, Incident, iid)
    if inc.status not in ("suspected", "dispatching"):
        raise HTTPException(409, f"Incident is '{inc.status}', cannot be verified")
    if b.action not in ("confirm", "reject", "escalate"):
        raise HTTPException(422, "action must be confirm, reject or escalate")
    inc.verified_by = u.name
    if b.notes:
        inc.notes = (inc.notes or "") + f"\n[{u.name}] {b.notes}"
    audit(db, u.username, f"incident_{b.action}", "incident", iid, b.notes)
    if b.action == "reject":
        inc.status = "rejected"
        for a in inc.assignments:
            if a.status == "offered":
                a.status = "cancelled"
        track(db, iid, None, "rejected", "Dispatcher rejected the suspected incident (false alarm)")
        db.commit()
        emit({"type": "incident_updated", "incident_id": iid, "message": f"Incident #{iid} rejected", "level": "info"})
        return ser_inc(inc)
    if b.action == "escalate":
        inc.priority = "critical"
    inc.status = "dispatching"
    track(db, iid, None, "confirmed", f"Dispatcher {b.action}ed the incident" if b.action == "confirm" else "Dispatcher ESCALATED the incident")
    # If no active assignment yet, dispatch
    if not any(a.status in ACTIVE for a in inc.assignments):
        dispatch(db, inc, u.username)
    db.commit()
    db.refresh(inc)
    return ser_inc(inc)


@app.post("/api/incidents/{iid}/dispatch")
def redispatch(iid: int, db: Session = Depends(get_db), u: User = Depends(need())):
    inc = get_or_404(db, Incident, iid)
    if inc.status not in ("no_ambulance", "dispatching"):
        raise HTTPException(409, f"Cannot (re)dispatch an incident that is '{inc.status}'")
    cur = next((a for a in inc.assignments if a.status == "offered"), None)
    if cur:  # dispatcher forces reassignment away from an unresponsive driver
        cur.status = "cancelled"; cur.responded_at = now()
        track(db, iid, cur.id, "offer_cancelled", f"Offer to {cur.ambulance.code} withdrawn by dispatcher")
        db.commit()
    dispatch(db, inc, u.username)
    db.refresh(inc)
    return ser_inc(inc)


@app.get("/api/incidents/{iid}/tracking")
def incident_tracking(iid: int, db: Session = Depends(get_db), u: User = Depends(user_dep)):
    ev = db.query(TrackingEvent).filter_by(incident_id=iid).order_by(TrackingEvent.id).all()
    return [{"id": e.id, "event": e.event, "message": e.message, "lat": e.lat, "lng": e.lng, "eta_min": e.eta_min, "ts": iso(e.ts)} for e in ev]


# ---------------- assignments ----------------
class DriverVerify(BaseModel):
    verified: bool  # True: accident verified, False: false alarm
    ambulances_needed: int = 1  # 1 to 5
    notes: str = ""


@app.post("/api/assignments/{aid}/verify-and-respond")
def verify_and_respond(aid: int, b: DriverVerify, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a = get_or_404(db, Assignment, aid)
    own_check(u, a)
    if a.status != "offered":
        raise HTTPException(409, f"Assignment is '{a.status}', not awaiting a response")
    inc = db.get(Incident, a.incident_id)
    a.responded_at = now()
    code = a.ambulance.code

    if not b.verified:
        # Driver verified 6 screenshots as false alarm / minor
        a.status = "declined"
        inc.status = "rejected"
        audit(db, u.username, "driver_reported_false_alarm", "incident", inc.id, b.notes)
        track(db, inc.id, aid, "rejected", f"{code} examined 6 camera screenshots and reported: False alarm / no dispatch required")
        db.commit()
        emit({"type": "incident_updated", "incident_id": inc.id, "level": "info",
              "message": f"Incident #{inc.id} marked as False Alarm by {code}"})
        return ser_inc(inc)

    # Accident verified by primary paramedic!
    req = max(1, min(5, b.ambulances_needed))
    inc.required_ambulances = req
    inc.status = "en_route"
    inc.verified_by = f"{u.name} ({code})"
    inc.verification_answers = json.dumps({"verified": True, "ambulances_needed": req, "notes": b.notes})

    a.status = "en_route"
    a.ambulance.status = "busy"

    # Automatically assign best receiving trauma hospital
    recs, needs = recommend_hospitals(db, inc)
    elig = [r for r in recs if r["eligible"]]
    hosp_name = "Trauma Emergency Hospital"
    if elig:
        top = elig[0]
        inc.recommended_hospital_id = inc.selected_hospital_id = top["hospital"]["id"]
        a.hospital_id = top["hospital"]["id"]
        a.hospital_route = json.dumps(top["route"])
        hosp_name = top["hospital"]["name"]

    inc.police_notified = True
    inc.green_corridor = True

    audit(db, u.username, "driver_verified_accident", "incident", inc.id, f"Verified by {code}, required_ambulances={req}")
    track(db, inc.id, aid, "verified", f"{code} VERIFIED ACCIDENT from 6 camera frames. Needed fleet: {req} ambulance(s). Rushing ASAP to scene!")
    track(db, inc.id, aid, "police_corridor", f"Traffic Police notified: Green corridor priority route enabled for {code} -> {hosp_name}")
    db.commit()
    start_leg(db, a, "scene")

    # If more than 1 ambulance is requested by Driver 1, cascade automated dispatch to next nearest units!
    if req > 1:
        for _ in range(req - 1):
            dispatch(db, inc, f"Automated cascade dispatch (requested by {code})")

    emit({"type": "incident_updated", "incident_id": inc.id, "level": "success",
          "message": f"🚨 {code} VERIFIED ACCIDENT! En route ASAP to {inc.location_name}. Hospital allocated: {hosp_name}."})
    emit({"type": "police_alert", "incident_id": inc.id, "level": "warning",
          "message": f"🚔 POLICE GREEN CORRIDOR: Traffic clearance active for {code} -> {hosp_name}."})
    return ser_inc(inc)


class Respond(BaseModel):
    accept: bool


@app.post("/api/assignments/{aid}/respond")
def respond(aid: int, b: Respond, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a = get_or_404(db, Assignment, aid)
    own_check(u, a)
    if a.status != "offered":
        raise HTTPException(409, f"Assignment is '{a.status}', not awaiting a response")
    inc = db.get(Incident, a.incident_id)
    a.responded_at = now()
    code = a.ambulance.code
    if b.accept:
        # defensive: ambulance must not hold another active assignment
        other = db.query(Assignment).filter(Assignment.ambulance_id == a.ambulance_id, Assignment.id != a.id,
                                            Assignment.status.in_(["en_route", "on_scene", "transporting", "at_hospital"])).first()
        if other:
            raise HTTPException(409, "Ambulance already has an active assignment")
        a.status = "en_route"; inc.status = "en_route"
        a.ambulance.status = "busy"
        if inc.selected_hospital_id:
            a.hospital_id = inc.selected_hospital_id
            hosp = db.get(Hospital, inc.selected_hospital_id)
            if hosp:
                a.hospital_route = json.dumps(routing.route((inc.lat, inc.lng), (hosp.lat, hosp.lng)))
        audit(db, u.username, "cascade_offer_accepted", "assignment", aid)
        track(db, inc.id, aid, "accepted", f"{code} accepted multi-unit response call and is en route ASAP to scene")
        db.commit()
        start_leg(db, a, "scene")
        emit({"type": "assignment_updated", "incident_id": inc.id, "ambulance_id": a.ambulance_id, "level": "success",
              "message": f"{code} accepted multi-unit response for incident #{inc.id} and is en route ASAP"})
        emit({"type": "incident_updated", "incident_id": inc.id})
        # Check if more units still needed
        active_count = db.query(Assignment).filter(
            Assignment.incident_id == inc.id,
            Assignment.status.in_(["offered", "en_route", "on_scene", "transporting", "at_hospital"])
        ).count()
        req = getattr(inc, "required_ambulances", 1) or 1
        if active_count < req:
            dispatch(db, inc, "Cascade auto-dispatch for remaining units")
        return ser_inc(inc)
    a.status = "declined"
    audit(db, u.username, "offer_declined", "assignment", aid)
    track(db, inc.id, aid, "declined", f"{code} declined — offering to next nearest eligible ambulance")
    db.commit()
    emit({"type": "assignment_updated", "incident_id": inc.id, "ambulance_id": a.ambulance_id, "level": "warning",
          "message": f"{code} declined incident #{inc.id}"})
    dispatch(db, inc, "system")
    db.refresh(inc)
    return ser_inc(inc)


def _asg_inc(db, aid, u, status):
    a = get_or_404(db, Assignment, aid)
    own_check(u, a)
    if a.status != status:
        raise HTTPException(409, f"Assignment is '{a.status}', expected '{status}'")
    return a, db.get(Incident, a.incident_id)


def _done(inc, a, msg, level="info"):
    emit({"type": "assignment_updated", "incident_id": inc.id, "ambulance_id": a.ambulance_id, "message": msg, "level": level})
    emit({"type": "incident_updated", "incident_id": inc.id})


@app.post("/api/assignments/{aid}/arrive-scene")
def arrive_scene(aid: int, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a, inc = _asg_inc(db, aid, u, "en_route")
    if not a.leg_complete:
        raise HTTPException(409, "Ambulance has not reached the scene yet (simulation still running)")
    a.status = "on_scene"; inc.status = "on_scene"; a.leg = None
    audit(db, u.username, "arrived_scene", "assignment", aid)
    track(db, inc.id, aid, "on_scene", f"{a.ambulance.code} arrived at the scene", inc.lat, inc.lng, 0)
    db.commit(); _done(inc, a, f"{a.ambulance.code} arrived at scene of incident #{inc.id}", "success")
    return ser_inc(inc)


class Assessment(BaseModel):
    severity: str = "moderate"  # minor | moderate | critical
    patients: int = 1
    needs: list[str] = []
    notes: str = ""


@app.post("/api/assignments/{aid}/assessment")
def assessment(aid: int, b: Assessment, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a, inc = _asg_inc(db, aid, u, "on_scene")
    if b.severity not in ("minor", "moderate", "critical"):
        raise HTTPException(422, "Invalid severity")
    inc.assessment = json.dumps(b.model_dump())
    recs, needs = recommend_hospitals(db, inc)
    elig = [r for r in recs if r["eligible"]]
    if elig:
        top = elig[0]
        inc.recommended_hospital_id = inc.selected_hospital_id = top["hospital"]["id"]
        a.hospital_id = top["hospital"]["id"]
        a.hospital_route = json.dumps(top["route"])
        inc.hospital_warning = None
        msg = f"Crew assessment submitted. Recommended hospital: {top['hospital']['name']}"
    else:
        inc.recommended_hospital_id = inc.selected_hospital_id = None
        a.hospital_id = None; a.hospital_route = None
        inc.hospital_warning = "No suitable hospital available (not receiving / capacity / care needs). Dispatcher must choose."
        msg = "WARNING: no suitable hospital for this assessment"
    inc.status = "assessed"
    audit(db, u.username, "assessment_submitted", "incident", inc.id, json.dumps(b.model_dump()))
    track(db, inc.id, aid, "assessed", msg)
    db.commit()
    _done(inc, a, f"Incident #{inc.id}: {msg}", "success" if elig else "error")
    return ser_inc(inc)


@app.get("/api/incidents/{iid}/hospital-recommendations")
def hospital_recs(iid: int, db: Session = Depends(get_db), u: User = Depends(user_dep)):
    inc = get_or_404(db, Incident, iid)
    if not inc.assessment:
        raise HTTPException(409, "Hospital recommendation is only available after the crew assessment")
    recs, needs = recommend_hospitals(db, inc)
    return {"needs": sorted(needs), "warning": inc.hospital_warning, "recommended_hospital_id": inc.recommended_hospital_id,
            "selected_hospital_id": inc.selected_hospital_id, "candidates": recs,
            "disclaimer": "Hospital data is fictional and ETAs are simulated estimates."}


class SelectHospital(BaseModel):
    hospital_id: int
    override: bool = False


@app.post("/api/incidents/{iid}/select-hospital")
def select_hospital(iid: int, b: SelectHospital, db: Session = Depends(get_db), u: User = Depends(need())):
    inc = get_or_404(db, Incident, iid)
    if inc.status != "assessed":
        raise HTTPException(409, "Hospital can only be changed after assessment and before transport starts")
    recs, _ = recommend_hospitals(db, inc)
    pick = next((r for r in recs if r["hospital"]["id"] == b.hospital_id), None)
    if not pick:
        raise HTTPException(404, "Hospital not found")
    if not pick["eligible"]:
        any_elig = any(r["eligible"] for r in recs)
        if any_elig or not b.override or not pick["hospital"]["receiving"]:
            raise HTTPException(409, "Hospital is not eligible: " + "; ".join(pick["excluded_reasons"]))
    a = next(x for x in inc.assignments if x.status == "on_scene")
    inc.selected_hospital_id = b.hospital_id
    inc.hospital_warning = None if pick["eligible"] else "Dispatcher OVERRIDE: hospital does not meet all assessed needs"
    a.hospital_id = b.hospital_id; a.hospital_route = json.dumps(pick["route"])
    audit(db, u.username, "hospital_selected", "incident", iid, f"{pick['hospital']['name']} override={b.override}")
    track(db, iid, a.id, "hospital_selected", f"Dispatcher selected {pick['hospital']['name']}")
    db.commit()
    _done(inc, a, f"Incident #{iid}: destination changed to {pick['hospital']['name']}")
    return ser_inc(inc)


@app.post("/api/assignments/{aid}/start-hospital-route")
def start_hospital_route(aid: int, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a, inc = _asg_inc(db, aid, u, "on_scene")
    if not inc.assessment:
        raise HTTPException(409, "Submit the crew assessment first")
    if not a.hospital_route:
        raise HTTPException(409, "No suitable hospital selected yet — dispatcher must choose one")
    a.status = "transporting"; inc.status = "transporting"
    audit(db, u.username, "transport_started", "assignment", aid)
    track(db, inc.id, aid, "transporting", f"{a.ambulance.code} heading to hospital (simulated)")
    db.commit()
    start_leg(db, a, "hospital")
    _done(inc, a, f"{a.ambulance.code} is transporting to hospital")
    return ser_inc(inc)


@app.post("/api/assignments/{aid}/arrive-hospital")
def arrive_hospital(aid: int, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a, inc = _asg_inc(db, aid, u, "transporting")
    if not a.leg_complete:
        raise HTTPException(409, "Ambulance has not reached the hospital yet (simulation still running)")
    a.status = "at_hospital"; inc.status = "at_hospital"; a.leg = None
    hosp = db.get(Hospital, a.hospital_id) if a.hospital_id else None
    if hosp:
        hosp.available_beds = max(0, hosp.available_beds - 1)
        hosp.last_admission_at = now()
        hosp.updated_at = now()
    audit(db, u.username, "arrived_hospital", "assignment", aid)
    track(db, inc.id, aid, "at_hospital", f"{a.ambulance.code} arrived at hospital emergency bay — patient admitted. Bed count decreased by 1.", eta=0)
    db.commit()
    emit({"type": "hospital_updated", "level": "warning",
          "message": f"🏥 PATIENT ADMITTED: {a.ambulance.code} admitted patient to {hosp.name if hosp else 'Hospital'}. Bed count decreased by 1 ({hosp.available_beds if hosp else 0} free). Hospital staff requested to verify & update bed availability within 1 hour."})
    _done(inc, a, f"{a.ambulance.code} arrived at hospital emergency bay — patient admitted", "success")
    return ser_inc(inc)


@app.post("/api/assignments/{aid}/complete")
def complete(aid: int, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a, inc = _asg_inc(db, aid, u, "at_hospital")
    patients = (j(inc.assessment) or {}).get("patients", 1)
    hosp = db.get(Hospital, a.hospital_id) if a.hospital_id else None
    if hosp and patients > 1:
        extra = patients - 1
        hosp.available_beds = max(0, hosp.available_beds - extra)
        hosp.updated_at = now()
    a.status = "completed"; a.completed_at = now(); a.ambulance.status = "available"
    inc.status = "completed"; inc.completed_at = now()
    audit(db, u.username, "handover_completed", "assignment", aid, f"patients={patients}")
    track(db, inc.id, aid, "completed", f"Patient handover completed for {a.ambulance.code}. Incident closed.")
    db.commit()
    emit({"type": "hospital_updated", "level": "info",
          "message": f"Handover complete at {hosp.name if hosp else 'hospital'}. Hourly bed count verification requested."})
    emit({"type": "ambulance_updated"})
    _done(inc, a, f"Incident #{inc.id} completed", "success")
    return ser_inc(inc)


@app.post("/api/incidents/{iid}/police-corridor")
def toggle_police_corridor(iid: int, db: Session = Depends(get_db), u: User = Depends(user_dep)):
    inc = get_or_404(db, Incident, iid)
    inc.green_corridor = not getattr(inc, "green_corridor", False)
    status_str = "ACTIVE (GREEN CORRIDOR PRIORITY)" if inc.green_corridor else "DEACTIVATED (STANDARD TRAFFIC)"
    audit(db, u.username, "police_corridor_toggle", "incident", iid, status_str)
    track(db, iid, None, "police_corridor", f"Traffic Police ({u.name}): {status_str} for Incident #{iid}")
    db.commit()
    emit({"type": "incident_updated", "incident_id": iid, "level": "warning" if inc.green_corridor else "info",
          "message": f"Traffic Police update: Green Corridor is {status_str} for incident #{iid}"})
    return ser_inc(inc)


@app.post("/api/assignments/{aid}/simulate/skip")
def skip_travel(aid: int, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    """Demo helper: jump to the end of the current simulated leg."""
    a = get_or_404(db, Assignment, aid)
    own_check(u, a)
    if a.status not in ("en_route", "transporting"):
        raise HTTPException(409, "Nothing to skip")
    finish_leg(db, a, "scene" if a.status == "en_route" else "hospital")
    db.commit()
    _done(db.get(Incident, a.incident_id), a, f"{a.ambulance.code} reached destination (demo skip)", "success")
    return ser_asg(a)


# ---------------- ambulances / hospitals ----------------
class AmbPatch(BaseModel):
    status: str


@app.patch("/api/ambulances/{amb_id}")
def patch_amb(amb_id: int, b: AmbPatch, db: Session = Depends(get_db), u: User = Depends(need("driver"))):
    a = get_or_404(db, Ambulance, amb_id)
    if u.role == "driver" and u.ambulance_id != amb_id:
        raise HTTPException(403, "You can only update your own ambulance status")
    if b.status not in ("available", "offline", "maintenance", "busy"):
        raise HTTPException(422, "Invalid status")
    if b.status == "available" and db.query(Assignment).filter(Assignment.ambulance_id == amb_id, Assignment.status.in_(ACTIVE)).first():
        raise HTTPException(409, "Ambulance has an active emergency assignment")
    a.status = b.status
    audit(db, u.username, "ambulance_status", "ambulance", amb_id, b.status); db.commit()
    emit({"type": "ambulance_updated", "message": f"{a.code} status updated to {b.status}", "level": "info"})
    return ser_amb(a)


class HospitalRegister(BaseModel):
    name: str
    lat: float = 13.0780
    lng: float = 80.2650
    phone: str
    total_beds: int = 60
    available_beds: int = 12
    icu_beds: int = 3
    capabilities: list[str] = ["trauma", "icu"]
    username: str
    password: str


@app.post("/api/hospitals/register")
def register_hospital(b: HospitalRegister, db: Session = Depends(get_db)):
    if db.query(User).filter_by(username=b.username).first():
        raise HTTPException(409, f"Username '{b.username}' is already registered")
    hosp = Hospital(
        name=b.name,
        lat=b.lat,
        lng=b.lng,
        phone=b.phone,
        total_beds=b.total_beds,
        available_beds=b.available_beds,
        icu_beds=b.icu_beds,
        capabilities=",".join(b.capabilities),
        receiving=True,
        status="pending_verification"
    )
    db.add(hosp)
    db.flush()
    user = User(
        username=b.username,
        password_hash=h(b.password),
        name=f"{b.name} Trauma Unit",
        role="hospital",
        hospital_id=hosp.id
    )
    db.add(user)
    audit(db, "system", "hospital_registered", "hospital", hosp.id, f"Registered by {b.username} — pending admin approval")
    db.commit()
    emit({
        "type": "hospital_registered",
        "hospital_id": hosp.id,
        "message": f"New hospital '{hosp.name}' registered! Awaiting Chief Dispatcher verification.",
        "level": "warning"
    })
    return {"ok": True, "hospital": ser_hosp(hosp), "message": "Registration submitted. Awaiting admin approval."}


@app.post("/api/hospitals/{hid}/verify")
def verify_hospital(hid: int, db: Session = Depends(get_db), u: User = Depends(need())):
    hosp = get_or_404(db, Hospital, hid)
    hosp.status = "verified"
    hosp.updated_at = now()
    audit(db, u.username, "hospital_verified", "hospital", hid, "Approved by admin")
    db.commit()
    emit({"type": "hospital_updated", "message": f"Hospital '{hosp.name}' verified and approved by admin", "level": "success"})
    return ser_hosp(hosp)


@app.post("/api/hospitals/{hid}/reject")
def reject_hospital(hid: int, db: Session = Depends(get_db), u: User = Depends(need())):
    hosp = get_or_404(db, Hospital, hid)
    hosp.status = "rejected"
    hosp.receiving = False
    hosp.updated_at = now()
    audit(db, u.username, "hospital_rejected", "hospital", hid, "Rejected by admin")
    db.commit()
    emit({"type": "hospital_updated", "message": f"Hospital '{hosp.name}' registration rejected by admin", "level": "warning"})
    return ser_hosp(hosp)


@app.post("/api/assignments/{aid}/timeout")
def timeout_assignment(aid: int, db: Session = Depends(get_db), u: User = Depends(user_dep)):
    a = get_or_404(db, Assignment, aid)
    if a.status != "offered":
        return ser_inc(db.get(Incident, a.incident_id))
    code = a.ambulance.code
    inc = db.get(Incident, a.incident_id)
    a.status = "declined"
    a.responded_at = now()
    audit(db, u.username, "offer_timeout", "assignment", aid, f"{code} response timed out after 60s")
    track(db, inc.id, aid, "timeout", f"{code} did not respond within 60s — auto-forwarding to next nearest unit")
    db.commit()
    emit({"type": "assignment_updated", "incident_id": inc.id, "ambulance_id": a.ambulance_id, "level": "warning",
          "message": f"Dispatch timeout: {code} did not respond within 60s. Auto-forwarding to next nearest ambulance."})
    dispatch(db, inc, "system")
    db.refresh(inc)
    return ser_inc(inc)



class HospPatch(BaseModel):
    available_beds: Optional[int] = None
    icu_beds: Optional[int] = None
    receiving: Optional[bool] = None


@app.patch("/api/hospitals/{hid}")
def patch_hosp(hid: int, b: HospPatch, db: Session = Depends(get_db), u: User = Depends(need("hospital"))):
    if u.role == "hospital" and u.hospital_id != hid:
        raise HTTPException(403, "You can only update your own hospital")
    x = get_or_404(db, Hospital, hid)
    if b.available_beds is not None:
        if not 0 <= b.available_beds <= x.total_beds:
            raise HTTPException(422, f"available_beds must be 0..{x.total_beds}")
        x.available_beds = b.available_beds
    if b.icu_beds is not None:
        if b.icu_beds < 0:
            raise HTTPException(422, "icu_beds must be >= 0")
        x.icu_beds = b.icu_beds
    if b.receiving is not None:
        x.receiving = b.receiving
    x.updated_at = now()
    audit(db, u.username, "hospital_updated", "hospital", hid, b.model_dump_json()); db.commit()
    emit({"type": "hospital_updated", "message": f"{x.name} capacity/status updated (simulated data)", "level": "info"})
    return ser_hosp(x)


# ---------------- history ----------------
@app.get("/api/history")
def history(db: Session = Depends(get_db), u: User = Depends(user_dep)):
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(200).all()
    ev = db.query(TrackingEvent).filter(TrackingEvent.event != "position").order_by(TrackingEvent.id.desc()).limit(100).all()
    return {"audit": [{"id": l.id, "ts": iso(l.ts), "actor": l.actor, "action": l.action, "entity": l.entity, "entity_id": l.entity_id, "detail": l.detail} for l in logs],
            "events": [{"id": e.id, "incident_id": e.incident_id, "event": e.event, "message": e.message, "ts": iso(e.ts)} for e in ev]}


class SimulateAccidentIn(BaseModel):
    camera_id: int = 1
    confidence: float = 0.92
    threshold: float = 0.80


@app.post("/api/detection/simulate")
def simulate_detection(b: SimulateAccidentIn, db: Session = Depends(get_db), u: User = Depends(need())):
    if b.confidence < b.threshold:
        raise HTTPException(400, f"Simulated confidence ({round(b.confidence*100, 1)}%) must be >= threshold ({round(b.threshold*100, 1)}%)")

    cam = db.get(Camera, b.camera_id) or db.query(Camera).first()
    lat, lng = cam.lat, cam.lng
    loc_name = cam.location_name
    conf_str = f"{round(b.confidence * 100, 1)}%"

    inc = Incident(
        camera_id=cam.id, lat=lat, lng=lng, location_name=loc_name,
        source="ai_model", confidence=b.confidence,
        notes=f"Confirmed collision detection by PyTorch model (resqroute_accident_model.pt) with {conf_str} confidence (crosses {round(b.threshold*100)}% detection level).",
        status="dispatching", required_ambulances=1
    )
    db.add(inc); db.flush()

    # Generate 6 burst evidence frames and attach them
    frames = detection.generate_accident_evidence_frames(cam.id, confidence=b.confidence, location_name=loc_name, num_frames=6)
    for seq, frame_bytes in enumerate(frames, start=1):
        fn = f"inc{inc.id}_{uuid.uuid4().hex[:8]}.jpg"
        (EVIDENCE / fn).write_bytes(frame_bytes)
        db.add(Evidence(incident_id=inc.id, filename=fn, seq=seq))

    # 1. Nearest Ambulance Assignment
    asg = dispatch(db, inc, "PyTorch Deep Learning Surveillance (Simulation)")
    unit_str = asg.ambulance.code if asg and asg.ambulance else "nearest unit"

    # 2. Nearest Hospital Assignment with Seat Availability
    recs, _ = recommend_hospitals(db, inc)
    elig = [r for r in recs if r["eligible"]]
    hosp_name = "Emergency Trauma Centre"
    hosp_beds = 0
    if elig:
        top_h = elig[0]
        inc.recommended_hospital_id = inc.selected_hospital_id = top_h["hospital"]["id"]
        hosp_name = top_h["hospital"]["name"]
        hosp_beds = top_h["hospital"]["available_beds"]
        if asg:
            asg.hospital_id = top_h["hospital"]["id"]
            asg.hospital_route = json.dumps(top_h["route"])
        track(db, inc.id, asg.id if asg else None, "hospital_assigned",
              f"Nearest hospital assigned by seat availability: {hosp_name} ({hosp_beds} beds free, {top_h['hospital']['icu_beds']} ICU, ETA {top_h['eta_min']} min)")

    audit(db, u.username, "accident_detected_simulated", "incident", inc.id, f"source=PyTorch AI Model confidence={conf_str}")
    track(db, inc.id, asg.id if asg else None, "detected",
          f"PyTorch Deep Learning Model (resqroute_accident_model.pt) detected collision with {conf_str} confidence (crosses 80% threshold). 6 evidence screenshots generated.")
    db.commit()
    db.refresh(inc)

    emit({"type": "incident_created", "incident_id": inc.id, "level": "error",
          "message": f"🚨 ACCIDENT DETECTED by PyTorch AI Model ({conf_str} >= 80% Threshold) at {loc_name}! Nearest Ambulance ({unit_str}) dispatched & Nearest Hospital by Seat Availability ({hosp_name} - {hosp_beds} Beds Free) assigned!"})
    if asg:
        emit({"type": "assignment_updated", "incident_id": inc.id, "ambulance_id": asg.ambulance_id,
              "message": f"Emergency Dispatch Call for {unit_str}: Accident at {loc_name}. 6 screenshots transmitted. Assigned Hospital: {hosp_name} ({hosp_beds} Beds Free).", "level": "warning"})

    return ser_inc(inc)


@app.post("/api/detection/frame")
async def detect_frame(
    camera_id: int = Form(...),
    file: UploadFile = File(...),
    threshold: float = Form(0.80),
    u: User = Depends(need())
):
    try:
        return detection.detector.analyse(camera_id, await file.read(), threshold=threshold)
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.get("/api/detection/model-status")
def detect_status(u: User = Depends(user_dep)):
    d = detection.detector
    return {
        "model_active": d.model_loaded,
        "model_name": "ResNet-18 (resqroute_accident_model.pt)",
        "model_path": d.model_path,
        "class_names": d.class_names,
        "accident_class": d.class_names[d.accident_idx] if d.accident_idx < len(d.class_names) else "near_accident_event",
        "image_size": d.image_size,
        "validation_f1": d.validation_f1,
        "cooldown_s": d.cooldown_s,
    }


@app.post("/api/detection/reset")
def detect_reset(u: User = Depends(need())):
    detection.detector.reset()
    return {"ok": True}


@app.get("/api/camera/backend-snapshot")
def backend_snap(u: User = Depends(need())):
    try:
        return Response(detection.backend_snapshot(), media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(503, f"Backend webcam unavailable: {e}")


@app.post("/api/demo/reset")
def demo_reset(u: User = Depends(need())):
    TOKENS_BACKUP = dict(TOKENS)
    seed(reset=True)
    TOKENS.update(TOKENS_BACKUP)
    detection.detector.reset()
    emit({"type": "reset", "message": "Demo data was reset", "level": "info"})
    return {"ok": True}


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        await ws.send_json({"type": "hello", "message": "connected"})
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.drop(ws)
    except Exception:
        manager.drop(ws)
