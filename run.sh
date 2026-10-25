#!/usr/bin/env bash
# macOS / Linux launcher (Windows users: use run.bat)
set -e
cd "$(dirname "$0")"
[ -d backend/.venv ] || { python3 -m venv backend/.venv; backend/.venv/bin/pip install -r backend/requirements.txt; }
[ -d frontend/node_modules ] || (cd frontend && npm install)
(cd backend && .venv/bin/python -m app.seed)
(cd backend && .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload) &
BP=$!; trap "kill $BP" EXIT
cd frontend && npm run dev -- --host 127.0.0.1
