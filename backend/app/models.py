from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from .db import Base


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String)
    role = Column(String, nullable=False)  # admin | driver | hospital | police | citizen
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    details = Column(Text, nullable=True)  # JSON-encoded role-specific details



class Camera(Base):
    __tablename__ = "cameras"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    location_name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String, default="online")


class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)
    camera_id = Column(Integer, ForeignKey("cameras.id"))
    lat = Column(Float)
    lng = Column(Float)
    location_name = Column(String)
    status = Column(String, default="suspected")
    priority = Column(String, default="normal")  # normal | critical
    source = Column(String, default="heuristic")  # heuristic | test_trigger | manual | seed
    confidence = Column(Float, nullable=True)  # detection confidence (NOT verification status)
    notes = Column(Text, default="")
    verified_by = Column(String, nullable=True)
    required_ambulances = Column(Integer, default=1)
    police_notified = Column(Boolean, default=False)
    green_corridor = Column(Boolean, default=False)
    verification_answers = Column(Text, nullable=True)
    assessment = Column(Text, nullable=True)  # JSON
    recommended_hospital_id = Column(Integer, nullable=True)
    selected_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    hospital_warning = Column(String, nullable=True)
    is_demo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=now)
    completed_at = Column(DateTime, nullable=True)
    camera = relationship("Camera")
    selected_hospital = relationship("Hospital", foreign_keys=[selected_hospital_id])
    evidence = relationship("Evidence", order_by="Evidence.id", cascade="all, delete-orphan")
    assignments = relationship("Assignment", order_by="Assignment.id", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    filename = Column(String)
    seq = Column(Integer, default=1)
    captured_at = Column(DateTime, default=now)


class Ambulance(Base):
    __tablename__ = "ambulances"
    id = Column(Integer, primary_key=True)
    code = Column(String, unique=True)
    driver_name = Column(String)
    phone = Column(String)  # fictional
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String, default="available")  # available | busy | offline | maintenance
    crew_level = Column(String, default="ALS")
    note = Column(String, default="")


class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"))
    # offered | en_route | on_scene | transporting | at_hospital | completed | declined | cancelled
    status = Column(String, default="offered")
    explanation = Column(Text, default="")
    ranking = Column(Text, default="[]")  # JSON list of candidates
    scene_route = Column(Text, nullable=True)  # JSON {coords, distance_km, eta_min}
    hospital_route = Column(Text, nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    leg = Column(String, nullable=True)  # scene | hospital
    leg_complete = Column(Boolean, default=False)
    remaining_eta = Column(Float, nullable=True)
    offered_at = Column(DateTime, default=now)
    responded_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    ambulance = relationship("Ambulance")
    hospital = relationship("Hospital", foreign_keys=[hospital_id])


class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    phone = Column(String)  # fictional
    total_beds = Column(Integer, default=50)
    available_beds = Column(Integer, default=10)
    icu_beds = Column(Integer, default=2)
    capabilities = Column(String, default="")  # comma-separated: trauma,icu,neuro,pediatric,burns
    receiving = Column(Boolean, default=True)
    status = Column(String, default="verified")  # verified | pending_verification | rejected
    last_admission_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=now)


class TrackingEvent(Base):
    __tablename__ = "tracking_events"
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"))
    assignment_id = Column(Integer, nullable=True)
    event = Column(String)
    message = Column(String)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    eta_min = Column(Float, nullable=True)
    ts = Column(DateTime, default=now)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    ts = Column(DateTime, default=now)
    actor = Column(String)
    action = Column(String)
    entity = Column(String)
    entity_id = Column(Integer, nullable=True)
    detail = Column(Text, default="")
