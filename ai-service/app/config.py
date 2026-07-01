from __future__ import annotations

import os
from dataclasses import dataclass


def _bool_env(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


@dataclass(frozen=True)
class Settings:
    auth_token: str
    model_path: str
    model_name: str
    model_version: str
    model_architecture: str
    input_height: int
    input_width: int
    input_channels: int
    environment: str
    require_clinical_checkpoint: bool
    enable_gradcam: bool
    download_timeout_seconds: int
    max_image_bytes: int
    allow_contract_fallback: bool

    @property
    def input_shape(self) -> list[int]:
        return [self.input_height, self.input_width, self.input_channels]


def get_settings() -> Settings:
    return Settings(
        auth_token=os.getenv("AI_AUTH_TOKEN", ""),
        model_path=os.getenv("AI_MODEL_PATH", "/app/models/oral-lesion-triage-cnn/1.0.0/model.keras"),
        model_name=os.getenv("AI_MODEL_NAME", "oral-lesion-triage-cnn"),
        model_version=os.getenv("AI_MODEL_VERSION", "1.0.0"),
        model_architecture=os.getenv("AI_MODEL_ARCHITECTURE", "mobilenetv3-small"),
        input_height=int(os.getenv("AI_INPUT_HEIGHT", "224")),
        input_width=int(os.getenv("AI_INPUT_WIDTH", "224")),
        input_channels=int(os.getenv("AI_INPUT_CHANNELS", "3")),
        environment=os.getenv("AI_ENVIRONMENT", "local"),
        require_clinical_checkpoint=_bool_env("AI_REQUIRE_CLINICAL_CHECKPOINT", False),
        enable_gradcam=_bool_env("AI_ENABLE_GRADCAM", True),
        download_timeout_seconds=int(os.getenv("AI_DOWNLOAD_TIMEOUT_SECONDS", "10")),
        max_image_bytes=int(os.getenv("AI_MAX_IMAGE_BYTES", "10485760")),
        allow_contract_fallback=_bool_env("AI_ALLOW_CONTRACT_FALLBACK", False),
    )
