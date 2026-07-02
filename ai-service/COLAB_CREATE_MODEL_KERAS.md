# Crear `model.keras` en Google Colab

Esta guia genera en Google Colab un archivo:

```text
model.keras
```

compatible con tu servicio:

```text
ai-service/models/oral-lesion-triage-cnn/1.0.0/model.keras
```

El modelo usa `MobileNetV3Small` como base visual y una salida de 3 clases:

- `low`
- `moderate`
- `high`

Importante: este checkpoint es para probar el software completo. No esta entrenado ni validado clinicamente con pacientes reales.

## 1. Crear notebook en Colab

1. Entra a `https://colab.research.google.com/`.
2. Crea un notebook nuevo.
3. Ve a `Runtime` -> `Change runtime type`.
4. Puedes usar:
   - `CPU`: suficiente para esta version tecnica.
   - `T4 GPU`: mejor si esta disponible.

## 2. Celda 1: instalar/verificar dependencias

```python
import sys
import tensorflow as tf

print("Python:", sys.version)
print("TensorFlow:", tf.__version__)
```

## 3. Celda 2: generar dataset sintetico y entrenar

Pega esta celda completa y ejecutala. Tarda varios minutos.

```python
from pathlib import Path
import math
import random

import numpy as np
import tensorflow as tf
from PIL import Image, ImageDraw, ImageFilter
from tensorflow.keras.applications.mobilenet_v3 import preprocess_input

OUTPUT_PATH = Path("/content/model.keras")
CLASS_NAMES = ("low", "moderate", "high")
IMAGE_SIZE = 224
SEED = 20260702

random.seed(SEED)
np.random.seed(SEED)
tf.keras.utils.set_random_seed(SEED)


def _rng(seed_offset: int) -> random.Random:
    return random.Random(SEED + seed_offset)


def _base_mouth_texture(rng: random.Random) -> Image.Image:
    base_color = (
        rng.randint(172, 220),
        rng.randint(82, 132),
        rng.randint(92, 142),
    )
    image = Image.new("RGB", (IMAGE_SIZE, IMAGE_SIZE), base_color)
    draw = ImageDraw.Draw(image, "RGBA")

    for _ in range(32):
        x0 = rng.randint(-30, IMAGE_SIZE)
        y0 = rng.randint(-30, IMAGE_SIZE)
        x1 = x0 + rng.randint(18, 90)
        y1 = y0 + rng.randint(8, 42)
        color = (
            min(255, base_color[0] + rng.randint(-18, 28)),
            min(255, base_color[1] + rng.randint(-18, 22)),
            min(255, base_color[2] + rng.randint(-18, 22)),
            rng.randint(18, 55),
        )
        draw.ellipse((x0, y0, x1, y1), fill=color)

    return image.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.4, 1.5)))


def _draw_irregular_patch(draw, rng, center, radius, fill, outline=None):
    points = []
    for index in range(22):
        angle = 2 * math.pi * index / 22
        jitter = rng.uniform(0.55, 1.25)
        points.append((
            center[0] + math.cos(angle) * radius * jitter,
            center[1] + math.sin(angle) * radius * rng.uniform(0.45, 1.05),
        ))
    draw.polygon(points, fill=fill, outline=outline)


def _sample_image(class_index: int, sample_index: int) -> Image.Image:
    rng = _rng(class_index * 10_000 + sample_index)
    image = _base_mouth_texture(rng)
    draw = ImageDraw.Draw(image, "RGBA")

    if class_index == 0:
        # Bajo: textura oral casi normal, cambios leves.
        for _ in range(rng.randint(1, 3)):
            x = rng.randint(35, 170)
            y = rng.randint(35, 170)
            draw.ellipse((x, y, x + rng.randint(8, 22), y + rng.randint(5, 16)), fill=(255, 180, 190, 28))

    if class_index == 1:
        # Moderado: placa o zona irregular clara/rojiza.
        center = (rng.randint(70, 155), rng.randint(70, 155))
        _draw_irregular_patch(draw, rng, center, rng.randint(22, 42), (238, 205, 188, 120), (190, 70, 80, 65))
        if rng.random() > 0.35:
            _draw_irregular_patch(
                draw,
                rng,
                (center[0] + rng.randint(-10, 12), center[1] + rng.randint(-8, 12)),
                rng.randint(10, 22),
                (220, 55, 65, 80),
            )

    if class_index == 2:
        # Alto: lesion mas oscura/irregular con centro ulcerado simulado.
        center = (rng.randint(68, 158), rng.randint(68, 158))
        _draw_irregular_patch(draw, rng, center, rng.randint(30, 56), (126, 28, 42, 150), (75, 15, 24, 120))
        _draw_irregular_patch(
            draw,
            rng,
            (center[0] + rng.randint(-8, 8), center[1] + rng.randint(-8, 8)),
            rng.randint(12, 28),
            (235, 220, 198, 120),
        )
        for _ in range(rng.randint(2, 5)):
            x = center[0] + rng.randint(-34, 34)
            y = center[1] + rng.randint(-30, 30)
            draw.ellipse((x, y, x + rng.randint(5, 15), y + rng.randint(4, 13)), fill=(80, 8, 18, 95))

    angle = rng.uniform(-10, 10)
    image = image.rotate(angle, resample=Image.Resampling.BILINEAR, fillcolor=image.getpixel((0, 0)))
    return image.filter(ImageFilter.GaussianBlur(radius=rng.uniform(0.0, 0.55)))


def make_dataset(samples_per_class: int = 120):
    images = []
    labels = []

    for class_index in range(len(CLASS_NAMES)):
        for sample_index in range(samples_per_class):
            image = _sample_image(class_index, sample_index)
            images.append(np.asarray(image, dtype=np.float32))
            labels.append(class_index)

    x = preprocess_input(np.stack(images, axis=0))
    y = tf.keras.utils.to_categorical(np.asarray(labels, dtype=np.int32), num_classes=len(CLASS_NAMES))
    order = np.random.default_rng(SEED).permutation(len(labels))
    return x[order], y[order]


def build_model() -> tf.keras.Model:
    try:
        base = tf.keras.applications.MobileNetV3Small(
            input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
            include_top=False,
            weights="imagenet",
            pooling="avg",
        )
        print("Loaded MobileNetV3Small ImageNet weights.")
    except Exception as exc:
        print("Could not load ImageNet weights. Using random base.", exc)
        base = tf.keras.applications.MobileNetV3Small(
            input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3),
            include_top=False,
            weights=None,
            pooling="avg",
        )

    base.trainable = False

    x = tf.keras.layers.Dropout(0.15, name="triage_dropout")(base.output)
    outputs = tf.keras.layers.Dense(3, activation="softmax", name="triage")(x)

    model = tf.keras.Model(inputs=base.input, outputs=outputs, name="oral_lesion_triage_cnn")
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


x, y = make_dataset(samples_per_class=120)
model = build_model()

history = model.fit(
    x,
    y,
    batch_size=24,
    epochs=6,
    validation_split=0.2,
    verbose=2,
)

model.save(OUTPUT_PATH)
print("Saved:", OUTPUT_PATH)
print("Class order:", CLASS_NAMES)
print("WARNING: technical test model only, not clinically validated.")
```

## 4. Celda 3: probar que el archivo carga

```python
import tensorflow as tf
import numpy as np
from tensorflow.keras.applications.mobilenet_v3 import preprocess_input

loaded = tf.keras.models.load_model("/content/model.keras")

dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
dummy = preprocess_input(dummy)

pred = loaded.predict(dummy)
print("Prediction:", pred)
print("Sum:", pred.sum())
print("Class index:", pred.argmax())
```

Debe imprimir 3 probabilidades y una suma cercana a `1.0`.

## 5. Celda 4: descargar `model.keras`

```python
from google.colab import files
files.download("/content/model.keras")
```

## 6. Subir a Hugging Face

Sube el archivo descargado a tu Space exactamente en esta ruta:

```text
models/oral-lesion-triage-cnn/1.0.0/model.keras
```

En Hugging Face, las variables deben quedar asi:

```env
AI_MODEL_PATH=/home/user/app/models/oral-lesion-triage-cnn/1.0.0/model.keras
AI_MODEL_NAME=oral-lesion-triage-cnn
AI_MODEL_VERSION=1.0.0
AI_MODEL_ARCHITECTURE=mobilenetv3-small
AI_REQUIRE_CLINICAL_CHECKPOINT=true
AI_ALLOW_CONTRACT_FALLBACK=false
AI_ENABLE_GRADCAM=true
AI_REQUIRE_GRADCAM=false
```

Luego haz `Restart` o `Factory rebuild` en el Space.

## 7. Probar en Hugging Face

Abre:

```text
https://guillermovr-oraldiagnostic-ai-service.hf.space/health
```

Debe devolver:

```json
{
  "service": "oraldiagnostic-ai-service",
  "status": "ok"
}
```

## 8. Nota clinica

Este modelo esta hecho de cero para que tu software funcione correctamente en pruebas de integracion. No diagnostica cancer, no confirma malignidad y no descarta enfermedad.

Para una version real, hay que reemplazar este `model.keras` por un modelo entrenado con imagenes clinicas reales, separacion paciente-a-paciente y validacion profesional.
