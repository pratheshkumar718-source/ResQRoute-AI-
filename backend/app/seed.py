"""Database init + demo seed. Run: python -m app.seed   (add --reset to wipe)."""
import hashlib, sys, uuid, json
from .db import Base, engine, SessionLocal, EVIDENCE
from .models import *
from . import detection


def h(p):
    return hashlib.sha256(("resq-demo-salt:" + p).encode()).hexdigest()


def seed(reset=False):
    if reset:
        Base.metadata.drop_all(engine)
        for f in EVIDENCE.glob("*.jpg"):
            f.unlink()
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.query(User).count():
            return
        ambs = [
            Ambulance(code="AMB-01", driver_name="Paramedic Arun Kumar", phone="+91-98401-10001", lat=13.0720, lng=80.2600, status="available", crew_level="ALS"),
            Ambulance(code="AMB-02", driver_name="Paramedic Bala Sundaram", phone="+91-98401-10002", lat=13.0900, lng=80.2800, status="available", crew_level="ALS"),
            Ambulance(code="AMB-03", driver_name="Paramedic Charu Latha", phone="+91-98401-10003", lat=13.0600, lng=80.2300, status="busy", crew_level="BLS", note="En route to hospital transfer"),
            Ambulance(code="AMB-04", driver_name="Paramedic Dev Anand", phone="+91-98401-10004", lat=13.1100, lng=80.3000, status="offline", crew_level="BLS", note="Scheduled maintenance inspection"),
            Ambulance(code="AMB-05", driver_name="Paramedic Esha Sharma", phone="+91-98401-10005", lat=13.0450, lng=80.3100, status="available", crew_level="ALS", note="South Zone Highway Patrol"),
        ]
        hosps = [
            Hospital(name="City Central General Hospital", lat=13.0780, lng=80.2650, phone="+91-44-2800-1001", total_beds=120, available_beds=14, icu_beds=3, capabilities="trauma,icu,neuro"),
            Hospital(name="Riverside Emergency Medical Centre", lat=13.1050, lng=80.2400, phone="+91-44-2800-1002", total_beds=80, available_beds=6, icu_beds=0, capabilities="trauma,pediatric"),
            Hospital(name="Lakeview Trauma & Specialty Hospital", lat=13.0550, lng=80.3000, phone="+91-44-2800-1003", total_beds=60, available_beds=9, icu_beds=2, capabilities="icu,burns,neuro,pediatric,trauma"),
        ]
        cams = [
            Camera(name="CAM-01 Central Junction", location_name="Central Junction, Sector 4", lat=13.0690, lng=80.2520),
            Camera(name="CAM-02 North Ring Flyover", location_name="North Ring Express Flyover", lat=13.0990, lng=80.2680),
            Camera(name="CAM-03 Market Arterial Road", location_name="Market Road Intersect", lat=13.0560, lng=80.2780),
            Camera(name="CAM-04 Riverfront Bridge", location_name="Riverfront Expressway Bridge", lat=13.0850, lng=80.3050),
        ]
        db.add_all(ambs + hosps + cams)
        db.flush()
        users = [
            ("admin", "admin123", "Chief Dispatch Controller", "admin", None, None, "dispatch@resqroute.gov", "+91-44-2561-1000", json.dumps({"station_id": "DISPATCH-HQ-01", "agency": "Central Operations Command"})),
            ("police1", "police123", "Inspector Vikram Singh (Traffic Division)", "police", None, None, "traffic.hq@police.gov.in", "+91-44-2345-0103", json.dumps({"badge_number": "TN-TP-4402", "precinct": "Central Traffic Division", "patrol_zone": "Zone 4 Arterial Corridor"})),
            ("citizen1", "citizen123", "Citizen Responder Priya Raman", "citizen", None, None, "priya.raman@citizen.net", "+91-98402-55555", json.dumps({"blood_group": "O+", "emergency_contact_name": "Raman K (Father)", "emergency_contact_phone": "+91-98402-55556", "address": "Anna Nagar West, Chennai"})),
        ]
        users += [(f"driver{k+1}", "driver123", a.driver_name, "driver", a.id, None, f"paramedic.{k+1}@resqroute.org", a.phone, json.dumps({"crew_level": a.crew_level, "license_number": f"TN-01-DL-2022-00{k+1}", "base_station": a.note or "Central Station"})) for k, a in enumerate(ambs)]
        users += [(f"hospital{k+1}", "hospital123", f"{x.name} Trauma Unit", "hospital", None, x.id, f"er.{k+1}@hospital.org", x.phone, json.dumps({"department": "Emergency Trauma Care & ICU", "hotline_extension": f"Ext {100+k+1}"})) for k, x in enumerate(hosps)]
        for u, p, n, r, aid, hid, em, ph, det in users:
            db.add(User(username=u, password_hash=h(p), name=n, role=r, ambulance_id=aid, hospital_id=hid, email=em, phone=ph, details=det))
        db.add(AuditLog(actor="system", action="initialise", entity="system", detail="Operational network initialized with 3 trauma hospitals, 5 fleet ambulances, and 4 AI surveillance cameras"))
        db.commit()


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
    print("Database ready.")


