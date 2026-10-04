@echo off
title AeroNex - Developer Mode (FastAPI + Vite HMR)
echo ========================================================
echo        AeroNex - Full-Stack Developer Mode
echo ========================================================
cd /d "%~dp0"

set "PYTHON_EXE=.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

echo [1/3] Starting Backend API on http://127.0.0.1:8000 ...
start "AeroNex - Backend" cmd /k "cd /d "%~dp0" && "%PYTHON_EXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
timeout /t 2 /nobreak >nul

echo [2/3] Starting Frontend Dev Server on http://localhost:5173 ...
start "AeroNex - Frontend Dev" cmd /k "cd /d "%~dp0frontend" && npm.cmd run dev"
timeout /t 2 /nobreak >nul

echo [3/3] Opening Frontend Dev Server in browser...
start http://localhost:5173

echo.
echo ========================================================
echo  Developer servers launched:
echo  - Frontend (HMR): http://localhost:5173
echo  - Backend API:    http://127.0.0.1:8000
echo  - API Docs:       http://127.0.0.1:8000/docs
echo ========================================================
pause
