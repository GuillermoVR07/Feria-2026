# Start development server for ai-service (PowerShell)
# Creates a virtual environment, installs requirements and runs uvicorn.

python -m venv .venv
. .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Set development token and run
$env:AI_AUTH_TOKEN = 'change-me-server-only'
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
