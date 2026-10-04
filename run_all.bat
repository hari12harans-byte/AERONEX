@echo off
title AeroNex System Launcher
echo ========================================================
echo               AeroNex System Launcher
echo ========================================================
cd /d "%~dp0"

echo [1/3] Launching ML Service on http://127.0.0.1:5000 ...
start "AeroNex - ML Service" cmd /k "cd /d "%~dp0ml" && python -m uvicorn src.api:app --host 127.0.0.1 --port 5000"
timeout /t 2 /nobreak >nul

echo [2/3] Launching Backend API on http://localhost:8000 ...
start "AeroNex - Backend" cmd /k "cd /d "%~dp0backend" && npm start"
timeout /t 2 /nobreak >nul

echo [3/3] Launching Frontend on http://localhost:5173 ...
start "AeroNex - Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo All AeroNex services are starting!
echo - Frontend: http://localhost:5173
echo - Backend:  http://localhost:8000
echo - ML API:   http://127.0.0.1:5000
echo ========================================================
pause
