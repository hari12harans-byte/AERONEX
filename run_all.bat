@echo off
title AeroNex System Launcher
echo ========================================================
echo               AeroNex System Launcher
echo ========================================================
cd /d "%~dp0"

echo Checking if AeroNex server is already running on port 8000...
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo [OK] AeroNex server is already running on http://localhost:8000
) else (
    echo [1/2] Launching AeroNex Unified Server (API + ML + Frontend)...
    start "AeroNex - Unified Server" cmd /k "cd /d "%~dp0" && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
    timeout /t 3 /nobreak >nul
)

echo [2/2] Opening AeroNex Web App in default browser...
start http://localhost:8000

echo.
echo ========================================================
echo  AeroNex is running successfully!
echo  - Web Application: http://localhost:8000
echo  - API Docs:        http://localhost:8000/docs
echo  - Health Check:    http://localhost:8000/api/health
echo ========================================================
pause
