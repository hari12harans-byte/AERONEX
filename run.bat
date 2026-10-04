@echo off
title AeroNex - AI Flight Connection Guardian
echo ========================================================
echo        AeroNex - AI Flight Connection Guardian
echo ========================================================
cd /d "%~dp0"

set "PYTHON_EXE=.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    set "PYTHON_EXE=python"
)

echo [1/2] Checking port 8000...
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [OK] AeroNex server is already running on http://127.0.0.1:8000
) else (
    echo [1/2] Starting AeroNex Unified Server (FastAPI + ML + React Frontend)...
    start "AeroNex - Unified Server" cmd /k "cd /d "%~dp0" && "%PYTHON_EXE%" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
)

echo [2/2] Opening AeroNex in your browser...
start http://127.0.0.1:8000

echo.
echo ========================================================
echo  AeroNex is up and running!
echo  - Web Application: http://127.0.0.1:8000
echo  - API Docs:        http://127.0.0.1:8000/docs
echo  - Health Check:    http://127.0.0.1:8000/api/health
echo ========================================================
timeout /t 5 >nul
