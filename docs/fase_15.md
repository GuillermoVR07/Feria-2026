# OralDiagnostic - Contexto de implementacion Supabase Fase 15

Fecha: 2026-07-02

Proyecto Supabase: `OralDiagnostic`

Project ref: `lsicnvutjvemohcxiwjk`

## Resumen

Se ejecuto la Fase 15 del documento `docs/backend_supabase_por_fases.md`: despliegue y operacion.

Objetivo:

- Verificar el estado remoto de Supabase despues de conectar el servicio IA externo.
- Confirmar que funciones, modelo, Storage, RLS y logs quedan en condiciones de operacion.
- Documentar elementos que el MCP no puede verificar directamente.

## Subfase 15.1 - Ambientes

Estado usado en esta fase:

| Ambiente | Estado |
|---|---|
| Local | Repositorio en `C:\Feria-2026`. |
| Supabase remoto | Proyecto `lsicnvutjvemohcxiwjk`. |
| IA externa | Hugging Face Space `guillermovr-oraldiagnostic-ai-service`. |

Notas:

- La inferencia no corre dentro de Edge Functions.
- `run-inference` delega la inferencia al servicio Docker externo en Hugging Face.
- Supabase conserva datos, Storage, auditoria y orquestacion del flujo.

## Subfase 15.2 - Edge Functions desplegadas

Funciones activas verificadas con MCP:

| Funcion | Version | Estado |
|---|---:|---|
| `health-check` | 4 | ACTIVE |
| `create-case` | 5 | ACTIVE |
| `submit-questionnaire` | 4 | ACTIVE |
| `request-image-upload` | 3 | ACTIVE |
| `finalize-image-upload` | 4 | ACTIVE |
| `validate-image` | 3 | ACTIVE |
| `run-inference` | 6 | ACTIVE |
| `generate-report` | 3 | ACTIVE |
| `get-case-result` | 3 | ACTIVE |
| `create-signed-read-url` | 3 | ACTIVE |
| `review-case` | 3 | ACTIVE |
| `dashboard-metrics` | 3 | ACTIVE |
| `admin-upsert-ai-model` | 3 | ACTIVE |
| `cleanup-expired-case-tokens` | 3 | ACTIVE |

Observacion:

- Varias funciones tienen `verify_jwt: false` porque implementan autenticacion propia por `case_code + case_token` o validacion interna dentro de la funcion.
- `review-case` y `dashboard-metrics` rechazaron acceso anonimo sin JWT interno.

## Subfase 15.3 - Checklist antes de produccion

### 1. RLS activo en tablas

Verificado por SQL:

```text
profiles: true
case_subjects: true
cases: true
case_access_tokens: true
consent_records: true
risk_questionnaires: true
case_images: true
image_quality_checks: true
ai_models: true
ai_inferences: true
triage_rules: true
recommendations: true
pdf_reports: true
audit_logs: true
api_request_logs: true
storage.buckets: true
storage.objects: true
```

### 2. Buckets privados

Verificado por SQL:

| Bucket | Publico | Limite | MIME permitidos |
|---|---|---:|---|
| `case-originals` | false | 10485760 | `image/jpeg`, `image/png`, `image/webp` |
| `case-gradcam` | false | 10485760 | `image/png`, `image/jpeg`, `image/webp` |
| `case-reports` | false | 10485760 | `application/pdf` |

### 3. Service role no expuesto

Estado:

- No se encontro `SUPABASE_SERVICE_ROLE_KEY` en archivos de frontend durante la revision.
- Las funciones usan `SUPABASE_SERVICE_ROLE_KEY` solo dentro del entorno Supabase.
- Los logs revisados no contienen `service_role`.

### 4. Backups

Estado:

- No verificable desde el MCP usado en esta ejecucion.
- Debe revisarse manualmente en el Dashboard de Supabase segun el plan contratado.

### 5. Secrets definidos

Estado:

- No se pueden leer secrets desde el MCP.
- Se verifico indirectamente que `AI_SERVICE_URL` y `AI_SERVICE_TOKEN` funcionan porque `run-inference` llamo al servicio IA y persistio resultados.
- Se verifico indirectamente `CASE_TOKEN_SECRET` porque el flujo anonimo con `case_token` funciono en todas las funciones requeridas.

### 6. CORS

Estado:

- No se modifico CORS en esta fase.
- Recomendacion antes de produccion real: restringir `ALLOWED_ORIGINS` al dominio del frontend.

### 7. Logs sin datos sensibles

Verificado:

```text
suspicious_metadata_rows: 0
```

Patrones revisados:

- `case_token`
- `odct_`
- `service_role`
- `authorization`

### 8. Tokens temporales con expiracion

Verificado:

- `create-case` genera token temporal.
- El token se valida por hash.
- Los casos antiguos con token expirado no pudieron usarse para inferencia.

### 9. Pruebas de RLS realizadas

Verificado parcialmente:

- REST anonimo directo a tablas sensibles fue bloqueado.
- RLS activo en tablas publicas y Storage.

Pendiente para cierre total:

- Probar sesiones reales de roles internos: promotor, investigador, especialista y admin.

### 10. Pruebas de flujo completo realizadas

Verificado:

```text
create-case -> submit-questionnaire -> request-image-upload -> finalize-image-upload -> validate-image -> run-inference -> generate-report -> get-case-result
```

### 11. Disclaimer medico en API y PDF

Verificado:

- `get-case-result` devolvio `medical_disclaimer`.
- `generate-report` genero PDF con disclaimer.

### 12. Modelo IA registrado y versionado

Verificado:

```text
active_models: 1
name: oral-lesion-triage-cnn
version: 1.0.0
architecture: mobilenetv3-small
```

### 13. Dashboard solo agregado

Verificado:

- Existe `v_dashboard_metrics`.
- `dashboard-metrics` bloqueo acceso anonimo con HTTP 401.

### 14. Retencion de datos

Estado:

- No se modifico politica de retencion en esta fase.
- Debe definirse antes de trabajar con datos reales de pacientes.

## Resultado de Fase 15

Fase 15 completada a nivel operativo remoto.

Pendientes antes de produccion real:

- Confirmar backups en Dashboard Supabase.
- Restringir CORS al dominio real.
- Ejecutar pruebas con JWT reales de roles internos.
- Definir politica formal de retencion de imagenes y reportes.
