from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import numpy as np

from .config import Settings


class ModelLoadError(RuntimeError):
    pass


@dataclass
class LoadedModel:
    model: Any
    source: str
    clinically_adapted: bool
    warnings: list[str]


class ContractFallbackModel:
    """Solo para pruebas de contrato locales; no usar para produccion."""

    def predict(self, batch: np.ndarray, verbose: int = 0) -> np.ndarray:
        mean = float(np.mean(batch) / 255.0)
        low = max(0.05, 1.0 - mean)
        high = max(0.05, mean)
        moderate = max(0.05, 1.0 - abs(mean - 0.5) * 2)
        values = np.array([[low, moderate, high]], dtype=np.float32)
        return values / np.sum(values)


def load_model(settings: Settings) -> LoadedModel:
    if os.path.exists(settings.model_path):
        try:
            import tensorflow as tf

            model = tf.keras.models.load_model(settings.model_path)
            return LoadedModel(
                model=model,
                source=settings.model_path,
                clinically_adapted=True,
                warnings=[],
            )
        except Exception as exc:
            raise ModelLoadError("No se pudo cargar el checkpoint configurado.") from exc

    if settings.require_clinical_checkpoint:
        raise ModelLoadError("No existe checkpoint clinico adaptado en AI_MODEL_PATH.")

    if settings.allow_contract_fallback:
        return LoadedModel(
            model=ContractFallbackModel(),
            source="contract-fallback",
            clinically_adapted=False,
            warnings=["CONTRACT_FALLBACK_NO_VALIDO_PARA_INFERENCIA_REAL"],
        )

    try:
        import tensorflow as tf

        model = tf.keras.applications.MobileNetV3Small(
            weights="imagenet",
            include_top=True,
            input_shape=tuple(settings.input_shape),
        )
        return LoadedModel(
            model=model,
            source="tf.keras.applications.MobileNetV3Small(weights='imagenet')",
            clinically_adapted=False,
            warnings=["BASE_MODEL_IMAGENET_NO_VALIDADO_CLINICAMENTE"],
        )
    except Exception as exc:
        raise ModelLoadError("No se pudo cargar MobileNetV3Small preentrenado.") from exc
