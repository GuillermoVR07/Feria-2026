@echo off
REM Start development server for ai-service (Windows cmd)
python -m venv .venv
call .venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

REM Set development token and run
set AI_AUTH_TOKEN=change-me-server-only
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
