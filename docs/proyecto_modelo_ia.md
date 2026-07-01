# OralDiagnostic - Proyecto del modelo IA

Fecha de corte: 2026-07-01

## Confirmacion tecnica

Si: para OralDiagnostic la IA debe implementarse como un microservicio separado usando FastAPI + Python.

Esto coincide con `docs/backend_supabase_por_fases.md` y `docs/proyecto_por_fases.md`: Supabase queda como backend principal y orquestador, mientras que la inferencia pesada queda fuera de Supabase.

La razon es tecnica:

- Supabase Edge Functions deben validar, autorizar, crear URLs firmadas, llamar al servicio IA y persistir resultados.
- El servicio IA debe descargar la imagen desde una URL firmada temporal, ejecutar el modelo, generar Grad-CAM si aplica y devolver el resultado.
- El servicio IA no debe conectarse directamente a PostgreSQL.
- El servicio IA no debe guardar imagenes de usuario.

## Estado real actual del proyecto

Proyecto Supabase verificado: `OralDiagnostic`.

Estado actual confirmado:

- Las Edge Functions ya existen y estan activas, incluyendo `run-inference`.
- `run-inference` esta preparada para llamar a `AI_SERVICE_URL + /v1/inference/oral-lesion`.
- `run-inference` usa `AI_SERVICE_TOKEN`.
- `run-inference` requiere un modelo activo en `public.ai_models`.
- Actualmente existe un modelo registrado pero inactivo:

```json
{
  "name": "oral-lesion-triage-cnn",
  "version": "1.0.0",
  "architecture": "mobilenetv3-small",
  "storage_path": "models/oral-lesion-triage-cnn/1.0.0/model.keras",
  "input_shape": [224, 224, 3],
  "class_labels": ["low", "moderate", "high"],
  "is_active": false
}
```

El modelo esta correctamente inactivo porque todavia no existe servicio IA operativo configurado ni `AI_SERVICE_URL`/`AI_SERVICE_TOKEN` listos para ruta feliz.

## Decision principal

No se va a crear un modelo desde cero.

La implementacion debe usar un modelo ya creado/preentrenado como base. La opcion compatible con lo ya sembrado en Supabase es:

- Arquitectura: `MobileNetV3Small`.
- Pesos base: preentrenados en ImageNet.
- Framework recomendado: TensorFlow/Keras.
- Entrada: `224x224x3`.
- Nombre logico en Supabase: `oral-lesion-triage-cnn`.
- Version inicial: `1.0.0`.
- Servicio: FastAPI.

Importante: `MobileNetV3Small(weights="imagenet")` es un modelo ya creado/preentrenado, pero no es por si solo un clasificador clinico validado para lesiones bucales. Para usar `low`, `moderate` y `high` de manera responsable se necesita una de estas dos opciones:

1. Un checkpoint publico ya adaptado a lesiones bucales, con licencia compatible y clases documentadas.
2. Un cabezal de clasificacion propio sobre la base preentrenada, entrenado o ajustado con dataset documentado.

Para el MVP tecnico se puede avanzar con MobileNetV3Small preentrenado como base de integracion, pero no debe presentarse como validacion clinica.

## Alcance de este plan

Este plan cubre solamente la IA:

- Seleccion del modelo base ya creado.
- Servicio FastAPI.
- Contrato HTTP con Supabase.
- Preprocesamiento.
- Inferencia.
- Grad-CAM.
- Pruebas.
- Activacion controlada del modelo en Supabase.

No cubre:

- Frontend.
- Rediseño de base de datos.
- Nuevas tablas.
- Nuevas reglas clinicas no documentadas.
- Diagnostico medico.
- Entrenamiento desde cero.

## Arquitectura objetivo

```text
Frontend futuro / PWA
  -> Supabase Edge Function run-inference
    -> URL firmada temporal de imagen privada
    -> Servicio IA FastAPI
      -> Modelo ya creado/preentrenado
      -> Grad-CAM opcional
    -> Supabase guarda ai_inferences
    -> Supabase guarda Grad-CAM en Storage si existe
    -> Supabase crea recommendation preventiva
```

## Contrato del servicio IA

Endpoint obligatorio:

```text
POST /v1/inference/oral-lesion
```

Headers:

```text
Authorization: Bearer {AI_SERVICE_TOKEN}
Content-Type: application/json
```

Request esperado:

```json
{
  "request_id": "uuid",
  "case_id": "uuid",
  "image_id": "uuid",
  "image_url": "signed-url-temporal",
  "model_name": "oral-lesion-triage-cnn",
  "model_version": "1.0.0"
}
```

Response esperado:

```json
{
  "request_id": "uuid",
  "model_name": "oral-lesion-triage-cnn",
  "model_version": "1.0.0",
  "architecture": "mobilenetv3-small",
  "input_shape": [224, 224, 3],
  "suspicion_level": "moderate",
  "probability": 0.53,
  "class_probabilities": {
    "low": 0.28,
    "moderate": 0.53,
    "high": 0.19
  },
  "gradcam": {
    "content_type": "image/png",
    "base64": "..."
  },
  "latency_ms": 850,
  "warnings": []
}
```

Valores permitidos para `suspicion_level`:

- `low`
- `moderate`
- `high`

Reglas de respuesta:

- `probability` debe estar entre 0 y 1.
- `class_probabilities` debe tener las tres clases.
- La suma de probabilidades debe estar razonablemente cerca de 1.
- Si no se puede generar Grad-CAM, no inventar imagen.
- Si no hay Grad-CAM, devolver `gradcam: null` o no devolver el campo y agregar una advertencia en `warnings`.
- No devolver diagnostico medico.

## Estructura recomendada

Crear el servicio en el repositorio actual:

```text
ai-service/
  app/
    main.py
    config.py
    schemas.py
    model_loader.py
    preprocessing.py
    inference.py
    gradcam.py
    security.py
  models/
    .gitkeep
  tests/
    test_health.py
    test_contract.py
    test_inference_smoke.py
  Dockerfile
  requirements.txt
  .env.example
  README.md
```

No guardar pesos grandes en Git. Si se usa un archivo `.keras`, debe quedar fuera del repositorio o manejarse con almacenamiento/control de artefactos.

## Variables de entorno del servicio IA

```env
AI_AUTH_TOKEN=
AI_MODEL_PATH=/app/models/oral-lesion-triage-cnn/1.0.0/model.keras
AI_MODEL_NAME=oral-lesion-triage-cnn
AI_MODEL_VERSION=1.0.0
AI_MODEL_ARCHITECTURE=mobilenetv3-small
AI_INPUT_HEIGHT=224
AI_INPUT_WIDTH=224
AI_INPUT_CHANNELS=3
AI_ENVIRONMENT=local
```

## Plan de implementacion

### Paso 1 - Definir el artefacto inicial

Usar una de estas rutas, en este orden de preferencia:

1. Checkpoint publico especifico para lesiones bucales:
   - Debe tener licencia compatible.
   - Debe permitir inferencia en servidor propio.
   - Debe documentar clases o permitir mapearlas a `low`, `moderate`, `high`.
   - Debe permitir Grad-CAM o exponer capas convolucionales compatibles.

2. MobileNetV3Small preentrenado:
   - Usar `MobileNetV3Small(weights="imagenet")` como base ya creada.
   - Mantenerlo como integracion tecnica inicial.
   - No presentarlo como clasificador clinico validado.
   - No activarlo para decisiones reales hasta tener validacion minima documentada.

### Paso 2 - Crear el microservicio FastAPI

Implementar:

- `GET /health`
- `POST /v1/inference/oral-lesion`
- Validacion de `Authorization: Bearer`.
- Validacion de payload con Pydantic.
- Logs con `request_id`, `case_id`, `model_name`, `model_version`, `latency_ms`.
- Timeouts al descargar imagen.
- Manejo de errores sin exponer secretos ni URLs firmadas.

### Paso 3 - Cargar modelo y preprocesar imagen

Implementar:

- Descarga de imagen desde `image_url`.
- Rechazo si no es imagen decodificable.
- Conversion a RGB.
- Redimensionado a `224x224`.
- Normalizacion compatible con MobileNetV3Small.
- Tensor con forma `[1,224,224,3]`.

### Paso 4 - Inferencia

Implementar una salida compatible con el contrato:

- `suspicion_level`
- `probability`
- `class_probabilities`
- `model_name`
- `model_version`
- `architecture`
- `latency_ms`

Si se usa solo ImageNet sin cabezal adaptado, la salida `low/moderate/high` no debe usarse como resultado clinico. En ese caso, el servicio puede quedar en modo `staging` hasta conectar un checkpoint adaptado.

### Paso 5 - Grad-CAM

Implementar Grad-CAM cuando el modelo lo permita:

- Generar imagen PNG.
- Devolverla como base64.
- No almacenar la imagen en el servicio IA.
- Dejar que `run-inference` la guarde en el bucket privado `case-gradcam`.

Si Grad-CAM falla pero la clasificacion es valida, devolver advertencia:

```json
{
  "warnings": ["GRADCAM_UNAVAILABLE"]
}
```

### Paso 6 - Pruebas del servicio IA

Pruebas minimas:

- `GET /health` responde OK.
- Rechaza requests sin token.
- Rechaza token invalido.
- Rechaza payload incompleto.
- Rechaza URL de imagen inaccesible.
- Acepta una imagen real de prueba.
- Devuelve `suspicion_level` permitido.
- Devuelve probabilidades numericas entre 0 y 1.
- Devuelve `model_name` y `model_version`.
- No guarda imagenes localmente.
- No registra URLs firmadas completas en logs.

### Paso 7 - Integracion con Supabase

Configurar secrets en Supabase Functions:

```text
AI_SERVICE_URL=https://url-del-servicio-ia
AI_SERVICE_TOKEN=token-server-only
```

Luego validar que `run-inference`:

- Lee el modelo activo desde `public.ai_models`.
- Genera URL firmada temporal para la imagen original.
- Llama a `POST /v1/inference/oral-lesion`.
- Valida la respuesta IA.
- Persiste `ai_inferences`.
- Guarda Grad-CAM en `case-gradcam` si llega.
- Crea `recommendations`.
- Actualiza estado del caso.

### Paso 8 - Activacion controlada del modelo

No activar `ai_models.is_active = true` hasta cumplir todo esto:

- Servicio IA desplegado.
- `AI_SERVICE_URL` configurado.
- `AI_SERVICE_TOKEN` configurado.
- Endpoint probado con imagen real de prueba.
- `run-inference` probado contra caso con `quality_accepted`.
- Resultado persistido en `ai_inferences`.
- Recomendacion creada.
- Grad-CAM guardado o advertencia documentada.
- Lenguaje preventivo verificado.

La activacion debe hacerse con usuario admin mediante `admin-upsert-ai-model` o SQL controlado, no manualmente sin trazabilidad.

## Criterio de aceptacion

La IA queda lista para el MVP tecnico cuando:

```text
Una imagen valida subida a Storage privado pasa por validate-image,
run-inference llama al servicio FastAPI,
el servicio devuelve resultado versionado,
Supabase guarda ai_inferences,
Supabase guarda Grad-CAM si existe,
Supabase crea recommendation preventiva,
el resultado no usa lenguaje diagnostico,
y el modelo activo queda trazable por name/version/model_id.
```

## No hacer

- No crear el modelo desde cero.
- No activar `ai_models` antes de tener servicio IA probado.
- No inventar metricas clinicas.
- No decir que el sistema detecta cancer.
- No decir que el sistema descarta cancer.
- No guardar `AI_SERVICE_TOKEN` en Git.
- No guardar URLs firmadas en logs.
- No conectar el servicio IA directamente a PostgreSQL.
- No hacer publico ningun bucket de imagenes.
- No guardar imagenes de usuario dentro del microservicio IA.

## Pendientes concretos antes de construir

1. Confirmar si se buscara un checkpoint publico especifico para lesiones bucales o si se iniciara con MobileNetV3Small preentrenado como base tecnica.
2. Confirmar donde se desplegara el microservicio IA.
3. Confirmar si Grad-CAM es obligatorio para la primera prueba feliz o si puede quedar como advertencia temporal.
4. Confirmar si el artefacto `models/oral-lesion-triage-cnn/1.0.0/model.keras` vivira en almacenamiento externo, imagen Docker o volumen privado.

