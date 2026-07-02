# OralDiagnostic - Plan frontend para conectar backend Supabase + IA

Fecha: 2026-07-02

Documentos usados como contexto:

- `docs/proyecto_por_fases.md`
- `docs/backend_supabase_por_fases.md`
- `docs/fase_14.md`
- `docs/fase_15.md`
- `docs/fase_16.md`
- `docs/fase_17.md`
- `docs/fase_18.md`
- `BACKEND_REVISION.md`

## Resumen

El backend Supabase y la IA ya estan listos para iniciar el frontend MVP/demo.

Lo que falta ahora esta principalmente en frontend:

- conectar la UI al flujo real de Supabase Edge Functions;
- dejar de llamar directamente al servicio IA desde el navegador;
- usar URLs firmadas para imagenes y reportes;
- guardar temporalmente `case_code` y `case_token`;
- mostrar resultado desde `get-case-result`;
- generar o descargar PDF desde Supabase, no desde PDF client-side;
- crear panel interno para especialista/dashboard si se quiere completar todo el MVP.

## Estado de fases segun `proyecto_por_fases.md`

| Fase | Nombre | Estado actual | Que falta |
|---|---|---|---|
| Fase 0 | Preparacion y definicion tecnica | Parcial | El repo existe, pero el frontend no esta como Next.js/PWA segun el documento base. |
| Fase 1 | Base de datos, seguridad y Storage | Hecha para backend remoto | Faltan pruebas con usuario admin real desde frontend. |
| Fase 2 | Frontend base y diseno PWA | Parcial | Falta PWA real, manifest, rutas, login interno y componentes conectados al backend. |
| Fase 3 | Registro de caso y cuestionario | Backend hecho, frontend pendiente | La UI debe llamar `create-case` y `submit-questionnaire`; hoy no lo hace. |
| Fase 4 | Captura, upload y validacion de imagen | Backend hecho, frontend pendiente | La UI debe usar `request-image-upload`, subir a URL firmada, `finalize-image-upload` y `validate-image`. |
| Fase 5 | Integracion IA y Grad-CAM | IA/backend hecho parcialmente | `run-inference` funciona; Grad-CAM queda pendiente porque la IA no devuelve `gradcam_base64`. Frontend debe llamar Supabase, no IA directa. |
| Fase 6 | Motor de recomendacion y resultado | Backend hecho, frontend pendiente | Frontend debe mostrar resultado de `get-case-result`, no generar recomendacion propia. |
| Fase 7 | Reporte PDF | Backend hecho, frontend pendiente | Frontend debe usar `generate-report` o URL firmada de Supabase, no PDF solo del navegador. |
| Fase 8 | Panel especialista y dashboard | Backend hecho, frontend pendiente | Faltan pantallas de login, revision especialista y dashboard. |
| Fase 9 | QA, endurecimiento y despliegue piloto | Parcial | Falta QA E2E real del frontend conectado, CORS, roles internos, deploy frontend. |

Conclusion:

```text
Backend e IA: listos para frontend MVP.
Frontend publico actual: existe visualmente, pero no esta conectado al backend real.
Frontend interno: pendiente.
PWA/Next.js segun documento base: pendiente.
```

## Estado del frontend actual

Archivos actuales:

```text
frontend/index.html
frontend/style.css
frontend/app.js
```

Observacion importante:

`frontend/index.html` tiene:

```html
<meta name="api-base" content="https://oraldiagnostic-ai.onrender.com" />
```

Y `frontend/app.js` llama directamente:

```js
fetch(`${API_BASE}/v1/inference/oral-lesion`, ...)
```

Eso no respeta el flujo backend final.

El frontend final no debe llamar directamente a la IA porque:

1. Expondria o forzaria manejar `AI_SERVICE_TOKEN` en cliente.
2. Se saltaria Supabase Storage privado.
3. Se saltaria auditoria.
4. Se saltaria `ai_inferences`.
5. Se saltaria `recommendations`.
6. Se saltaria `pdf_reports`.
7. Se saltaria `case_token`.

Regla:

```text
Frontend -> Supabase Edge Functions -> Supabase Storage/DB -> IA externa
```

No:

```text
Frontend -> IA externa
```

## Backend e IA que debe usar el frontend

### Supabase

```text
SUPABASE_URL=https://lsicnvutjvemohcxiwjk.supabase.co
SUPABASE_FUNCTIONS_URL=https://lsicnvutjvemohcxiwjk.functions.supabase.co
```

Clave publica:

```text
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La publishable key debe obtenerse desde:

```text
Supabase Dashboard -> Project Settings -> API -> Publishable key
```

Nunca poner en frontend:

```text
SUPABASE_SERVICE_ROLE_KEY
AI_SERVICE_TOKEN
CASE_TOKEN_SECRET
```

### IA

Servicio IA actual:

```text
https://guillermovr-oraldiagnostic-ai-service.hf.space
```

Health check:

```text
https://guillermovr-oraldiagnostic-ai-service.hf.space/health
```

El frontend no debe consumir este servicio directamente. Solo se usa para verificar que la IA esta despierta y disponible.

## Flujo publico que debe implementar el frontend

### Paso 1 - Crear caso

Endpoint:

```text
POST https://lsicnvutjvemohcxiwjk.functions.supabase.co/create-case
```

Payload esperado:

```json
{
  "consent": {
    "accepted": true,
    "consent_version": "mvp-v1"
  },
  "demographics": {
    "age_years": 35,
    "sex": "not_specified",
    "city": "Santa Cruz",
    "zone": "Urbana"
  },
  "case": {
    "lesion_site": "tongue",
    "lesion_duration_days": 21
  }
}
```

Guardar de la respuesta:

```text
case_id
case_code
case_token
status
```

El `case_token` debe guardarse temporalmente en el navegador. No debe imprimirse en consola ni enviarse a logs.

### Paso 2 - Enviar cuestionario

Endpoint:

```text
POST /submit-questionnaire
```

Payload:

```json
{
  "case_code": "OD-...",
  "case_token": "odct_...",
  "questionnaire": {
    "pain": false,
    "bleeding": true,
    "growth": true,
    "white_patch": false,
    "red_patch": true,
    "non_healing_ulcer": true,
    "lump_or_induration": false,
    "dysphagia": false,
    "tobacco_use": false,
    "alcohol_use": false,
    "coca_chewing": false,
    "coca_machucada": false,
    "bicarbonate_or_additives": false,
    "dental_prosthesis": false,
    "constant_friction": false,
    "notes": null
  }
}
```

### Paso 3 - Pedir URL firmada de subida

Endpoint:

```text
POST /request-image-upload
```

Payload:

```json
{
  "case_code": "OD-...",
  "case_token": "odct_...",
  "image": {
    "mime_type": "image/png",
    "size_bytes": 123456,
    "capture_source": "gallery"
  }
}
```

Guardar:

```text
image_id
upload_url
bucket_name
object_path
```

El frontend debe subir el archivo real con:

```text
PUT upload_url
Content-Type: image/png | image/jpeg | image/webp
Body: archivo binario
```

### Paso 4 - Finalizar subida

Endpoint:

```text
POST /finalize-image-upload
```

Payload:

```json
{
  "case_code": "OD-...",
  "case_token": "odct_...",
  "image_id": "uuid",
  "metadata": {
    "width_px": 800,
    "height_px": 600,
    "sha256_hash": "hash opcional de 64 caracteres"
  }
}
```

### Paso 5 - Validar imagen

Endpoint:

```text
POST /validate-image
```

Payload:

```json
{
  "case_code": "OD-...",
  "case_token": "odct_...",
  "image_id": "uuid"
}
```

Si responde:

```text
quality_status: accepted
```

continuar a IA.

Si responde:

```text
quality_status: rejected
```

pedir nueva captura.

### Paso 6 - Ejecutar IA

Endpoint:

```text
POST /run-inference
```

Payload:

```json
{
  "case_code": "OD-...",
  "case_token": "odct_...",
  "image_id": "uuid"
}
```

Resultado esperado:

```text
inference_id
prediction.suspicion_level
prediction.probability
prediction.class_probabilities
recommendation
next_step: generate_report
```

### Paso 7 - Generar PDF

Endpoint:

```text
POST /generate-report
```

Payload:

```json
{
  "case_code": "OD-...",
  "case_token": "odct_..."
}
```

Respuesta:

```text
report_id
download_url
expires_in_seconds
```

### Paso 8 - Obtener resultado final

Endpoint:

```text
POST /get-case-result
```

Payload:

```json
{
  "case_code": "OD-...",
  "case_token": "odct_..."
}
```

Respuesta esperada para UI:

```text
case_code
status
lesion_site
lesion_duration_days
result.suspicion_level
result.urgency_level
result.professional_referral
result.message
assets.original_image_url
assets.gradcam_image_url
assets.report_download_url
medical_disclaimer
```

Pendiente conocido:

```text
get-case-result aun no devuelve result.reason_codes.
```

## Estados que debe manejar la UI

```text
consent_accepted
questionnaire_completed
image_upload_requested
image_uploaded
image_rejected
quality_accepted
ai_failed
recommendation_ready
under_review
reported
reviewed
closed
failed
```

## Ajustes necesarios al frontend actual

### 1. Reemplazar llamada directa a IA

Quitar este enfoque:

```js
fetch(`${API_BASE}/v1/inference/oral-lesion`, ...)
```

Reemplazar por flujo Supabase:

```text
create-case
submit-questionnaire
request-image-upload
PUT upload_url
finalize-image-upload
validate-image
run-inference
generate-report
get-case-result
```

### 2. Cambiar configuracion

El frontend actual usa:

```html
<meta name="api-base" content="https://oraldiagnostic-ai.onrender.com" />
```

Debe cambiarse a configuracion de Supabase Functions:

```html
<meta name="supabase-functions-base" content="https://lsicnvutjvemohcxiwjk.functions.supabase.co" />
```

### 3. Agregar cliente para Edge Functions

Crear un helper:

```js
async function callEdgeFunction(name, payload) {
  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(body.error?.message || `Error en ${name}`);
  }
  return body.data;
}
```

### 4. Agregar manejo de sesion anonima de caso

Guardar temporalmente:

```js
const caseSession = {
  case_id,
  case_code,
  case_token,
  image_id,
  report_id
};
```

Recomendacion:

- `sessionStorage` para demo;
- no `localStorage` si se quiere minimizar persistencia;
- nunca imprimir `case_token` en consola.

### 5. Usar PDF real de Supabase

El frontend actual genera PDF client-side.

Para el flujo real:

- llamar `generate-report`;
- usar `download_url`;
- mostrar boton "Descargar PDF";
- abrir la URL firmada.

El PDF client-side puede quedar solo como fallback/demo, no como flujo principal.

### 6. Grad-CAM

Actualmente el frontend simula Grad-CAM si no llega.

Para el flujo real:

- si `assets.gradcam_image_url` existe, mostrarlo;
- si no existe, ocultar bloque Grad-CAM o mostrar "Grad-CAM no disponible";
- no simular Grad-CAM como si fuera real.

## Fases que faltan realmente

### Frontend publico

Pendiente:

1. Consentimiento real.
2. Datos anonimos.
3. Cuestionario conectado a `submit-questionnaire`.
4. Upload con URL firmada.
5. Validacion con `validate-image`.
6. IA con `run-inference`.
7. Resultado con `get-case-result`.
8. PDF real con `generate-report`.
9. Manejo de errores y estados.
10. Disclaimer medico constante.

### Frontend interno

Pendiente:

1. Login interno.
2. Panel especialista.
3. Lista de casos `under_review`.
4. Detalle del caso.
5. Revision con `review-case`.
6. Dashboard con `dashboard-metrics`.
7. Control de roles.

### PWA / estructura final

Pendiente si se sigue estrictamente `proyecto_por_fases.md`:

1. Migrar o reconstruir frontend con Next.js + TypeScript.
2. Crear manifest PWA.
3. Crear iconos.
4. Crear rutas.
5. Agregar validaciones con Zod.
6. Agregar estado global o React Query.
7. Generar tipos TypeScript desde Supabase.

Si se decide mantener frontend estatico:

- se puede avanzar mas rapido;
- pero no cumple completamente la arquitectura recomendada en `proyecto_por_fases.md`.

## Checklist para correr backend + IA antes de probar frontend

### 1. Verificar IA

Abrir:

```text
https://guillermovr-oraldiagnostic-ai-service.hf.space/health
```

Debe responder:

```json
{
  "service": "oraldiagnostic-ai-service",
  "status": "ok",
  "model_name": "oral-lesion-triage-cnn",
  "model_version": "1.0.0"
}
```

Si Hugging Face esta dormido, abrir `/health` y esperar que despierte.

### 2. Verificar Supabase

Edge Functions base:

```text
https://lsicnvutjvemohcxiwjk.functions.supabase.co
```

Health:

```text
https://lsicnvutjvemohcxiwjk.functions.supabase.co/health-check
```

### 3. Verificar secrets de Supabase

No se pueden leer desde frontend.

Deben existir en Supabase:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CASE_TOKEN_SECRET
AI_SERVICE_URL
AI_SERVICE_TOKEN
ALLOWED_ORIGINS
PDF_TEMPLATE_VERSION
```

Ya se verifico indirectamente que `AI_SERVICE_URL`, `AI_SERVICE_TOKEN` y `CASE_TOKEN_SECRET` funcionan porque el flujo completo persistio inferencias.

## Variables recomendadas para frontend

### Si es Vite

```text
VITE_SUPABASE_URL=https://lsicnvutjvemohcxiwjk.supabase.co
VITE_SUPABASE_FUNCTIONS_URL=https://lsicnvutjvemohcxiwjk.functions.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### Si es Next.js

```text
NEXT_PUBLIC_SUPABASE_URL=https://lsicnvutjvemohcxiwjk.supabase.co
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://lsicnvutjvemohcxiwjk.functions.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

### Si es frontend estatico actual

Se puede usar temporalmente:

```js
const FUNCTIONS_BASE = 'https://lsicnvutjvemohcxiwjk.functions.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_...';
```

## Orden recomendado de trabajo frontend

1. Crear `frontend/api.js` o helper equivalente para llamar Edge Functions.
2. Reemplazar llamada directa a IA por flujo Supabase.
3. Implementar pantalla/seccion de consentimiento.
4. Implementar datos anonimos requeridos.
5. Mapear cuestionario actual al contrato real de `submit-questionnaire`.
6. Implementar subida real con `request-image-upload`.
7. Calcular metadata de imagen para `finalize-image-upload`.
8. Llamar `validate-image`.
9. Llamar `run-inference`.
10. Llamar `generate-report`.
11. Llamar `get-case-result`.
12. Mostrar resultado preventivo y disclaimer.
13. Ocultar Grad-CAM si no existe URL real.
14. Crear panel interno despues del flujo publico.

## Decision final

Fases backend e IA: suficientemente completas para avanzar.

Fases frontend faltantes: Fase 2 a Fase 9 del MVP, principalmente del lado UI/conexion.

Prioridad inmediata:

```text
Conectar frontend publico actual a Supabase Edge Functions.
```

Despues:

```text
Crear panel interno, dashboard, PWA y QA E2E.
```
