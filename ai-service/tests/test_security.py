from fastapi.testclient import TestClient

from app.main import app


def test_inference_requires_token(monkeypatch):
    monkeypatch.setenv("AI_AUTH_TOKEN", "secret")
    client = TestClient(app)

    response = client.post(
        "/v1/inference/oral-lesion",
        json={
            "case_code": "OD-TEST",
            "image_id": "00000000-0000-0000-0000-000000000001",
            "image_url": "https://example.com/image.png",
            "model": {
                "name": "oral-lesion-triage-cnn",
                "version": "1.0.0",
                "architecture": "mobilenetv3-small",
            },
        },
    )

    assert response.status_code == 401
