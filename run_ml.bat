@echo off
cd /d %~dp0\ml
python -m uvicorn src.api:app --host 127.0.0.1 --port 5000
