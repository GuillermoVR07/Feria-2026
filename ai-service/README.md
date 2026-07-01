# OralDiagnostic AI Service

Microservicio FastAPI para la inferencia IA de OralDiagnostic.

## Fases implementadas

### Fase 1 - Base del servicio

- FastAPI.
- `GET /health`.
- `POST /v1/inference/oral-lesion`.
- Autenticacion por `Authorization: Bearer {AI_AUTH_TOKEN}`.
- Esquemas Pydantic compatibles con `run-inference`.

### Fase 2 - Imagen

- Descarga desde URL firmada temporal.
- Limite de bytes.
- Decodificacion con Pillow.
- Conversion a RGB.
- Redimensionado a `224x224`.

### Fase 3 - Modelo ya creado

- Si existe `AI_MODEL_PATH`, carga ese checkpoint `.keras`.
- Si no existe, usa `MobileNetV3Small(weights="imagenet")`.
- No entrena ningun modelo desde cero.
- Si se usa ImageNet como base tecnica, la respuesta incluye advertencia de no validacion clinica.

### Fase 4 - Inferencia

- Devuelve `suspicion_level`, `probability` y `class_probabilities`.
- Mantiene `model_name`, `model_version` y `architecture`.
- Devuelve `service_request_id` para trazabilidad.

### Fase 5 - Grad-CAM

- Intenta generar Grad-CAM cuando el modelo permite gradientes sobre una capa convolucional.
- Grad-CAM queda obligatorio por defecto con `AI_REQUIRE_GRADCAM=true`.
- Si se desactiva la obligatoriedad para pruebas, no inventa imagen y devuelve advertencia.

### Fase 6 - Pruebas y despliegue

- Incluye pruebas de health, seguridad y contrato.
- Incluye Dockerfile.
- No guarda imagenes de usuarios.
- No conecta directo a Supabase/PostgreSQL.

## Uso local

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

## Variables principales

```env
AI_AUTH_TOKEN=change-me-server-only
AI_MODEL_PATH=/app/models/oral-lesion-triage-cnn/1.0.0/model.keras
AI_MODEL_NAME=oral-lesion-triage-cnn
AI_MODEL_VERSION=1.0.0
AI_MODEL_ARCHITECTURE=mobilenetv3-small
AI_REQUIRE_CLINICAL_CHECKPOINT=false
AI_ENABLE_GRADCAM=true
AI_REQUIRE_GRADCAM=true
```

Para produccion, usar un checkpoint adaptado a lesiones bucales y poner:

```env
AI_REQUIRE_CLINICAL_CHECKPOINT=true
```

## Contrato usado por Supabase

`supabase/functions/run-inference/index.ts` envia:

```json
{
  "case_code": "OD-...",
  "image_id": "uuid",
  "image_url": "signed-url-temporal",
  "model": {
    "name": "oral-lesion-triage-cnn",
    "version": "1.0.0",
    "architecture": "mobilenetv3-small"
  }
}
```

El servicio responde:

```json
{
  "service_request_id": "uuid",
  "suspicion_level": "moderate",
  "probability": 0.53,
  "class_probabilities": {
    "low": 0.28,
    "moderate": 0.53,
    "high": 0.19
  },
  "gradcam_base64": null,
  "gradcam_mime_type": null,
  "latency_ms": 850
}
```

## Regla clinica

Este servicio no diagnostica cancer, no confirma malignidad y no descarta enfermedad. Solo entrega una senal tecnica para apoyar el flujo preventivo del MVP.
