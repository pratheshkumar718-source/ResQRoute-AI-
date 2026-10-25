import pytest
from conftest import login


def test_automatic_ambulance_allocation(client, admin):
    # Creating an incident automatically dispatches the nearest ambulance
    r = client.post("/api/incidents", json={"camera_id": 1, "confidence": 0.85, "source": "heuristic"}, headers=admin)
    assert r.status_code == 200, r.text
    inc = r.json()
    assert inc["status"] in ("dispatching", "suspected")
    assert len(inc["assignments"]) >= 1
    assert inc["assignments"][0]["status"] == "offered"
    assert inc["assignments"][0]["ambulance_id"] is not None


def test_driver_verify_and_respond_cascade(client, admin):
    # Create incident
    r = client.post("/api/incidents", json={"camera_id": 1, "confidence": 0.9, "source": "heuristic"}, headers=admin)
    inc = r.json()
    a = inc["assignments"][0]
    drv = login(client, f"driver{a['ambulance_id']}", "driver123")

    # Driver verifies collision from 6 screenshots and requests 2 ambulances
    v_resp = client.post(
        f"/api/assignments/{a['id']}/verify-and-respond",
        json={"verified": True, "ambulances_needed": 2, "notes": "Two-vehicle collision with 2 casualties"},
        headers=drv
    )
    assert v_resp.status_code == 200, v_resp.text
    inc_after = v_resp.json()
    assert inc_after["status"] == "en_route"
    assert inc_after["required_ambulances"] == 2
    assert inc_after["green_corridor"] is True
    assert inc_after["police_notified"] is True

    # Cascade automatically dispatched next nearest ambulance
    assert len(inc_after["assignments"]) >= 2


def test_police_corridor_toggle(client, admin):
    r = client.post("/api/incidents", json={"camera_id": 1, "confidence": 0.75, "source": "heuristic"}, headers=admin)
    inc = r.json()
    pol = login(client, "police1", "police123")

    # Police activates green corridor
    p_resp = client.post(f"/api/incidents/{inc['id']}/police-corridor", headers=pol)
    assert p_resp.status_code == 200
    assert p_resp.json()["green_corridor"] is True

    # Police deactivates green corridor
    p_resp2 = client.post(f"/api/incidents/{inc['id']}/police-corridor", headers=pol)
    assert p_resp2.status_code == 200
    assert p_resp2.json()["green_corridor"] is False


def test_hospital_bed_decrement_on_arrival(client, admin):
    # Boot data
    boot = client.get("/api/bootstrap", headers=admin).json()
    hosp = boot["hospitals"][0]
    initial_beds = hosp["available_beds"]

    # Create incident & dispatch
    r = client.post("/api/incidents", json={"camera_id": 1, "confidence": 0.8}, headers=admin)
    inc = r.json()
    a = inc["assignments"][0]
    drv = login(client, f"driver{a['ambulance_id']}", "driver123")

    client.post(
        f"/api/assignments/{a['id']}/verify-and-respond",
        json={"verified": True, "ambulances_needed": 1},
        headers=drv
    )
    # Skip travel & arrive scene
    client.post(f"/api/assignments/{a['id']}/simulate/skip", headers=drv)
    client.post(f"/api/assignments/{a['id']}/arrive-scene", headers=drv)
    client.post(f"/api/assignments/{a['id']}/assessment", json={"severity": "moderate", "patients": 1, "needs": []}, headers=drv)
    client.post(f"/api/assignments/{a['id']}/start-hospital-route", headers=drv)
    client.post(f"/api/assignments/{a['id']}/simulate/skip", headers=drv)

    # Arrive at hospital emergency bay
    arr_resp = client.post(f"/api/assignments/{a['id']}/arrive-hospital", headers=drv)
    assert arr_resp.status_code == 200

    # Verify hospital bed count decremented
    updated_inc = arr_resp.json()
    hosp_id = updated_inc["selected_hospital_id"]
    boot_after = client.get("/api/bootstrap", headers=admin).json()
    hosp_after = next(h for h in boot_after["hospitals"] if h["id"] == hosp_id)
    assert hosp_after["available_beds"] < initial_beds


def test_hospital_registration_and_admin_approval(client, admin):
    form = {
        "name": "St. Jude Emergency Center",
        "phone": "+91-44-2899-9999",
        "lat": 13.065,
        "lng": 80.255,
        "total_beds": 50,
        "available_beds": 15,
        "icu_beds": 3,
        "capabilities": ["trauma", "icu"],
        "username": "stjude_admin",
        "password": "password123"
    }
    reg = client.post("/api/hospitals/register", json=form)
    assert reg.status_code == 200, reg.text
    hid = reg.json()["hospital"]["id"]
    assert reg.json()["hospital"]["status"] == "pending_verification"

    # Admin verifies hospital
    ver = client.post(f"/api/hospitals/{hid}/verify", headers=admin)
    assert ver.status_code == 200
    assert ver.json()["status"] == "verified"


def test_accident_detection_crossing_80_percent_assigns_nearest_ambulance_and_hospital(client, admin):
    # 1. Verify PyTorch deep learning model is active
    status_resp = client.get("/api/detection/model-status", headers=admin)
    assert status_resp.status_code == 200
    m_info = status_resp.json()
    assert m_info["model_active"] is True
    assert "resqroute_accident_model.pt" in m_info["model_name"]

    # 2. Simulate accident detection crossing 80% level (92% confidence)
    sim_resp = client.post(
        "/api/detection/simulate",
        json={"camera_id": 1, "confidence": 0.92, "threshold": 0.80},
        headers=admin
    )
    assert sim_resp.status_code == 200, sim_resp.text
    inc = sim_resp.json()

    # 3. Check incident was created with >= 80% confidence and 6 burst screenshots
    assert inc["confidence"] >= 0.80
    assert inc["status"] in ("dispatching", "en_route")
    assert len(inc["evidence"]) == 6
    assert all(e["url"].startswith("/evidence/") for e in inc["evidence"])

    # 4. Check NEAREST AMBULANCE was allocated
    assert len(inc["assignments"]) >= 1
    asg = inc["assignments"][0]
    assert asg["status"] == "offered"
    assert asg["ambulance_code"] == "AMB-01"  # AMB-01 is nearest to CAM-01 (Central Junction)
    assert "ranked #1" in asg["explanation"]
    assert asg["scene_route"] is not None
    assert asg["remaining_eta"] > 0

    # 5. Check NEAREST HOSPITAL was allocated based on SEAT AVAILABILITY
    assert inc["selected_hospital_id"] is not None
    assert inc["selected_hospital_beds"] > 0
    assert inc["selected_hospital_name"] is not None
    assert asg["hospital_id"] == inc["selected_hospital_id"]
    assert asg["hospital_route"] is not None
    assert asg["hospital_name"] == inc["selected_hospital_name"]
    assert asg["hospital_available_beds"] > 0

    # 6. Check ambulance driver can view the offer with evidence screenshots and accept/verify
    d1 = login(client, "driver1", "driver123")
    me_resp = client.get("/api/incidents", headers=d1)
    assert me_resp.status_code == 200
    my_inc = next(i for i in me_resp.json() if i["id"] == inc["id"])
    assert len(my_inc["evidence"]) == 6
    assert my_inc["selected_hospital_name"] is not None
