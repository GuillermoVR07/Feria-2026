from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl, field_validator


SuspicionLevel = Literal["low", "moderate", "high"]


class ModelInfo(BaseModel):
    name: str = Field(default="oral-lesion-triage-cnn")
    version: str = Field(default="1.0.0")
    architecture: str = Field(default="mobilenetv3-small")


class OralLesionInferenceRequest(BaseModel):
    request_id: str | None = None
    case_id: UUID | None = None
    case_code: str | None = None
    image_id: UUID | str
    image_url: HttpUrl
    model: ModelInfo | None = None
    model_name: str | None = None
    model_version: str | None = None

    @field_validator("case_code")
    @classmethod
    def validate_case_code(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("case_code no puede estar vacio.")
        return value

    def resolved_model_name(self, default: str) -> str:
        if self.model and self.model.name:
            return self.model.name
        return self.model_name or default

    def resolved_model_version(self, default: str) -> str:
        if self.model and self.model.version:
            return self.model.version
        return self.model_version or default

    def resolved_model_architecture(self, default: str) -> str:
        if self.model and self.model.architecture:
            return self.model.architecture
        return default


class GradcamResponse(BaseModel):
    content_type: str
    base64: str


class OralLesionInferenceResponse(BaseModel):
    service_request_id: str
    request_id: str | None = None
    model_name: str
    model_version: str
    architecture: str
    input_shape: list[int]
    suspicion_level: SuspicionLevel
    probability: float
    class_probabilities: dict[str, float]
    gradcam_base64: str | None = None
    gradcam_mime_type: str | None = None
    gradcam: GradcamResponse | None = None
    latency_ms: int
    warnings: list[str] = Field(default_factory=list)
