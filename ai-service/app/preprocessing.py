from __future__ import annotations

import io
import urllib.error
import urllib.request

import numpy as np
from PIL import Image, UnidentifiedImageError

from .config import Settings


class ImageDownloadError(RuntimeError):
    pass


class ImageDecodeError(RuntimeError):
    pass


def download_image_bytes(image_url: str, settings: Settings) -> bytes:
    request = urllib.request.Request(
        image_url,
        headers={"User-Agent": "OralDiagnostic-AI-Service/1.0"},
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=settings.download_timeout_seconds) as response:
            content_length = response.headers.get("Content-Length")
            if content_length and int(content_length) > settings.max_image_bytes:
                raise ImageDownloadError("La imagen excede el limite permitido.")

            data = response.read(settings.max_image_bytes + 1)
    except urllib.error.URLError as exc:
        raise ImageDownloadError("No se pudo descargar la imagen firmada.") from exc

    if len(data) > settings.max_image_bytes:
        raise ImageDownloadError("La imagen excede el limite permitido.")

    if not data:
        raise ImageDownloadError("La imagen descargada esta vacia.")

    return data


def decode_image(image_bytes: bytes) -> Image.Image:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        return image.convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageDecodeError("La imagen no se pudo decodificar.") from exc


def image_to_model_array(image: Image.Image, settings: Settings) -> np.ndarray:
    resized = image.resize((settings.input_width, settings.input_height))
    array = np.asarray(resized, dtype=np.float32)
    return np.expand_dims(array, axis=0)
