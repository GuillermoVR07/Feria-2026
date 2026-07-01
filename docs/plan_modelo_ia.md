# OralDiagnostic - Plan para seleccionar e integrar modelo IA

Fecha de corte: 2026-06-30

## Objetivo

Definir el camino de implementacion del servicio IA sin crear un modelo desde cero y sin activar inferencia real hasta tener un artefacto validado.

## Lectura del documento base

El documento `docs/backend_supabase_por_fases.md` no define un checkpoint publico especifico ya entrenado para lesiones bucales. Lo que si define es el contrato tecnico:

- La IA pesada debe estar fuera de Supabase como servicio externo.
- El servicio sugerido es FastAPI + Python.
- El framework puede ser TensorFlow/Keras o PyTorch.
- La arquitectura sembrada para el MVP es `mobilenetv3-small`.
- El nombre logico esperado es `oral-lesion-triage-cnn`.
- La entrada esperada es `[224,224,3]`.
- Las clases esperadas son `low`, `moderate`, `high`.
- El endpoint esperado es `POST /v1/inference/oral-lesion`.
- El servicio debe devolver clasificacion, probabilidades y Grad-CAM.

## Decision recomendada

Usar un modelo ya creado/preentrenado como base, no entrenar desde cero.

Opcion inicial compatible con el documento:

- Base: `MobileNetV3Small`.
- Pesos iniciales: ImageNet.
- Framework recomendado para esta version: TensorFlow/Keras.
- Entrada: `224x224x3`.
- Servicio: FastAPI.
- Estado Supabase: mantener `ai_models.is_active = false` hasta tener servicio IA operativo y validacion minima.

Importante:

- `MobileNetV3Small` con pesos ImageNet es un modelo ya creado/preentrenado, pero no es automaticamente un clasificador clinico de lesiones bucales.
- Para producir `low/moderate/high` de forma responsable se necesita un cabezal de clasificacion validado o un checkpoint ya adaptado a lesiones bucales.
- Si se encuentra un checkpoint publico especifico para lesiones bucales con licencia compatible, se debe preferir ese artefacto sobre usar solo ImageNet.

## Fuentes verificadas

- TensorFlow documenta `tf.keras.applications.MobileNetV3Small` con `weights='imagenet'`, entrada compatible `(224,224,3)` y checkpoint `mobilenet_v3_small_1.0_224`.
- Keras Applications incluye MobileNetV3Small como arquitectura disponible.
- FastAPI es adecuado para construir APIs Python con contratos HTTP tipados.

## Plan de implementacion

### Paso 1 - Confirmar modelo exacto

Validar una de estas dos rutas:

1. Checkpoint publico especifico para lesiones bucales:
   - Debe tener licencia compatible.
   - Debe documentar clases o permitir mapearlas a `low`, `moderate`, `high`.
   - Debe permitir inferencia local o en servidor propio.
   - Debe permitir Grad-CAM o acceso a capas convolucionales.

2. MobileNetV3Small ImageNet como base:
   - No se entrena desde cero.
   - Se usa como arquitectura/base preentrenada.
   - Queda marcado como no validado clinicamente.
   - No debe activarse para decisiones reales hasta completar validacion.

### Paso 2 - Crear estructura del servicio IA

Crear un servicio separado, por ejemplo:

```text
ai-service/
  app/
    main.py
    config.py
    schemas.py
    security.py
    model_loader.py
    inference.py
    gradcam.py
  tests/
  requirements.txt
  Dockerfile
  README.md
```

Endpoints minimos:

- `GET /health`
- `POST /v1/inference/oral-lesion`

Seguridad:

- Requerir `Authorization: Bearer {AI_SERVICE_TOKEN}`.
- No acceder directo a PostgreSQL.
- No guardar imagenes de usuario.
- Descargar la imagen solo desde URL firmada temporal.

### Paso 3 - Implementar inferencia compatible con Supabase

Entrada:

- `case_id`
- `image_id`
- `image_url`
- `model_name`
- `requested_outputs`

Salida:

- `request_id`
- `model_name`
- `model_version`
- `architecture`
- `input_shape`
- `suspicion_level`
- `probability`
- `class_probabilities`
- `gradcam_base64_png`
- `latency_ms`
- `warnings`

Reglas de salida:

- `suspicion_level` solo puede ser `low`, `moderate` o `high`.
- Probabilidades entre 0 y 1.
- La suma de probabilidades debe estar razonablemente cerca de 1.
- Si no hay Grad-CAM, devolver `warnings` y no inventar imagen.

### Paso 4 - Ajustar `run-inference`

Revisar la Edge Function actual:

- Confirmar que lee modelo activo desde `public.ai_models`.
- Confirmar que genera signed URL temporal para la imagen.
- Confirmar que llama `AI_SERVICE_URL`.
- Confirmar que valida respuesta estrictamente.
- Confirmar que persiste `ai_inferences`.
- Confirmar que sube Grad-CAM a `case-gradcam`.
- Confirmar que crea `recommendations`.

No activar modelo en Supabase hasta que el servicio responda correctamente.

### Paso 5 - Registrar modelo operativo

Cuando el servicio este probado:

- Actualizar `AI_SERVICE_URL`.
- Configurar `AI_SERVICE_TOKEN`.
- Actualizar `ai_models.metrics` con datos reales disponibles.
- Activar el modelo con `is_active = true` solo si la ruta feliz esta validada.

### Paso 6 - Pruebas minimas

Pruebas del servicio IA:

- Healthcheck OK.
- Token ausente o invalido devuelve 401.
- Imagen inaccesible devuelve error controlado.
- Imagen valida devuelve contrato completo.
- Probabilidades invalidas son rechazadas.
- Grad-CAM ausente se reporta en `warnings`.

Pruebas Supabase:

- `run-inference` con servicio apagado devuelve error controlado.
- `run-inference` con servicio activo persiste inferencia.
- `run-inference` guarda Grad-CAM si se devuelve.
- `get-case-result` muestra resultado preventivo.
- Auditoria registra inicio, exito y fallos.

## Pendientes antes de implementar

1. Confirmar si se usara:
   - Un checkpoint publico especifico para lesiones bucales, si se encuentra uno confiable.
   - O `MobileNetV3Small(weights="imagenet")` como base preentrenada inicial.

2. Confirmar donde vivira el servicio IA:
   - Repositorio actual en carpeta `ai-service/`.
   - Repositorio separado.
   - Servicio temporal local para pruebas.

3. Confirmar si el primer objetivo es:
   - Solo integrar contrato y mock tecnico.
   - O integrar inferencia real con modelo preentrenado desde el inicio.

## No hacer

- No crear modelo desde cero.
- No inventar metricas clinicas.
- No activar `ai_models` sin servicio IA probado.
- No decir que el sistema diagnostica cancer.
- No guardar tokens ni URLs firmadas en el repositorio.
