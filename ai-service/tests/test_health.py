from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_service_metadata():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "oraldiagnostic-ai-service"
    assert payload["model_name"] == "oral-lesion-triage-cnn"
