import cv2, numpy as np
from conftest import login


def new_incident(c, h, cam=2):
    r = c.post("/api/incidents", json={"camera_id": cam, "confidence": 0.7, "source": "test_trigger"}, headers=h)
    assert r.status_code == 200, r.text
    return r.json()


def jpeg(val=128):
    ok, b = cv2.imencode(".jpg", np.full((60, 80, 3), val, np.uint8))
    return b.tobytes()


def test_auth(client):
    assert client.post("/api/auth/login", json={"username": "admin", "password": "bad"}).status_code == 401
    assert client.get("/api/bootstrap").status_code == 401
    h = login(client, "driver1", "driver123")
    assert client.get("/api/auth/me", headers=h).json()["role"] == "driver"


def test_seed_data(client, admin):
    d = client.get("/api/bootstrap", headers=admin).json()
    assert len(d["ambulances"]) == 5 and len(d["hospitals"]) == 3 and len(d["cameras"]) >= 3
    assert {a["status"] for a in d["ambulances"]} >= {"available", "busy", "offline"}
    # Clean initial state: zero accidents until detected by camera
    assert len(d["incidents"]) == 0


def test_route_is_simulated(client):
    r = client.get("/api/route", params={"from_lat": 13.07, "from_lng": 80.26, "to_lat": 13.1, "to_lng": 80.24}).json()
    assert r["simulated"] and len(r["coords"]) > 3 and r["eta_min"] > 0 and r["distance_km"] > 0


def test_evidence_upload_and_reject(client, admin):
    inc = new_incident(client, admin)
    assert inc["status"] in ("suspected", "dispatching")
    for _ in range(3):
        assert client.post(f"/api/incidents/{inc['id']}/evidence", files={"file": ("a.jpg", jpeg(), "image/jpeg")}, headers=admin).status_code == 200
    got = client.get(f"/api/incidents/{inc['id']}", headers=admin).json()
    assert len(got["evidence"]) == 3
    r = client.post(f"/api/incidents/{inc['id']}/verify", json={"action": "reject"}, headers=admin).json()
    assert r["status"] == "rejected"
    assert client.post(f"/api/incidents/{inc['id']}/verify", json={"action": "confirm"}, headers=admin).status_code == 409


def test_detection_heuristic(client, admin):
    for v in (100, 101, 100, 102, 101):
        r = client.post("/api/detection/frame", data={"camera_id": 1}, files={"file": ("f.jpg", jpeg(v), "image/jpeg")}, headers=admin).json()
        assert not r["triggered"]
    rng = np.random.default_rng(1)
    ok, b = cv2.imencode(".jpg", rng.integers(0, 255, (120, 160, 3), dtype=np.uint8))
    r = client.post("/api/detection/frame", data={"camera_id": 1}, files={"file": ("f.jpg", b.tobytes(), "image/jpeg")}, headers=admin).json()
    assert "model_active" in r and ("resqroute_accident_model.pt" in r["method"] or "Optical Motion" in r["method"] or r.get("triggered", False))


def test_full_workflow(client, admin, d1, hosp1):
    inc = new_incident(client, admin)
    inc = client.post(f"/api/incidents/{inc['id']}/verify", json={"action": "confirm"}, headers=admin).json()
    assert inc["status"] == "dispatching"
    a = inc["assignments"][0]
    assert a["status"] == "offered" and "ranked #1" in a["explanation"] and "Not eligible" in a["explanation"]
    ranking = a["ranking"]
    assert [r["eta_min"] for r in ranking] == sorted(r["eta_min"] for r in ranking)  # ranked by ETA, not random
    # only the chosen driver may respond
    other = login(client, "driver2" if a["ambulance_code"] != "AMB-02" else "driver5", "driver123")
    assert client.post(f"/api/assignments/{a['id']}/respond", json={"accept": True}, headers=other).status_code == 403
    chosen = login(client, f"driver{a['ambulance_id']}", "driver123")
    inc = client.post(f"/api/assignments/{a['id']}/respond", json={"accept": True}, headers=chosen).json()
    assert inc["status"] == "en_route"
    # cannot arrive before simulated travel is complete
    assert client.post(f"/api/assignments/{a['id']}/arrive-scene", headers=chosen).status_code == 409
    # hospital must not be recommended before assessment
    assert client.get(f"/api/incidents/{inc['id']}/hospital-recommendations", headers=admin).status_code == 409
    assert client.post(f"/api/assignments/{a['id']}/simulate/skip", headers=chosen).status_code == 200
    assert client.post(f"/api/assignments/{a['id']}/arrive-scene", headers=chosen).json()["status"] == "on_scene"
    inc = client.post(f"/api/assignments/{a['id']}/assessment", json={"severity": "critical", "patients": 1, "needs": ["icu"]}, headers=chosen).json()
    assert inc["status"] == "assessed" and inc["recommended_hospital_id"]
    recs = client.get(f"/api/incidents/{inc['id']}/hospital-recommendations", headers=admin).json()
    top = recs["candidates"][0]
    assert top["eligible"] and top["hospital"]["icu_beds"] >= 1 and "explanation" in top
    # Riverside has no ICU -> excluded
    riverside = next(c for c in recs["candidates"] if c["hospital"]["id"] == 2)
    assert not riverside["eligible"] and "no ICU bed" in riverside["excluded_reasons"]
    beds_before = top["hospital"]["available_beds"]
    inc = client.post(f"/api/assignments/{a['id']}/start-hospital-route", headers=chosen).json()
    assert inc["status"] == "transporting"
    client.post(f"/api/assignments/{a['id']}/simulate/skip", headers=chosen)
    assert client.post(f"/api/assignments/{a['id']}/arrive-hospital", headers=chosen).json()["status"] == "at_hospital"
    inc = client.post(f"/api/assignments/{a['id']}/complete", headers=chosen).json()
    assert inc["status"] == "completed"
    boot = client.get("/api/bootstrap", headers=admin).json()
    assert next(x for x in boot["ambulances"] if x["id"] == a["ambulance_id"])["status"] == "available"
    assert next(x for x in boot["hospitals"] if x["id"] == top["hospital"]["id"])["available_beds"] == beds_before - 1
    hist = client.get("/api/history", headers=admin).json()
    assert any(x["action"] == "handover_completed" for x in hist["audit"])


def test_decline_goes_to_next_and_no_double_assignment(client, admin):
    inc = new_incident(client, admin)
    inc = client.post(f"/api/incidents/{inc['id']}/verify", json={"action": "escalate"}, headers=admin).json()
    assert inc["priority"] == "critical"
    seen = []
    for _ in range(3):
        a = [x for x in inc["assignments"] if x["status"] == "offered"][0]
        seen.append(a["ambulance_code"])
        h = login(client, f"driver{a['ambulance_id']}", "driver123")
        inc = client.post(f"/api/assignments/{a['id']}/respond", json={"accept": False}, headers=h).json()
        if inc["status"] == "no_ambulance":
            break
    assert len(set(seen)) == len(seen)  # never re-offered to a decliner
    assert inc["status"] == "no_ambulance"  # only 3 available ambulances in seed data
    # a second incident while ambulances are free again: retry works after status change
    client.patch("/api/ambulances/3", json={"status": "available"}, headers=admin)
    inc = client.post(f"/api/incidents/{inc['id']}/dispatch", headers=admin).json()
    assert inc["status"] == "dispatching" and [x for x in inc["assignments"] if x["status"] == "offered"][0]["ambulance_code"] == "AMB-03"


def test_one_active_assignment_per_ambulance(client, admin):
    i1 = client.post(f"/api/incidents/{new_incident(client, admin)['id']}/verify", json={"action": "confirm"}, headers=admin).json()
    i2 = client.post(f"/api/incidents/{new_incident(client, admin, 3)['id']}/verify", json={"action": "confirm"}, headers=admin).json()
    a1 = i1["assignments"][0]["ambulance_id"]; a2 = i2["assignments"][0]["ambulance_id"]
    assert a1 != a2


def test_hospital_capacity_updates_and_permissions(client, admin, hosp1):
    r = client.patch("/api/hospitals/1", json={"available_beds": 0, "receiving": False}, headers=hosp1)
    assert r.status_code == 200 and r.json()["receiving"] is False
    assert client.patch("/api/hospitals/2", json={"receiving": False}, headers=hosp1).status_code == 403
    assert client.patch("/api/hospitals/1", json={"available_beds": 9999}, headers=hosp1).status_code == 422
    drv = login(client, "driver1", "driver123")
    assert client.patch("/api/hospitals/1", json={"receiving": True}, headers=drv).status_code == 403


def test_no_suitable_hospital_warning(client, admin):
    for hid in (1, 2, 3):
        client.patch(f"/api/hospitals/{hid}", json={"receiving": False}, headers=admin)
    inc = client.post(f"/api/incidents/{new_incident(client, admin)['id']}/verify", json={"action": "confirm"}, headers=admin).json()
    a = inc["assignments"][0]
    h = login(client, f"driver{a['ambulance_id']}", "driver123")
    client.post(f"/api/assignments/{a['id']}/respond", json={"accept": True}, headers=h)
    client.post(f"/api/assignments/{a['id']}/simulate/skip", headers=h)
    client.post(f"/api/assignments/{a['id']}/arrive-scene", headers=h)
    inc = client.post(f"/api/assignments/{a['id']}/assessment", json={"severity": "minor", "patients": 1, "needs": []}, headers=h).json()
    assert inc["hospital_warning"] and inc["recommended_hospital_id"] is None
    assert client.post(f"/api/assignments/{a['id']}/start-hospital-route", headers=h).status_code == 409
