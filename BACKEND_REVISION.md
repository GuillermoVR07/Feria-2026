# Revision backend Supabase + IA - OralDiagnostic

Fecha: 2026-07-02

Proyecto Supabase: `OralDiagnostic`

Project ref: `lsicnvutjvemohcxiwjk`

Servicio IA: `https://guillermovr-oraldiagnostic-ai-service.hf.space`

## Conclusion ejecutiva

El backend con Supabase y la integracion con IA estan implementados correctamente para iniciar el frontend MVP/demo.

La ruta principal ya fue verificada de extremo a extremo:

```text
create-case
submit-questionnaire
request-image-upload
finalize-image-upload
validate-image
run-inference
generate-report
get-case-result
```

Estado general:

```text
Backend Supabase: listo para frontend MVP
Edge Functions principales: activas
Storage privado: correcto
RLS: activo en tablas revisadas
IA externa Hugging Face: conectada y probada
Inferencias reales: creadas
Recomendaciones reales: creadas
PDF: generado
Resultado con disclaimer: funcionando
Grad-CAM: pendiente
```

No recomiendo declararlo listo para produccion clinica todavia. Si recomiendo avanzar al frontend, manteniendo las advertencias medicas y el flujo por Edge Functions.

## Evidencia remota verificada con MCP de Supabase

### Modelo IA

```text
active_models: 1
name: oral-lesion-triage-cnn
version: 1.0.0
architecture: mobilenetv3-small
is_active: true
```

### Conteos funcionales

```text
ai_inferences_count: 2
recommendations_count: 2
pdf_reports_count: 1
gradcam_images_count: 0
active_triage_rules: 6
audit_logs_count: 63
api_request_logs_count: 100
```

Interpretacion:

- `run-inference` ya llamo al servicio IA y persistio resultados.
- Las recomendaciones preventivas se generaron y guardaron.
- El PDF se genero al menos una vez.
- No hay Grad-CAM porque el servicio IA no devolvio `gradcam_base64` en la prueba.

## Evidencia de flujo completo

### Prueba de inferencia

```text
case_code: OD-20260702-3B62E244
case_id: 2e2779d7-8ef9-4f7e-bdc3-bd82c9ac9823
image_id: 6ccf3595-5dce-4638-8658-85b53f155c88
quality_status: accepted
inference_id: 0dc87c03-bbf8-4020-9165-fef302e1c1d7
suspicion_level: low
probability: 0.908816
urgency_level: priority
next_step: generate_report
```

### Prueba completa con PDF y resultado

```text
case_code: OD-20260702-21C5D38E
case_id: ee2fff0e-1bb4-4f37-8f99-d6e6b2f94fc0
image_id: 18238f19-187f-44d5-b5b1-dc27943add15
quality_status: accepted
inference_id: e47da01f-c1d4-4f8b-9bfe-4c2cf60d032b
report_id: 302453d7-0165-4c7e-b41c-082e2a7685f7
result_status: reported
result_suspicion: low
result_urgency: routine
has_report_url: true
has_disclaimer: true
```

## Edge Functions

Funciones activas en Supabase:

| Funcion | Version | Estado | Comentario |
|---|---:|---|---|
| `health-check` | 4 | ACTIVE | Diagnostico tecnico |
| `create-case` | 5 | ACTIVE | Crea caso y token temporal |
| `submit-questionnaire` | 4 | ACTIVE | Guarda cuestionario y risk score |
| `request-image-upload` | 3 | ACTIVE | Crea metadata y URL firmada |
| `finalize-image-upload` | 4 | ACTIVE | Verifica objeto en Storage |
| `validate-image` | 3 | ACTIVE | Valida calidad tecnica |
| `run-inference` | 6 | ACTIVE | Llama IA, guarda inferencia y recomendacion |
| `generate-report` | 3 | ACTIVE | Genera PDF y URL firmada |
| `get-case-result` | 3 | ACTIVE | Devuelve resultado con disclaimer |
| `create-signed-read-url` | 3 | ACTIVE | Firma assets privados |
| `review-case` | 3 | ACTIVE | Revision especialista/admin |
| `dashboard-metrics` | 3 | ACTIVE | Dashboard interno |
| `admin-upsert-ai-model` | 3 | ACTIVE | Administra modelos IA |
| `cleanup-expired-case-tokens` | 3 | ACTIVE | Limpieza de tokens |

Observacion:

- Muchas funciones tienen `verify_jwt: false`, pero esto es aceptable en las publicas porque usan validacion interna con `case_code + case_token`.
- Las funciones internas deben seguir validando usuario y rol dentro del codigo.

## Base de datos

### RLS

RLS esta activo en las tablas principales revisadas:

```text
public.ai_inferences
public.ai_models
public.api_request_logs
public.audit_logs
public.case_access_tokens
public.case_images
public.case_subjects
public.cases
public.consent_records
public.image_quality_checks
public.pdf_reports
public.profiles
public.recommendations
public.risk_questionnaires
public.triage_rules
storage.buckets
storage.objects
```

### Indices y reglas criticas

Verificado:

| Regla | Estado |
|---|---|
| `case_code` unico | Existe `cases_case_code_key` |
| Cuestionario unico por caso | Existe `risk_questionnaires_case_id_key` |
| Modelo unico por nombre + version | Existe `ai_models_name_version_key` |
| Solo un modelo activo por nombre | Existe `uq_ai_models_one_active_per_name` |
| Ruta Storage unica por bucket | Existe `case_images_bucket_name_object_path_key` |

## Storage

Buckets verificados:

| Bucket | Publico | Limite | MIME permitidos |
|---|---:|---:|---|
| `case-originals` | false | 10485760 | `image/jpeg`, `image/png`, `image/webp` |
| `case-gradcam` | false | 10485760 | `image/png`, `image/jpeg`, `image/webp` |
| `case-reports` | false | 10485760 | `application/pdf` |

Conclusion:

- Storage esta correcto para frontend mediante URLs firmadas.
- El frontend no debe usar rutas internas ni URLs publicas directas.

## IA externa

La IA esta conectada y funcionando para pruebas del software.

`run-inference` valida:

```text
suspicion_level en low/moderate/high
probability entre 0 y 1
class_probabilities con low/moderate/high
suma de probabilidades entre 0.95 y 1.05
model_name/model_version coincidente si el servicio los devuelve
timeout HTTP de 30 segundos
```

Pendientes IA:

1. Grad-CAM no se esta persistiendo porque el servicio IA no devolvio `gradcam_base64`.
2. El modelo actual sirve para pruebas de software; no debe presentarse como validado clinicamente.
3. Para una entrega real, el modelo debe entrenarse y validarse con dataset clinico y revision profesional.

## Contrato para frontend

El frontend anonimo debe consumir solo Edge Functions.

Flujo recomendado:

```text
1. create-case
2. Guardar temporalmente case_code y case_token
3. submit-questionnaire
4. request-image-upload
5. Subir imagen a upload_url firmada
6. finalize-image-upload
7. validate-image
8. Si quality_status = accepted, llamar run-inference
9. generate-report si se desea PDF
10. get-case-result para mostrar resultado
```

Variables publicas recomendadas:

```text
SUPABASE_URL=https://lsicnvutjvemohcxiwjk.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

No usar nunca en frontend:

```text
SUPABASE_SERVICE_ROLE_KEY
AI_SERVICE_TOKEN
CASE_TOKEN_SECRET
```

## Pendiente importante de contrato

El contrato de Fase 17 espera:

```text
result.reason_codes
```

Pero la funcion desplegada `get-case-result` actualmente no lo devuelve.

La tabla `recommendations` si guarda `reason_codes`, y `run-inference` si los genera. Por tanto, falta ajustar `get-case-result` para incluirlos en la respuesta antes o durante la integracion frontend.

Impacto:

- No bloquea el frontend MVP si no se muestran razones tecnicas.
- Si el frontend quiere explicar la recomendacion con codigos, hay que corregirlo.

## Seguridad

Correcto:

1. RLS activo en tablas revisadas.
2. Buckets privados.
3. Tokens temporales hasheados.
4. Flujo anonimo controlado por `case_code + case_token`.
5. `service_role` usado solo dentro de Edge Functions.
6. `review-case` y `dashboard-metrics` ya fueron probadas antes contra acceso anonimo y bloquearon.
7. El resultado incluye disclaimer medico.

Reforzar antes de produccion real:

1. Restringir CORS al dominio real del frontend.
2. Agregar rate limiting externo si el formulario sera publico.
3. Agregar CAPTCHA/Turnstile si hay exposicion abierta.
4. Definir politica de retencion de imagenes, Grad-CAM y PDF.
5. Revisar backups desde Dashboard Supabase.
6. Probar roles internos con JWT real.
7. Confirmar que `admin-upsert-ai-model` solo acepte admin activo.

## Pruebas negativas ya realizadas

Documentadas en fases anteriores:

| Prueba | Resultado |
|---|---|
| Consentimiento falso | HTTP 400 |
| Edad 130 | HTTP 400 |
| Cuestionario duplicado | HTTP 400 |
| Imagen mayor a 10 MB | HTTP 400 |
| `review-case` anonimo | HTTP 401 |
| `dashboard-metrics` anonimo | HTTP 401 |
| REST anonimo directo a tablas sensibles | Bloqueado / 404 |

## Lo que falta antes de frontend

No hay bloqueantes fuertes para empezar el frontend MVP.

Pendientes recomendados:

| Prioridad | Pendiente | Motivo |
|---|---|---|
| Alta | Agregar `reason_codes` a `get-case-result` | Alinear contrato Fase 17 |
| Alta | Probar `review-case` con especialista/admin real | Validar flujo interno |
| Alta | Probar `dashboard-metrics` con investigador/especialista/admin real | Validar dashboard interno |
| Media | Generar tipos TypeScript de Supabase | Reducir errores frontend |
| Media | Definir estrategia de almacenamiento de `case_token` en navegador | Seguridad y continuidad del flujo |
| Media | Restringir CORS | Necesario antes de publicar |
| Media | Decidir si la UI mostrara Grad-CAM | Ahora puede venir `null` |
| Baja | Revisar backups y retencion | Necesario para datos reales |

## Recomendaciones para frontend

1. Construir primero el flujo anonimo completo.
2. Usar solo Edge Functions.
3. Guardar `case_code` y `case_token` de forma temporal.
4. No registrar `case_token` en consola ni logs.
5. No mostrar rutas internas de Storage.
6. Ocultar Grad-CAM si `gradcam_image_url` es `null`.
7. Mostrar siempre `medical_disclaimer`.
8. No usar lenguaje diagnostico.
9. Mostrar estados claros:
   - consentimiento
   - cuestionario
   - subida de imagen
   - validacion tecnica
   - inferencia IA
   - recomendacion
   - reporte
10. Tratar errores de IA como error tecnico o reintento, no como resultado medico.

## Recomendaciones para backend durante frontend

1. Ajustar `get-case-result` para incluir `reason_codes`.
2. Crear `.env.example` del frontend con variables publicas.
3. Generar tipos TypeScript cuando se defina el stack frontend.
4. Crear pruebas de contrato frontend contra Edge Functions.
5. Mantener todas las llamadas publicas por Edge Functions.

## Limitaciones de esta revision

1. No se leyeron secrets directamente porque Supabase MCP no expone valores secretos.
2. No se verificaron backups del plan Supabase; eso debe revisarse en Dashboard.
3. No se ejecuto una nueva inferencia real en esta revision porque ya existen evidencias persistidas en Supabase.
4. No se probaron roles internos con JWT real en esta revision.
5. No se valida valor clinico del modelo; solo integracion tecnica.

## Veredicto final

Puedes pasar al frontend MVP/demo.

El backend esta en buen estado para conectar la aplicacion:

- crea casos;
- guarda cuestionario;
- maneja subida privada;
- valida imagen;
- llama IA externa;
- guarda inferencia;
- genera recomendacion;
- genera PDF;
- devuelve resultado con disclaimer.

Antes de produccion real, falta cerrar seguridad operativa, pruebas con roles internos, CORS, backups/retencion y validacion clinica del modelo.
