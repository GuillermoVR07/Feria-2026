# Crear `model.keras` en Google Colab

Usa esta guia si tu PC no puede ejecutar TensorFlow localmente.

Este checkpoint tecnico sirve para probar el flujo completo Supabase -> Hugging Face -> Supabase. No es un modelo clinico entrenado ni validado.

## 1. Abrir Colab

1. Entra a `https://colab.research.google.com/`.
2. Crea un notebook nuevo.
3. Runtime recomendado:
   - `Runtime` -> `Change runtime type`
   - `Hardware accelerator`: `CPU` sirve para este checkpoint tecnico.

## 2. Celda 1: crear el modelo

Pega y ejecuta:

```python
from pathlib import Path
import tensorflow as tf

output_path = Path("/content/model.keras")

base = tf.keras.applications.MobileNetV3Small(
    input_shape=(224, 224, 3),
    include_top=False,
    weights=None,
    pooling="avg",
)

inputs = tf.keras.Input(shape=(224, 224, 3), name="image")
x = base(inputs, training=False)
x = tf.keras.layers.Dropout(0.2, name="dropout")(x)
outputs = tf.keras.layers.Dense(3, activation="softmax", name="triage")(x)

model = tf.keras.Model(inputs=inputs, outputs=outputs, name="oral_lesion_triage_cnn")
model.compile(
    optimizer="adam",
    loss="categorical_crossentropy",
    metrics=["accuracy"],
)

model.save(output_path)
print(f"Saved: {output_path}")
print("WARNING: This is not clinically trained or validated.")
```

## 3. Celda 2: probar que carga

```python
import tensorflow as tf
import numpy as np

loaded = tf.keras.models.load_model("/content/model.keras")
dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
pred = loaded.predict(dummy)
print(pred)
print(pred.sum())
```

Debe imprimir 3 probabilidades y una suma cercana a `1.0`.

## 4. Celda 3: descargar

```python
from google.colab import files
files.download("/content/model.keras")
```

## 5. Subir a Hugging Face

En tu Space de Hugging Face, sube el archivo descargado exactamente a:

```text
models/oral-lesion-triage-cnn/1.0.0/model.keras
```

Si la carpeta no existe en el Space, creala subiendo primero:

```text
models/oral-lesion-triage-cnn/1.0.0/README.md
```

o crea la ruta desde la interfaz de archivos de Hugging Face.

## 6. Variables para usar este checkpoint tecnico

En Hugging Face:

```env
AI_MODEL_PATH=/home/user/app/models/oral-lesion-triage-cnn/1.0.0/model.keras
AI_REQUIRE_CLINICAL_CHECKPOINT=true
AI_ALLOW_CONTRACT_FALLBACK=false
AI_ENABLE_GRADCAM=true
AI_REQUIRE_GRADCAM=false
```

`AI_REQUIRE_CLINICAL_CHECKPOINT=true` ahora funcionara porque el archivo existe.

## 7. Para un modelo real

Reemplaza este `model.keras` por un modelo entrenado y validado. Debe tener:

- Entrada: `(224, 224, 3)`
- Salida: 3 clases con softmax
- Orden de clases:
  - `low`
  - `moderate`
  - `high`

No uses el checkpoint tecnico como evidencia clinica.
