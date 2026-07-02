# OralDiagnostic - Contexto de implementacion Supabase Fase 11

Fecha: 2026-07-01

Proyecto Supabase: `OralDiagnostic`

## Resumen

Se avanzo con la Fase 11 del documento `docs/backend_supabase_por_fases.md`: servicio IA externo.

Decision principal:

- No se implemento ni ejecuto IA real localmente.
- No se activo ningun modelo IA.
- No se invento un resultado IA.
- No se creo un servicio IA falso.
- Se preparo y endurecio el contrato backend para que `run-inference` pueda integrarse con un servicio IA externo cuando exista.

Motivo:

- El equipo local no puede ejecutar modelos IA.
- La IA queda pendiente para un entorno externo o nube.

## Validacion local con Deno

Deno instalado:

```text
deno 2.9.0
v8 14.9.207.2-rusty
typescript 6.0.3
```

Validaciones ejecutadas:

```powershell
C:\Users\Armando\.deno\bin\deno.exe check supabase\functions\run-inference\index.ts
C:\Users\Armando\.deno\bin\deno.exe check supabase\functions\_shared\recommendation-engine.ts
```

Resultado:

```text
Check OK
```

Nota operativa:

- `deno.exe` existe en `C:\Users\Armando\.deno\bin\deno.exe`.
- En esta terminal todavia no aparecia como `deno` en PATH, por eso se uso ruta absoluta.

## Cambios aplicados en `run-inference`

Archivo modificado:

```text
supabase/functions/run-inference/index.ts
```

Se reforzo el contrato con el futuro servicio IA:

1. Timeout HTTP:
   - `AbortSignal.timeout(30000)`
   - Si el servicio IA no responde, se devuelve `AI_INFERENCE_FAILED`.

2. Validacion de respuesta IA:
   - `suspicion_level` debe ser `low`, `moderate` o `high`.
   - `probability` debe estar entre 0 y 1.
   - `class_probabilities` debe contener:
     - `low`
     - `moderate`
     - `high`
   - La suma de probabilidades debe estar entre `0.95` y `1.05`.

3. Compatibilidad con contrato documentado:
   - Se acepta `gradcam_base64`.
   - Se acepta tambien `gradcam_base64_png`, que aparece en el documento base de Fase 11.

4. Validacion de modelo:
   - Si el servicio IA responde `model_name` o `model_version`, debe coincidir con el modelo activo solicitado.
   - Si responde otro modelo, se rechaza la respuesta.

5. Metadata tecnica:
   - Se guarda en `ai_inferences.metadata`:
     - `signed_url_ttl_seconds`
     - `ai_service_warnings`
     - `ai_service_model`

## Contrato esperado del servicio IA

Endpoint:

```text
POST /v1/inference/oral-lesion
```

Headers:

```text
Authorization: Bearer {AI_SERVICE_TOKEN}
Content-Type: application/json
```

Payload enviado por Supabase:

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

Respuesta minima aceptada:

```json
{
  "service_request_id": "uuid-opcional",
  "model_name": "oral-lesion-triage-cnn",
  "model_version": "1.0.0",
  "architecture": "mobilenetv3-small",
  "suspicion_level": "moderate",
  "probability": 0.53,
  "class_probabilities": {
    "low": 0.28,
    "moderate": 0.53,
    "high": 0.19
  },
  "gradcam_base64": "base64-opcional",
  "gradcam_mime_type": "image/png",
  "latency_ms": 2140,
  "warnings": []
}
```

Tambien se acepta:

```json
{
  "gradcam_base64_png": "base64..."
}
```

## Manejo de errores implementado o preparado

| Caso | Resultado backend |
|---|---|
| Servicio IA no configurado | `AI_SERVICE_UNAVAILABLE` |
| Timeout del servicio IA | `AI_INFERENCE_FAILED` |
| HTTP no OK desde servicio IA | `AI_INFERENCE_FAILED` |
| Respuesta no JSON compatible | `AI_INFERENCE_FAILED` |
| Clase IA invalida | `AI_INFERENCE_FAILED` |
| Probabilidades inconsistentes | `AI_INFERENCE_FAILED` |
| Modelo respondido distinto al solicitado | `AI_INFERENCE_FAILED` |
| Grad-CAM ausente | Se permite; no se crea imagen Grad-CAM |

Nota:

- El documento base indica que Grad-CAM ausente debe guardar inferencia y marcar advertencia si la clasificacion llego.
- La metadata `ai_service_warnings` queda preparada para registrar esa advertencia cuando el servicio IA la devuelva.

## Deploy remoto

Se desplego `run-inference` por MCP de Supabase.

Resultado:

```json
{
  "slug": "run-inference",
  "version": 3,
  "status": "ACTIVE",
  "verify_jwt": false
}
```

Motivo de `verify_jwt = false`:

- La funcion ya operaba asi en fases previas.
- El acceso se valida internamente mediante:
  - `case_code + case_token`; o
  - Auth interno.

## Estado remoto verificado despues del deploy

```json
{
  "active_models": 0,
  "total_models": 1
}
```

```json
{
  "inferences_count": 0
}
```

```json
{
  "recommendations_count": 0
}
```

Interpretacion:

- No se activo ningun modelo.
- No se creo inferencia falsa.
- No se creo recomendacion falsa.

## Pendiente para cerrar Fase 11 completa

La Fase 11 queda preparada desde Supabase, pero no completa a nivel operativo porque falta el servicio IA externo.

Pendientes:

1. Desplegar un servicio IA externo real.
2. Configurar `AI_SERVICE_URL`.
3. Configurar `AI_SERVICE_TOKEN`.
4. Activar un modelo en `ai_models` solo cuando el servicio IA este probado.
5. Ejecutar una prueba feliz con:
   - imagen aceptada;
   - cuestionario existente;
   - modelo activo;
   - respuesta IA valida;
   - Grad-CAM si esta disponible.
6. Verificar que se creen:
   - `ai_inferences`;
   - `case_images` Grad-CAM si llega imagen;
   - `recommendations`;
   - actualizacion de `cases.final_*`.

## Estado final de Fase 11

```text
Fase 11 preparada en Supabase a nivel de contrato, validacion y despliegue de run-inference.
Servicio IA real pendiente.
Modelo IA sigue inactivo.
No se generaron inferencias ni recomendaciones falsas.
```

