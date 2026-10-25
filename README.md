# ResQRoute AI — AI-Powered Accident Detection, Smart Ambulance Dispatch & Hospital Navigation

A complete, **locally runnable** hackathon prototype. No API keys, no paid services, no cloud, no Docker.

> **Prototype honesty notice** — Ambulance GPS, routes, distances, ETAs, hospitals, bed counts and phone numbers are
> **simulated / fictional**. Routes are computed on a locally generated demo road network (not real roads/traffic).
> Accident detection is an **experimental motion-spike heuristic**, not a trained accident-event model; ordinary object
> detection (e.g. YOLO) alone cannot reliably identify accidents. Every suspected incident needs dispatcher verification.

**Stack:** React + TypeScript + Vite + Tailwind + Lucide + Leaflet/React-Leaflet (OpenStreetMap, offline SVG fallback) ·
FastAPI + SQLite + SQLAlchemy + Pydantic + OpenCV · localhost WebSocket.

> Note: this project was generated from scratch following the spec because no Phase 1 project files were attached.
> The page names/roles/colour scheme follow the spec; port into your Phase 1 code by copying `frontend/src/pages` and
> `components` or the `backend` folder.

## Quick start (Windows)
Prerequisites: **Python 3.10+** (tick "Add to PATH") and **Node.js 18+**.

1. Unzip the project, double-click **`run.bat`**.
2. It creates a venv, installs dependencies, seeds the database, opens two windows (backend `:8000`, frontend `:5173`)
   and your browser at <http://localhost:5173>.
3. **To stop:** close the *ResQRoute Backend* and *ResQRoute Frontend* windows (or Ctrl+C in each).

macOS/Linux: `./run.sh`.

### Manual start
```
cd backend
python -m venv .venv && .venv\Scripts\activate        # (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
python -m app.seed
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

cd frontend
npm install
npm run dev
```

## Demo logins
| Role | Username | Password |
|---|---|---|
| Admin / Dispatcher | `admin` | `admin123` |
| Ambulance Driver (AMB-01…05) | `driver1`…`driver5` | `driver123` |
| Hospital staff (hospital 1…3) | `hospital1`…`hospital3` | `hospital123` |

## 3-minute jury demo script
1. Sign in as **admin** → *Camera Monitoring* → **Test Detection** (or start webcam / pick a video file and *Start Monitoring*).
   A *suspected* incident appears immediately; 4 screenshots upload ~6 s apart.
2. *Incidents & Evidence* → review evidence → **Confirm & dispatch** (or Reject / Escalate). The page explains why an
   ambulance was chosen (ranked by simulated route ETA; busy/offline units listed as not eligible).
3. Open a second browser window as **driver1** (the offered unit may differ — see the explanation; use `driverN` for AMB-0N).
   Accept (or Decline → the offer moves to the next ambulance). Watch the ambulance animate along the simulated route on
   the *Live Map* with live ETA. Use *Demo: skip travel* to speed up.
4. Driver: **Mark arrival at scene** → submit **crew assessment** → recommended hospital appears (only now) → **Start hospital route**
   → **Mark arrival** → **Complete simulated handover**.
5. Dispatcher can change the destination hospital; log in as **hospital1** to toggle receiving / bed counts and see recommendations change.
6. *Response Tracking* and *Incident History* show the timeline and audit log.

## Features
- 10 pages: Overview, Camera Monitoring, Incidents & Evidence, Live Map, Ambulances, Driver Dashboard, Hospitals, Response Tracking, History, Settings; role-based nav.
- **Map renders automatically** (no key). OSM tiles online; automatic switch to an offline SVG map (roads, hospitals, incidents, ambulances, routes) when tiles fail (4 s probe) or via Settings. Zoom, pan, fit-to-incident, fit-all.
- **Local routing**: Dijkstra over a generated street grid (some blocked streets, faster arterials) → simulated route, distance and ETA, clearly labelled.
- **Dispatch**: eligibility (available, no active assignment, not already declined) → rank by ETA → offer → accept/decline → next candidate → "no ambulance" alert + retry; one active assignment per ambulance.
- **Hospital recommendation** only after crew assessment: filters not-receiving / insufficient beds / missing capabilities / no ICU, ranks by simulated ETA, explains, dispatcher can select another (override only if none eligible).
- **Realtime**: WebSocket for incidents, evidence, assignments, positions, ETA, hospital capacity, completion; auto-reconnect, toasts, loading/empty/error states.
- Evidence saved to `backend/data/evidence`, metadata in SQLite (`backend/data/resqroute.db`).

## Tests
```
cd backend
python -m pytest -q
```
Covers auth, seed data, simulated routes, evidence upload, reject/confirm/escalate, ranking by ETA, ownership checks, decline→next ambulance,
no-ambulance & retry, one-assignment-per-ambulance, hospital-after-assessment rule, hospital filtering, capacity permissions,
no-suitable-hospital warning, full lifecycle to completion, and the detection heuristic.

## Project layout
```
backend/app   main.py (API+WS) core.py (dispatch, ranking, simulation) routing.py (local road network)
              detection.py (OpenCV heuristic) models.py seed.py db.py     backend/tests
frontend/src  App.tsx  lib/{api,store}  components/{MapView,ui}  pages/*
run.bat  run.sh  .env.example
```

## Troubleshooting
| Problem | Fix |
|---|---|
| "Cannot reach the local backend" banner | Backend window closed/crashed. Re-run `run.bat`; check port 8000 is free. |
| Webcam preview blank / permission error | Allow camera in the browser; use `http://localhost:5173` (not a LAN IP). Close other apps using the camera. Or use *Demo video file* / *Test Detection*. |
| Map shows "Offline SVG demo map" | No internet or OSM blocked — expected fallback. Click *Try OSM* when online. |
| Heuristic never triggers | It needs a sudden motion spike after a calm period. Use **Test Detection**. |
| `pip install` fails for OpenCV | Upgrade pip, use Python 3.10–3.12 (64-bit). |
| Want a clean slate | Settings → *Reset demo data* (admin), or delete `backend/data`. |
| Ambulance never moves | Backend must run with `RESQ_AUTOSIM` unset/1; check the WebSocket indicator (bottom of sidebar). |

## Known limitations
- Detection is a heuristic, not a trained model (`detection.py::Detector.analyse` is the extension point).
- Routes/ETAs are simulated on a generated grid; demo speeds are accelerated (a leg takes ~12–40 s).
- Auth is a demo-grade token store (in memory); do not expose beyond localhost.
- Video-file/webcam frames are analysed in the browser→backend each second; the backend also exposes `/api/camera/backend-snapshot` (OpenCV webcam capture).
- Offers don't auto-expire; the dispatcher can "reassign" an unresponsive driver.
