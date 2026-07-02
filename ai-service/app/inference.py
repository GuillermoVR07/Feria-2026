from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .config import Settings
from .model_loader import LoadedModel


# Orden interno del backend (para la respuesta JSON y la UI)
CLASS_LABELS = ("low", "moderate", "high")

# Keras ordena las clases ALFABÉTICAMENTE cuando entrenas con image_dataset_from_directory
# Orden alfabético: high=0, low=1, moderate=2
# Este mapa re-ordena la salida del modelo Colab al orden interno del backend.
COLAB_MODEL_CLASS_REMAP = {
    # colab_index: backend_label
    0: "high",
    1: "low",
    2: "moderate",
}


@dataclass
class PredictionResult:
    suspicion_level: str
    probability: float
    class_probabilities: dict[str, float]
    raw_class_index: int
    warnings: list[str]


def _softmax(values: np.ndarray) -> np.ndarray:
    shifted = values - np.max(values)
    exp_values = np.exp(shifted)
    total = np.sum(exp_values)
    if total == 0 or not np.isfinite(total):
        return np.array([1 / 3, 1 / 3, 1 / 3], dtype=np.float32)
    return exp_values / total


def _normalize_three_class_output(
    output: np.ndarray,
    clinically_adapted: bool = False,
) -> tuple[np.ndarray, int]:
    vector = np.asarray(output).reshape(-1)
    raw_class_index = int(np.argmax(vector))

    if vector.size == 3:
        probabilities = vector.astype(np.float32)
        if np.any(probabilities < 0) or not math.isclose(float(np.sum(probabilities)), 1.0, rel_tol=0.1, abs_tol=0.1):
            probabilities = _softmax(probabilities)
        probabilities = probabilities / np.sum(probabilities)

        # Si es el modelo clínico de Colab, re-mapear del orden alfabético al orden del backend.
        # Orden Colab (alfabético): [high, low, moderate] → índices [0, 1, 2]
        # Orden backend:            [low, moderate, high] → índices [0, 1, 2]
        if clinically_adapted:
            p_high     = float(probabilities[0])  # índice 0 = "high" en Colab
            p_low      = float(probabilities[1])  # índice 1 = "low" en Colab
            p_moderate = float(probabilities[2])  # índice 2 = "moderate" en Colab
            # Re-ordenar al esquema del backend: [low, moderate, high]
            probabilities = np.array([p_low, p_moderate, p_high], dtype=np.float32)
            raw_class_index = int(np.argmax(probabilities))

        return probabilities, raw_class_index

    # Modelo base ImageNet (>3 clases) — adaptador heurístico
    confidence = float(np.max(vector))
    if confidence > 1.0 or np.any(vector < 0) or not math.isclose(float(np.sum(vector)), 1.0, rel_tol=0.1, abs_tol=0.1):
        vector = _softmax(vector)
        confidence = float(np.max(vector))
        raw_class_index = int(np.argmax(vector))

    low = max(0.05, 1.0 - confidence)
    moderate = max(0.05, 1.0 - abs(confidence - 0.5) * 2.0)
    high = max(0.05, confidence * 0.5)
    probabilities = np.array([low, moderate, high], dtype=np.float32)
    probabilities = probabilities / np.sum(probabilities)
    return probabilities, raw_class_index


def run_prediction(model: LoadedModel, batch: np.ndarray, settings: Settings) -> PredictionResult:
    if model.source == "contract-fallback":
        model_input = batch / 255.0
    else:
        try:
            from tensorflow.keras.applications.mobilenet_v3 import preprocess_input

            model_input = preprocess_input(np.array(batch, copy=True))
        except Exception:
            model_input = batch / 255.0

    output = model.model.predict(model_input, verbose=0)
    probabilities, raw_class_index = _normalize_three_class_output(
        output, clinically_adapted=model.clinically_adapted
    )
    selected_index = int(np.argmax(probabilities))
    suspicion_level = CLASS_LABELS[selected_index]
    class_probabilities = {
        label: round(float(probabilities[index]), 6)
        for index, label in enumerate(CLASS_LABELS)
    }

    warnings = list(model.warnings)
    if not model.clinically_adapted:
        warnings.append("RESULTADO_SOLO_PARA_INTEGRACION_TECNICA")

    return PredictionResult(
        suspicion_level=suspicion_level,
        probability=class_probabilities[suspicion_level],
        class_probabilities=class_probabilities,
        raw_class_index=raw_class_index,
        warnings=warnings,
    )
