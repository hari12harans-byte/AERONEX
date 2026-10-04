@echo off
title AeroNex Backend & System
echo ========================================================
echo               AeroNex Unified Server
echo ========================================================
cd /d "%~dp0"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
