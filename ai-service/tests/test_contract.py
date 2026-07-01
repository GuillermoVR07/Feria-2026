import base64
import io

from fastapi.testclient import TestClient
from PIL import Image

from app import main
from app.main import app


def _png_bytes() -> bytes:
    image = Image.new("RGB", (32, 32), color=(180, 60, 60))
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def test_inference_contract_with_fallback(monkeypatch):
    main._loaded_model = None
    monkeypatch.setenv("AI_AUTH_TOKEN", "secret")
    monkeypatch.setenv("AI_ALLOW_CONTRACT_FALLBACK", "true")
    monkeypatch.setenv("AI_ENABLE_GRADCAM", "false")

    def fake_download(_image_url, _settings):
        return _png_bytes()

    monkeypatch.setattr(main, "download_image_bytes", fake_download)

    client = TestClient(app)
    response = client.post(
        "/v1/inference/oral-lesion",
        headers={"Authorization": "Bearer secret"},
        json={
            "case_code": "OD-TEST",
            "image_id": "00000000-0000-0000-0000-000000000001",
            "image_url": "https://example.com/signed-image.png",
            "model": {
                "name": "oral-lesion-triage-cnn",
                "version": "1.0.0",
                "architecture": "mobilenetv3-small",
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["suspicion_level"] in {"low", "moderate", "high"}
    assert set(payload["class_probabilities"]) == {"low", "moderate", "high"}
    assert payload["model_name"] == "oral-lesion-triage-cnn"
    assert payload["gradcam_base64"] is None
