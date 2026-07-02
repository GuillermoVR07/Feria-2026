from __future__ import annotations

import time
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from .config import Settings, get_settings
from .gradcam import GradcamUnavailable, generate_gradcam
from .inference import run_prediction
from .model_loader import LoadedModel, ModelLoadError, load_model
from .preprocessing import ImageDecodeError, ImageDownloadError, decode_image, download_image_bytes, image_to_model_array
from .schemas import GradcamResponse, OralLesionInferenceRequest, OralLesionInferenceResponse
from .security import require_bearer_token

app = FastAPI(title="OralDiagnostic AI Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Desarrollo local
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "null",
        # Vercel preview y producción (acepta cualquier subdominio *.vercel.app)
        "https://oraldiagnostic.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_loaded_model: LoadedModel | None = None


def get_loaded_model(settings: Settings) -> LoadedModel:
    global _loaded_model
    if _loaded_model is None:
        _loaded_model = load_model(settings)
    return _loaded_model


@app.get("/")
def root(settings: Settings = Depends(get_settings)) -> dict[str, object]:
    return {
        "service": "oraldiagnostic-ai-service",
        "status": "running",
        "health_url": "/health",
        "inference_url": "/v1/inference/oral-lesion",
        "model_name": settings.model_name,
        "model_version": settings.model_version,
    }


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, object]:
    return {
        "service": "oraldiagnostic-ai-service",
        "status": "ok",
        "model_name": settings.model_name,
        "model_version": settings.model_version,
        "architecture": settings.model_architecture,
        "environment": settings.environment,
    }


@app.post("/v1/inference/oral-lesion", response_model=OralLesionInferenceResponse)
def oral_lesion_inference(
    payload: OralLesionInferenceRequest,
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> OralLesionInferenceResponse:
    require_bearer_token(authorization=authorization, expected_token=settings.auth_token)
    started_at = time.perf_counter()
    service_request_id = str(uuid4())
    warnings: list[str] = []

    try:
        loaded_model = get_loaded_model(settings)
        image_bytes = download_image_bytes(str(payload.image_url), settings)
        original_image = decode_image(image_bytes)
        batch = image_to_model_array(original_image, settings)
        prediction = run_prediction(loaded_model, batch, settings)
        warnings.extend(prediction.warnings)

        gradcam_base64: str | None = None
        gradcam_mime_type: str | None = None
        gradcam: GradcamResponse | None = None

        try:
            gradcam_base64 = generate_gradcam(
                loaded_model=loaded_model,
                batch=batch,
                original=original_image,
                class_index=prediction.raw_class_index,
                settings=settings,
            )
            gradcam_mime_type = "image/png"
            gradcam = GradcamResponse(content_type=gradcam_mime_type, base64=gradcam_base64)
        except GradcamUnavailable as exc:
            if settings.require_gradcam:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Grad-CAM es obligatorio y no pudo generarse.",
                ) from exc
            warnings.append("GRADCAM_UNAVAILABLE")

        latency_ms = int((time.perf_counter() - started_at) * 1000)
        return OralLesionInferenceResponse(
            service_request_id=service_request_id,
            request_id=payload.request_id,
            model_name=payload.resolved_model_name(settings.model_name),
            model_version=payload.resolved_model_version(settings.model_version),
            architecture=payload.resolved_model_architecture(settings.model_architecture),
            input_shape=settings.input_shape,
            suspicion_level=prediction.suspicion_level,  # type: ignore[arg-type]
            probability=prediction.probability,
            class_probabilities=prediction.class_probabilities,
            gradcam_base64=gradcam_base64,
            gradcam_mime_type=gradcam_mime_type,
            gradcam=gradcam,
            latency_ms=latency_ms,
            warnings=warnings,
        )
    except ModelLoadError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ImageDownloadError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except ImageDecodeError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
