from __future__ import annotations

import base64
import io
from typing import Any

import numpy as np
from PIL import Image

from .config import Settings
from .model_loader import LoadedModel


class GradcamUnavailable(RuntimeError):
    pass


def _find_last_conv_layer(model: Any) -> Any:
    try:
        import tensorflow as tf
    except Exception as exc:
        raise GradcamUnavailable("TensorFlow no esta disponible.") from exc

    for layer in reversed(model.layers):
        if hasattr(layer, "output_shape") and len(layer.output_shape) == 4:
            return layer

    raise GradcamUnavailable("No se encontro capa convolucional (4D) para Grad-CAM.")


def _overlay_heatmap(original: Image.Image, heatmap: np.ndarray) -> str:
    heatmap = np.uint8(255 * heatmap)
    heatmap_image = Image.fromarray(heatmap, mode="L").resize(original.size)
    red = Image.new("RGB", original.size, (255, 0, 0))
    color_heatmap = Image.composite(red, Image.new("RGB", original.size, (0, 0, 0)), heatmap_image)
    overlay = Image.blend(original.convert("RGB"), color_heatmap, alpha=0.35)

    output = io.BytesIO()
    overlay.save(output, format="PNG")
    return base64.b64encode(output.getvalue()).decode("ascii")


def generate_gradcam(
    loaded_model: LoadedModel,
    batch: np.ndarray,
    original: Image.Image,
    class_index: int,
    settings: Settings,
) -> str:
    if not settings.enable_gradcam:
        raise GradcamUnavailable("Grad-CAM deshabilitado por configuracion.")

    try:
        import tensorflow as tf
        from tensorflow.keras.applications.mobilenet_v3 import preprocess_input
    except Exception as exc:
        raise GradcamUnavailable("TensorFlow no esta disponible para Grad-CAM.") from exc

    model = loaded_model.model
    target_layer = _find_last_conv_layer(model)

    model_input = preprocess_input(np.array(batch, copy=True))
    with tf.GradientTape() as tape:
        x = model_input
        conv_outputs = None
        for l in model.layers:
            if isinstance(l, tf.keras.layers.InputLayer):
                continue
            try:
                x = l(x, training=False)
            except TypeError:
                x = l(x)
                
            if l == target_layer:
                conv_outputs = x
                
        predictions = x
        
        if conv_outputs is None:
            raise GradcamUnavailable("No se pudo obtener la salida de la capa convolucional.")

        safe_index = min(class_index, int(predictions.shape[-1]) - 1)
        loss = predictions[:, safe_index]

    grads = tape.gradient(loss, conv_outputs)
    if grads is None:
        raise GradcamUnavailable("No se pudieron calcular gradientes.")

    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap) if len(heatmap.shape) > 2 else heatmap
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
    heatmap_array = heatmap.numpy()
    if heatmap_array.ndim < 2:
        heatmap_array = np.atleast_2d(heatmap_array)

    return _overlay_heatmap(original, heatmap_array)
