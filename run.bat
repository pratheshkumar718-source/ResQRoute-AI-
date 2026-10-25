@echo off
setlocal
title ResQRoute AI launcher
cd /d "%~dp0"

echo ============================================================
echo  ResQRoute AI - local prototype launcher
echo ============================================================

if exist "C:\Prathesh\nodejs" set "PATH=%PATH%;C:\Prathesh\nodejs"
where python >nul 2>nul || (echo [ERROR] Python 3.10+ not found. Install from python.org and tick "Add to PATH". & pause & exit /b 1)
where npm >nul 2>nul || (echo [ERROR] Node.js 18+ not found. Install from nodejs.org. & pause & exit /b 1)

if not exist backend\.venv (
  echo [setup] Creating Python virtual environment...
  python -m venv --system-site-packages backend\.venv || (pause & exit /b 1)
  echo [setup] Installing backend dependencies...
  backend\.venv\Scripts\python -m pip install --upgrade pip >nul
  backend\.venv\Scripts\pip install -r backend\requirements.txt || (pause & exit /b 1)
)
if not exist frontend\node_modules (
  echo [setup] Installing frontend dependencies...
  pushd frontend & call npm install & popd
)

echo [start] Initialising database...
pushd backend & .venv\Scripts\python -m app.seed & popd

echo [start] Launching backend  (http://127.0.0.1:8000) in a new window...
start "ResQRoute Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
echo [start] Launching frontend (http://localhost:5173) in a new window...
start "ResQRoute Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 127.0.0.1"

timeout /t 6 >nul
start http://localhost:5173

echo.
echo  ResQRoute AI is starting. Homepage will open at http://localhost:5173
echo  Authorized stakeholder logins:
echo    Admin / Dispatch:      admin / admin123
echo    Police Division:       police1 / police123
echo    Ambulance Drivers:     driver1..driver5 / driver123
echo    Hospital Staff:        hospital1..hospital3 / hospital123
echo    Citizens / Public:     citizen1 / citizen123
echo.
echo  TO STOP: close the "ResQRoute Backend" and "ResQRoute Frontend" windows (or press Ctrl+C in each).
echo.
pause

