# OralDiagnostic - Contexto de implementacion Supabase Fase 6 a Fase 7

Fecha de corte: 2026-06-30  
Proyecto Supabase: `OralDiagnostic`  
Project ref: `lsicnvutjvemohcxiwjk`  
Base de datos: PostgreSQL 17.6  
Canal usado: MCP de Supabase como equivalente al SQL Editor remoto y deploy remoto de Edge Functions  

## Estado general

Se continuo el backend Supabase despues de las fases 0 a 5 documentadas en `docs/fase_0_al_5.md`.

El avance actual cubre:

- Fase 6 completa: base compartida para Edge Functions.
- Fase 7.1 completa: Edge Function `health-check`.
- Fase 7.2 completa, desplegada y validada: Edge Function `create-case`.
- Fase 7.3 completa, desplegada y validada: Edge Function `submit-questionnaire`.
- Fase 7.4 completa, desplegada y validada: Edge Function `request-image-upload`.
- Fase 7.5 completa, desplegada y validada: Edge Function `finalize-image-upload`.
- Fase 7.6 completa, desplegada y validada: Edge Function `validate-image`.
- Fase 7.7 implementada, desplegada y validada con fallo controlado: Edge Function `run-inference`.
- Fase 7.8 implementada, desplegada y validada con fallo controlado: Edge Function `generate-report`.
- Fase 7.9 completa, desplegada y validada para lectura controlada parcial: Edge Function `get-case-result`.
- Fase 7.10 completa, desplegada y validada: Edge Function `create-signed-read-url`.
- Fase 7.11 implementada, desplegada y validada en seguridad basica: Edge Function `review-case`.
- Fase 7.12 implementada, desplegada y validada en seguridad basica: Edge Function `dashboard-metrics`.
- Fase 7.13 implementada, desplegada y validada en seguridad basica: Edge Function `admin-upsert-ai-model`.
- Fase 7.14 implementada, desplegada y validada en seguridad basica: Edge Function `cleanup-expired-case-tokens`.

No se avanzo a Fase 8. Fase 7 ya quedo implementada completa a nivel de Edge Functions, con pruebas felices pendientes solo donde falta usuario interno con perfil activo.

Bloqueo real para ruta feliz completa de 7.7 a 7.8:

- `public.ai_models` no tiene ningun modelo activo.
- `run-inference` requiere un modelo con `is_active = true` segun el documento.
- No se creo un modelo ficticio porque eso corresponderia a configuracion real/administrativa y no debe inventarse.
- Hasta configurar modelo IA activo y `AI_SERVICE_URL`/`AI_SERVICE_TOKEN`, `run-inference` responde de forma controlada con `AI_SERVICE_UNAVAILABLE`.

Nota importante de Fase 7.4:

- El documento maestro pide que la URL firmada de subida expire en 5 minutos.
- Se valido por MCP en la documentacion oficial actual de Supabase que `createSignedUploadUrl` genera URLs firmadas de subida validas por 2 horas.
- El usuario eligio la opcion 1: usar `createSignedUploadUrl` nativo de Supabase y documentar la desviacion.
- Por eso `request-image-upload` devuelve `expires_in_seconds = 7200`.
- Esta decision evita inventar un mecanismo propio de firma fuera del documento y mantiene la subida mediante Storage privado y URL temporal.

## Decision de nomenclatura

Se decidio mantener los identificadores tecnicos de base de datos y contrato API en ingles, tal como aparecen en `docs/backend_supabase_por_fases.md`.

Ejemplos:

- `cases`
- `case_subjects`
- `case_images`
- `api_request_logs`
- `request_id`
- `case_token`
- `created_at`

Motivo:

- Evita romper el documento maestro.
- Evita inventar nombres fuera del documento.
- Mantiene compatibilidad con migraciones, RLS, Edge Functions, SDKs y contrato futuro de frontend.
- Reduce riesgo de errores en politicas, relaciones, indices y funciones.

Todo texto visible, mensajes API, comentarios de codigo nuevo, documentacion interna y errores nuevos deben mantenerse en espanol.

## Estado remoto validado por MCP

### Migraciones remotas

MCP reporto estas migraciones aplicadas:

- `20260630064501` - `0001_extensiones_enums`
- `20260630065027` - `0000_fase_0_preparacion_entorno`
- `20260630065350` - `0002_tablas_base`
- `20260630065649` - `0003_indices_constraints`
- `20260630070623` - `0004_rls_helpers_policies`
- `20260630071652` - `0005_storage_buckets_policies`

No se aplicaron nuevas migraciones SQL en Fase 6 ni en Fase 7.1 a Fase 7.9, porque estas subfases trabajan con Edge Functions y no definen DDL/DML de esquema.

### Edge Functions remotas

MCP reporto estas Edge Functions:

- `health-check`
  - Estado: `ACTIVE`
  - Version reportada por MCP despues de la ultima validacion: `2`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.1 indica `Auth: No`.

- `create-case`
  - Estado: `ACTIVE`
  - Version reportada por MCP despues de la ultima validacion: `2`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.2 indica `Auth: Opcional` y flujo publico controlado.

- `submit-questionnaire`
  - Estado: `ACTIVE`
  - Version reportada por MCP despues de la ultima validacion: `2`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.3 indica `Auth: Opcional con token de caso / Auth interno`.

- `request-image-upload`
  - Estado: `ACTIVE`
  - Version reportada por MCP: `1`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.4 indica `Auth: Opcional con token de caso / Auth interno`.
  - Seguridad: la funcion valida `case_token` contra `case_access_tokens` usando `CASE_TOKEN_SECRET`, o valida usuario interno activo mediante Auth.

- `finalize-image-upload`
  - Estado: `ACTIVE`
  - Version reportada por MCP: `2`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.5 usa el mismo acceso controlado por `case_code + case_token` o Auth interno.
  - Seguridad: verifica que el caso este en `image_upload_requested`, que la imagen pertenezca al caso y que el objeto exista en Storage privado antes de actualizar estado.

- `validate-image`
  - Estado: `ACTIVE`
  - Version reportada por MCP: `1`
  - `verify_jwt`: `false`
  - Motivo: acceso por `case_code + case_token` o Auth interno.

- `run-inference`
  - Estado: `ACTIVE`
  - Version reportada por MCP: `1`
  - `verify_jwt`: `false`
  - Motivo: acceso por `case_code + case_token` o Auth interno.
  - Estado funcional: desplegada; ruta feliz bloqueada hasta configurar modelo IA activo y servicio IA.

- `generate-report`
  - Estado: `ACTIVE`
  - Version reportada por MCP: `1`
  - `verify_jwt`: `false`
  - Motivo: acceso por `case_code + case_token` o Auth interno.
  - Estado funcional: desplegada; ruta feliz depende de que exista recomendacion preventiva generada por `run-inference`.

- `get-case-result`
  - Estado: `ACTIVE`
  - Version reportada por MCP: `1`
  - `verify_jwt`: `false`
  - Motivo: acceso por `case_code + case_token` o Auth interno.

## Archivos locales creados o modificados

### Fase 6

Se creo la carpeta:

```text
supabase/functions/_shared/
```

Archivos creados:

- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/errors.ts`
- `supabase/functions/_shared/response.ts`
- `supabase/functions/_shared/supabase-admin.ts`
- `supabase/functions/_shared/validation.ts`
- `supabase/functions/_shared/auth.ts`
- `supabase/functions/_shared/audit.ts`

### Fase 7.1

Archivo creado:

- `supabase/functions/health-check/index.ts`

### Fase 7.2

Archivo creado:

- `supabase/functions/create-case/index.ts`

### Fase 7.3

Archivo creado:

- `supabase/functions/submit-questionnaire/index.ts`

### Fase 7.4

Archivo creado:

- `supabase/functions/request-image-upload/index.ts`

### Fase 7.5

Archivos creados o modificados:

- `supabase/functions/finalize-image-upload/index.ts`
- `supabase/functions/_shared/validation.ts`

Nota:

- Se corrigio el helper local `isUuid` para validar UUID estandar con los cinco bloques separados por guiones.
- El primer deploy de `finalize-image-upload` incluia una version remota antigua del helper con regex incorrecta.
- Se redeployo `finalize-image-upload` como version `2` con la validacion UUID corregida.

### Fase 7.6 a 7.9

Archivos creados:

- `supabase/functions/validate-image/index.ts`
- `supabase/functions/run-inference/index.ts`
- `supabase/functions/generate-report/index.ts`
- `supabase/functions/get-case-result/index.ts`
- `supabase/functions/_shared/case-access.ts`

## Fase 6 - API backend con Edge Functions

### Objetivo de la fase

Preparar la base compartida para todas las Edge Functions del MVP.

### Implementado

#### `_shared/errors.ts`

Define:

- Tipo `ApiErrorCode`.
- Clase `ApiError`.
- Mensajes normalizados en espanol.
- Funcion `normalizeUnknownError`.

Codigos soportados:

- `METHOD_NOT_ALLOWED`
- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CASE_TOKEN_INVALID`
- `CASE_TOKEN_EXPIRED`
- `IMAGE_NOT_FOUND`
- `IMAGE_QUALITY_REJECTED`
- `AI_SERVICE_UNAVAILABLE`
- `AI_INFERENCE_FAILED`
- `REPORT_GENERATION_FAILED`
- `INTERNAL_ERROR`

Recomendacion:

- Mantener estos codigos como contrato estable.
- No agregar codigos nuevos sin revisar `docs/backend_supabase_por_fases.md`.

#### `_shared/cors.ts`

Define:

- `getAllowedOrigin(request)`
- `corsHeaders(request)`
- `optionsResponse(request)`

Usa `ALLOWED_ORIGINS` desde variables de entorno.

Comportamiento:

- Si `ALLOWED_ORIGINS` contiene `*`, responde `*`.
- Si el origen entrante esta permitido, responde ese origen.
- Si no hay configuracion, usa `*` como fallback.

Recomendacion:

- En produccion configurar `ALLOWED_ORIGINS` con dominios explicitos.
- Evitar `*` en produccion si el frontend final ya tiene dominio fijo.

#### `_shared/response.ts`

Define:

- `successResponse`
- `errorResponse`

Formato estandar de exito:

```json
{
  "success": true,
  "request_id": "uuid",
  "data": {},
  "message": "Operacion completada correctamente."
}
```

Formato estandar de error:

```json
{
  "success": false,
  "request_id": "uuid",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Los datos enviados no son validos.",
    "details": {}
  }
}
```

Nota:

- En el codigo remoto desplegado los textos estan con tildes correctas.
- En PowerShell algunos caracteres pueden verse como mojibake por codificacion de consola, pero el contenido desplegado por MCP conserva UTF-8.

#### `_shared/supabase-admin.ts`

Define:

- `createSupabaseAdminClient`

Usa:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Regla critica:

- Este archivo solo debe importarse en Edge Functions.
- Nunca debe importarse desde frontend.
- No exponer `service_role`.

#### `_shared/validation.ts`

Define:

- `parseJsonBody`
- `assertMethod`
- `isUuid`

Recomendacion:

- Reutilizar `parseJsonBody` y `assertMethod` en todas las funciones POST.
- Mantener validaciones estrictas y rechazar campos extra cuando se trate de datos sensibles.

#### `_shared/auth.ts`

Define:

- `getBearerToken`
- `getAuthenticatedUser`

Uso previsto:

- Funciones con autenticacion interna opcional u obligatoria.
- Validar Bearer token cuando se envia `Authorization`.

Recomendacion:

- No usar `user_metadata` para autorizacion.
- Validar perfiles internos en `public.profiles` cuando el usuario deba operar como admin, especialista, promotor o investigador.

#### `_shared/audit.ts`

Define:

- `logApiRequest`
- `logAuditEvent`

Tablas usadas:

- `api_request_logs`
- `audit_logs`

Reglas:

- No guardar IP cruda.
- No guardar user-agent crudo.
- No guardar datos sensibles en `metadata`.

### SQL aplicado en Fase 6

Ninguno.

### Verificaciones realizadas en Fase 6

- Se valido estructura local de archivos.
- Se valido por MCP que no habia Edge Functions al inicio.
- Se desplego luego `health-check` y `create-case` usando estos helpers.

### Riesgos o pendientes de Fase 6

- Deno ya fue instalado localmente y se pudo ejecutar `deno check` sobre las 14 Edge Functions de Fase 7.
- Supabase CLI no esta disponible localmente segun el estado previo, por lo que no se uso `supabase functions serve`.

### Recomendaciones de Fase 6

1. Usar Deno para validacion local:

```powershell
deno check supabase/functions/_shared/*.ts
```

2. Instalar Supabase CLI para flujo local completo:

```powershell
supabase --version
supabase functions serve
```

3. Configurar `ALLOWED_ORIGINS` antes de produccion.

4. Mantener `service_role` solo en Edge Functions.

## Fase 7.1 - Edge Function `health-check`

### Objetivo

Validar disponibilidad basica del backend.

### Contrato del documento

- Metodo: `GET`
- Auth: No
- Entrada: Ninguna
- Salida: estado del servicio

Respuesta esperada:

```json
{
  "success": true,
  "data": {
    "service": "oraldiagnostic-backend",
    "status": "ok",
    "environment": "production"
  }
}
```

### Implementado

Archivo:

- `supabase/functions/health-check/index.ts`

Comportamiento:

- Genera `request_id`.
- Responde `OPTIONS` con CORS.
- Acepta solo `GET`.
- Devuelve:
  - `service: oraldiagnostic-backend`
  - `status: ok`
  - `environment` desde `ENVIRONMENT` o `production` como fallback.
- Registra solicitud tecnica en `api_request_logs`.

### Deploy remoto

Se desplego con MCP:

- Nombre: `health-check`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

### SQL aplicado en Fase 7.1

Ninguno.

### Verificaciones realizadas en Fase 7.1

#### GET

Endpoint probado:

```text
https://lsicnvutjvemohcxiwjk.functions.supabase.co/health-check
```

Resultado:

- HTTP 200.
- `success: true`.
- `service: oraldiagnostic-backend`.
- `status: ok`.
- `environment: production`.

#### OPTIONS

Resultado:

- HTTP 204.
- Cabeceras CORS presentes.

#### POST

Resultado:

- HTTP 405.
- Codigo: `METHOD_NOT_ALLOWED`.
- Mensaje en espanol.

#### Logs

Se verifico que `api_request_logs` registro:

- `GET` con `status_code = 200`.
- `POST` con `status_code = 405`.

### Riesgos de Fase 7.1

- La funcion es publica porque el documento indica `Auth: No`.
- El riesgo es bajo porque no recibe payload ni expone datos sensibles.

### Recomendaciones de Fase 7.1

1. Mantenerla publica.
2. No agregar datos sensibles a la respuesta.
3. Usarla como prueba rapida de disponibilidad.
4. En produccion, revisar si se necesita rate limiting a nivel gateway o firewall.

## Fase 7.2 - Edge Function `create-case`

### Objetivo

Crear caso anonimo o autenticado con consentimiento y datos minimos.

### Contrato del documento

- Metodo: `POST`
- Auth: Opcional
- Publico: Si, controlado
- Crea:
  - `case_subjects`
  - `cases`
  - `consent_records`
  - `case_access_tokens`
  - `audit_logs`

Request esperado:

```json
{
  "consent": {
    "accepted": true,
    "consent_version": "2026-06-30-v1"
  },
  "demographics": {
    "age_years": 45,
    "sex": "female",
    "city": "Santa Cruz",
    "zone": "Zona norte"
  },
  "case": {
    "lesion_site": "tongue",
    "lesion_duration_days": 21
  }
}
```

Response esperado:

```json
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "case_id": "uuid",
    "case_code": "OD-20260630-A1B2C3D4",
    "case_token": "token_temporal_visible_una_sola_vez",
    "status": "consent_accepted",
    "next_step": "questionnaire"
  }
}
```

### Implementado

Archivo:

- `supabase/functions/create-case/index.ts`

Comportamiento implementado:

1. Genera `request_id`.
2. Responde `OPTIONS` con CORS.
3. Acepta solo `POST`.
4. Soporta autenticacion opcional:
   - Si no llega `Authorization`, crea caso anonimo.
   - Si llega `Authorization`, valida usuario con Supabase Auth.
   - Si llega usuario, exige perfil activo en `profiles`.
5. Valida payload estrictamente.
6. Rechaza campos extra en:
   - objeto principal,
   - `consent`,
   - `demographics`,
   - `case`.
7. Exige `consent.accepted = true`.
8. Valida `consent_version` entre 1 y 80 caracteres.
9. Valida `age_years` entre 0 y 120 si se envia.
10. Valida `sex` contra enum documentado:
    - `female`
    - `male`
    - `other`
    - `not_specified`
11. Valida `lesion_site` contra enum documentado:
    - `lip`
    - `tongue`
    - `gum`
    - `palate`
    - `floor_of_mouth`
    - `cheek_mucosa`
    - `other`
    - `not_specified`
12. Valida `lesion_duration_days` entre 0 y 3650.
13. Genera `case_code` con formato:
    - `OD-YYYYMMDD-XXXXXXXX`
14. Reintenta hasta 5 veces si hubiera colision de `case_code`.
15. Genera `case_token` temporal visible una sola vez.
16. Hashea token con SHA-256 usando `CASE_TOKEN_SECRET`.
17. Inserta `case_subjects`.
18. Inserta `cases`.
19. Inserta `consent_records`.
20. Inserta `case_access_tokens`.
21. Registra auditoria `CASE_CREATED`.
22. Registra solicitud tecnica en `api_request_logs`.
23. Hace limpieza compensatoria si falla despues de crear sujeto/caso:
    - borra `cases` si existe,
    - borra `case_subjects` si existe.

### Decision sobre `case_access_tokens.purpose`

El documento de Fase 7.2 no dice explicitamente que `purpose` usar para el token inicial, pero la tabla exige `case_token_purpose`.

Valores permitidos:

- `case_result_access`
- `image_upload`
- `report_download`

Decision aplicada:

- Se usa `case_result_access` para el token inicial de caso.

Motivo:

- Es el proposito documentado para acceso anonimo controlado al caso/resultado.
- Las subfases de imagen podran usar `image_upload` cuando implementen URLs firmadas de subida.
- No se invento ningun valor fuera del enum.

### Decision sobre expiracion del token

La tabla exige `expires_at`, pero la subfase no define duracion exacta.

Decision aplicada:

- `TOKEN_TTL_HOURS = 24`

Motivo:

- Es una ventana razonable para el MVP.
- Permite completar cuestionario y flujo inicial anonimo.
- Debe revisarse antes de produccion.

Recomendacion:

- Definir oficialmente la duracion del token por producto/seguridad.
- Posibles alternativas:
  - 2 horas para flujo muy estricto.
  - 24 horas para MVP y campanas.
  - 7 dias solo si el usuario necesitara volver despues, con controles adicionales.

### Deploy remoto

Se desplego con MCP:

- Nombre: `create-case`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

Motivo de `verify_jwt=false`:

- La funcion debe permitir usuario anonimo.
- Si se envia `Authorization`, la funcion valida internamente.

### SQL aplicado en Fase 7.2

Ninguno.

### Verificaciones realizadas en Fase 7.2

#### OPTIONS

Resultado:

- HTTP 204.
- CORS presente.

#### GET

Resultado:

- HTTP 405.
- Codigo: `METHOD_NOT_ALLOWED`.
- Mensaje en espanol.

#### POST con consentimiento falso

Payload con:

```json
{
  "consent": {
    "accepted": false
  }
}
```

Resultado:

- HTTP 400.
- Codigo: `VALIDATION_ERROR`.
- Mensaje: `El consentimiento debe estar aceptado.`

#### POST valido

Resultado actual:

- HTTP 500.
- Codigo: `INTERNAL_ERROR`.
- Mensaje: `Variable de entorno CASE_TOKEN_SECRET no configurada.`

Interpretacion:

- La funcion llego a la validacion de secreto antes de crear datos.
- No se crearon filas parciales.
- Este comportamiento es correcto desde seguridad: no se debe hashear token sin secreto.

#### Conteos remotos verificados

Despues de las pruebas iniciales:

- `case_subjects`: 0
- `cases`: 0
- `consent_records`: 0
- `case_access_tokens`: 0
- `audit_logs` con `CASE_CREATED`: 0
- `api_request_logs` de `create-case`: 4

### Verificacion adicional antes de intentar Fase 7.3

En 2026-06-30 se intento nuevamente la prueba feliz de `create-case` antes de avanzar a `submit-questionnaire`.

Resultado:

- HTTP 500.
- Codigo: `INTERNAL_ERROR`.
- Mensaje: `Variable de entorno CASE_TOKEN_SECRET no configurada.`

Conteos verificados por MCP despues del nuevo intento:

- `case_subjects`: 0
- `cases`: 0
- `consent_records`: 0
- `case_access_tokens`: 0
- `audit_logs` con `CASE_CREATED`: 0
- `api_request_logs` de `create-case`: 5

Conclusion historica de ese intento:

- La funcion fallaba antes de crear datos.
- No habia datos parciales que limpiar.
- No era seguro avanzar a Fase 7.3 hasta configurar `CASE_TOKEN_SECRET`.

### Bloqueo resuelto de Fase 7.2

El secreto remoto requerido era:

```text
CASE_TOKEN_SECRET
```

Este bloqueo ya fue resuelto por el usuario. Luego de configurarlo se validaron correctamente:

- `create-case`,
- `submit-questionnaire`,
- `request-image-upload`.

### Instrucciones usadas para desbloquear Fase 7.2

#### Opcion A: Supabase CLI

Ejecutar desde una terminal autenticada con Supabase CLI:

```powershell
supabase secrets set CASE_TOKEN_SECRET="valor-largo-aleatorio-de-al-menos-32-bytes" --project-ref lsicnvutjvemohcxiwjk
```

Recomendacion para generar valor:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Luego usar el valor generado:

```powershell
supabase secrets set CASE_TOKEN_SECRET="PEGAR_VALOR_GENERADO" --project-ref lsicnvutjvemohcxiwjk
```

#### Opcion B: Dashboard de Supabase

1. Abrir Supabase Dashboard.
2. Entrar al proyecto `OralDiagnostic`.
3. Ir a Edge Functions.
4. Ir a Secrets o Environment Variables.
5. Crear:

```text
CASE_TOKEN_SECRET=valor-largo-aleatorio
```

6. Guardar.
7. Volver a probar `create-case`.

### Prueba feliz ejecutada despues de configurar secreto

Ejecutar:

```powershell
$body = @{
  consent = @{
    accepted = $true
    consent_version = '2026-06-30-v1'
  }
  demographics = @{
    age_years = 45
    sex = 'female'
    city = 'Santa Cruz'
    zone = 'Zona norte'
  }
  case = @{
    lesion_site = 'tongue'
    lesion_duration_days = 21
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri https://lsicnvutjvemohcxiwjk.functions.supabase.co/create-case `
  -Method POST `
  -ContentType 'application/json; charset=utf-8' `
  -Body $body
```

Resultado esperado:

```json
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "case_id": "uuid",
    "case_code": "OD-20260630-XXXXXXXX",
    "case_token": "odct_...",
    "status": "consent_accepted",
    "next_step": "questionnaire"
  },
  "message": "Operacion completada correctamente."
}
```

Validar en SQL:

```sql
select id, case_code, status, lesion_site, lesion_duration_days, created_at
from public.cases
order by created_at desc
limit 5;
```

```sql
select c.case_code, t.purpose, t.expires_at, t.used_at, t.revoked_at, t.created_at
from public.case_access_tokens t
join public.cases c on c.id = t.case_id
order by t.created_at desc
limit 5;
```

```sql
select action, entity_type, case_id, metadata, created_at
from public.audit_logs
where action = 'CASE_CREATED'
order by created_at desc
limit 5;
```

```sql
select request_id, function_name, method, status_code, error_code, case_id, metadata, created_at
from public.api_request_logs
where function_name = 'create-case'
order by created_at desc
limit 10;
```

### Recomendaciones de Fase 7.2

1. No avanzar a `submit-questionnaire` hasta probar `create-case` exitosamente con `CASE_TOKEN_SECRET`.
2. Definir oficialmente duracion de `case_token`.
3. Definir si `case_result_access` sera token general del caso o solo para resultado.
4. Si el token inicial debe servir tambien para cuestionario e imagenes, documentarlo.
5. Si se requiere separacion estricta, crear tokens separados por proposito en subfases posteriores.
6. No registrar token plano en logs, auditoria ni metadata.
7. No guardar IP cruda ni user-agent crudo.
8. Considerar hash de IP/user-agent en una fase futura si se requiere auditoria mas fuerte.
9. Revisar si `clinical_disclaimer_acknowledged = true` debe depender de un campo explicito futuro o si aceptar consentimiento ya cubre ese alcance.

## Fase 7.3 - Edge Function `submit-questionnaire`

### Objetivo

Guardar el cuestionario del caso, calcular un `risk_score` orientativo y actualizar el estado operativo del caso.

### Contrato del documento

- Metodo: `POST`
- Auth: opcional con token de caso o autenticacion interna.
- Actualiza:
  - `risk_questionnaires`
  - `cases.status`

### Implementado

Archivo:

- `supabase/functions/submit-questionnaire/index.ts`

Comportamiento implementado:

1. Genera `request_id`.
2. Responde `OPTIONS` con CORS.
3. Acepta solo `POST`.
4. Valida payload estrictamente.
5. Rechaza campos extra en el objeto principal y en `questionnaire`.
6. Exige `case_code`.
7. Acepta `case_token` cuando el flujo es anonimo.
8. Permite `Authorization` para usuario interno activo.
9. Valida que exista el caso.
10. Valida que exista consentimiento aceptado.
11. Para flujo anonimo, valida `case_token` hasheado con `CASE_TOKEN_SECRET`.
12. Usa `purpose = 'case_result_access'` para el token inicial del caso.
13. Rechaza token invalido con `CASE_TOKEN_INVALID`.
14. Rechaza token vencido con `CASE_TOKEN_EXPIRED`.
15. Rechaza duplicado si ya existe cuestionario para `case_id`.
16. Inserta en `risk_questionnaires`.
17. Actualiza `cases.status = 'questionnaire_completed'`.
18. Registra auditoria `QUESTIONNAIRE_SUBMITTED`.
19. Registra solicitud tecnica en `api_request_logs`.

### Campos validados

Todos estos campos son obligatorios y deben ser booleanos:

- `pain`
- `bleeding`
- `growth`
- `white_patch`
- `red_patch`
- `non_healing_ulcer`
- `lump_or_induration`
- `dysphagia`
- `tobacco_use`
- `alcohol_use`
- `coca_chewing`
- `coca_machucada`
- `bicarbonate_or_additives`
- `dental_prosthesis`
- `constant_friction`

Campo opcional:

- `notes`: texto de maximo 1000 caracteres.

### Decision sobre `risk_score`

El documento exige calcular `risk_score` orientativo, no diagnostico, pero no fija formula exacta.

Decision aplicada:

Se usa una suma de pesos conservadora, limitada a 100.

Pesos actuales:

```text
pain: 5
bleeding: 8
growth: 8
white_patch: 8
red_patch: 8
non_healing_ulcer: 10
lump_or_induration: 8
dysphagia: 8
tobacco_use: 5
alcohol_use: 5
coca_chewing: 4
coca_machucada: 4
bicarbonate_or_additives: 3
dental_prosthesis: 3
constant_friction: 3
```

Con el ejemplo del documento:

- `pain = true`
- `growth = true`
- `red_patch = true`
- `non_healing_ulcer = true`
- `coca_chewing = true`

Resultado:

```text
5 + 8 + 8 + 10 + 4 = 35
```

Esto coincide con el `risk_score: 35.0` mostrado en el ejemplo de la subfase.

Recomendacion:

- Mantener esta formula como provisional MVP.
- Ajustarla formalmente en Fase 10 cuando se implemente el motor de recomendacion preventiva.
- No presentar `risk_score` como diagnostico ni como probabilidad clinica.

### Deploy remoto

Se desplego con MCP:

- Nombre: `submit-questionnaire`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

Motivo de `verify_jwt=false`:

- La funcion debe aceptar flujo anonimo con `case_code + case_token`.
- Si se envia `Authorization`, la funcion valida internamente al usuario y exige perfil activo.

### SQL aplicado en Fase 7.3

Ninguno.

### Verificaciones realizadas en Fase 7.3

#### OPTIONS

Resultado:

- HTTP 204.
- Cabeceras CORS presentes.

#### GET

Resultado:

- HTTP 405.
- Codigo: `METHOD_NOT_ALLOWED`.
- Mensaje en espanol.

#### POST con cuestionario incompleto

Se envio un payload con solo algunos campos booleanos.

Resultado:

- HTTP 400.
- Codigo: `VALIDATION_ERROR`.
- Mensaje: `El campo growth debe ser verdadero o falso.`

Interpretacion:

- La funcion exige todos los campos booleanos definidos por el documento.

#### POST con payload completo pero caso inexistente

Se envio payload completo con:

- `case_code = OD-20260630-PRUEBA00`
- `case_token = token_temporal`

Resultado:

- HTTP 404.
- Codigo: `NOT_FOUND`.
- Mensaje: `Caso inexistente o inaccesible.`

#### Conteos remotos verificados

Despues de las pruebas:

- `risk_questionnaires`: 0
- `audit_logs` con `QUESTIONNAIRE_SUBMITTED`: 0
- `api_request_logs` de `submit-questionnaire`: 3

Conclusion:

- La funcion esta desplegada.
- Las validaciones basicas funcionan.
- No se crearon cuestionarios sin caso real.
- En ese momento la prueba feliz quedo pendiente hasta que `create-case` pudiera crear un caso real con `CASE_TOKEN_SECRET`.
- Esa dependencia ya fue resuelta y luego se ejecuto prueba feliz completa.

### Prueba feliz ejecutada de Fase 7.3

Requisitos previos que ya se cumplieron:

1. Configurar `CASE_TOKEN_SECRET`.
2. Ejecutar prueba feliz de `create-case`.
3. Obtener `case_code` y `case_token` reales.

Comando usado como referencia:

```powershell
$body = @{
  case_code = 'PEGAR_CASE_CODE_REAL'
  case_token = 'PEGAR_CASE_TOKEN_REAL'
  questionnaire = @{
    pain = $true
    bleeding = $false
    growth = $true
    white_patch = $false
    red_patch = $true
    non_healing_ulcer = $true
    lump_or_induration = $false
    dysphagia = $false
    tobacco_use = $false
    alcohol_use = $false
    coca_chewing = $true
    coca_machucada = $false
    bicarbonate_or_additives = $false
    dental_prosthesis = $false
    constant_friction = $false
    notes = 'Lesion persistente observada por el usuario.'
  }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri https://lsicnvutjvemohcxiwjk.functions.supabase.co/submit-questionnaire `
  -Method POST `
  -ContentType 'application/json; charset=utf-8' `
  -Body $body
```

Resultado esperado:

```json
{
  "success": true,
  "request_id": "uuid",
  "data": {
    "case_id": "uuid",
    "status": "questionnaire_completed",
    "risk_score": 35,
    "next_step": "image_upload"
  },
  "message": "Operacion completada correctamente."
}
```

Validar en SQL:

```sql
select case_id, pain, growth, red_patch, non_healing_ulcer, coca_chewing, risk_score, created_at
from public.risk_questionnaires
order by created_at desc
limit 5;
```

```sql
select case_code, status, updated_at
from public.cases
order by updated_at desc
limit 5;
```

```sql
select action, entity_type, case_id, metadata, created_at
from public.audit_logs
where action = 'QUESTIONNAIRE_SUBMITTED'
order by created_at desc
limit 5;
```

```sql
select request_id, function_name, method, status_code, error_code, case_id, metadata, created_at
from public.api_request_logs
where function_name = 'submit-questionnaire'
order by created_at desc
limit 10;
```

### Recomendaciones de Fase 7.3

1. No permitir edicion anonima del cuestionario hasta definir reglas claras de upsert.
2. Mantener `risk_score` como valor orientativo interno.
3. Revisar formula de pesos en Fase 10.
4. Si se habilita edicion, implementar upsert controlado y auditoria diferenciada.
5. Mantener validacion estricta de campos para evitar payloads sensibles o inesperados.

## Fase 7.4 - `request-image-upload`

### Objetivo

Crear metadata preliminar de imagen y devolver una URL firmada temporal para que el frontend pueda subir una imagen al bucket privado `case-originals` sin insertar directamente en tablas sensibles ni usar `service_role`.

### Archivo creado

- `supabase/functions/request-image-upload/index.ts`

### Despliegue remoto

MCP de Supabase reporto:

```json
{
  "slug": "request-image-upload",
  "version": 1,
  "status": "ACTIVE",
  "verify_jwt": false
}
```

`verify_jwt` queda en `false` porque la funcion implementa autenticacion propia:

- token temporal de caso (`case_token`) validado contra hash en `case_access_tokens`,
- o Auth interno con usuario existente y perfil activo en `profiles`.

### Request soportado

```json
{
  "case_code": "OD-20260630-A1B2C3D4",
  "case_token": "token_temporal",
  "image": {
    "mime_type": "image/jpeg",
    "size_bytes": 2480000,
    "capture_source": "camera"
  }
}
```

### Response implementado

```json
{
  "success": true,
  "data": {
    "image_id": "uuid",
    "bucket_name": "case-originals",
    "object_path": "OD-20260630-A1B2C3D4/uuid.jpg",
    "upload_url": "signed-upload-url",
    "expires_in_seconds": 7200,
    "next_step": "finalize_image_upload"
  }
}
```

### Decision sobre expiracion de URL firmada

El documento maestro indica 5 minutos (`300` segundos). Antes de implementar, se consulto la documentacion actual de Supabase mediante MCP:

- API usada: `storage.from(bucket).createSignedUploadUrl(path)`.
- Documentacion oficial consultada: JavaScript Reference `file-buckets-createsigneduploadurl`.
- Resultado: Supabase indica que las signed upload URLs son validas por 2 horas.

Decision aplicada por instruccion del usuario:

- Usar `createSignedUploadUrl` nativo de Supabase.
- Documentar la desviacion.
- Devolver `expires_in_seconds = 7200` para no dar informacion falsa al frontend.

Riesgo aceptado:

- La ventana temporal es mayor que la deseada originalmente.
- Se mitiga usando paths UUID, bucket privado, metadata previa controlada por Edge Function y sin politicas amplias sobre `storage.objects`.

Recomendacion futura:

- Si se exige estrictamente una ventana de 5 minutos, evaluar una capa propia de control en `finalize-image-upload` que rechace metadata antigua, o un flujo alternativo de subida proxy/backend. No cambiarlo sin decision explicita porque aumentaria complejidad y costo.

### Validaciones implementadas

Payload principal:

- Solo permite `case_code`, `case_token`, `image`.
- Rechaza campos extra.
- `case_code` debe ser texto no vacio de maximo 80 caracteres.
- `case_token` debe ser texto si se envia.

Imagen:

- `mime_type` permitido:
  - `image/jpeg`,
  - `image/png`,
  - `image/webp`.
- `size_bytes` entero entre `1` y `10485760`.
- `capture_source` permitido:
  - `camera`,
  - `gallery`.
- Extension generada:
  - `image/jpeg` -> `.jpg`,
  - `image/png` -> `.png`,
  - `image/webp` -> `.webp`.

Acceso:

- Verifica que el caso exista por `case_code`.
- Verifica consentimiento aceptado en `consent_records`.
- Permite estados:
  - `questionnaire_completed`,
  - `image_rejected`.
- Si hay Authorization, valida usuario por Supabase Auth y perfil activo.
- Si no hay Authorization, exige `case_token`.
- El token se hashea con `CASE_TOKEN_SECRET` usando SHA-256 y se compara contra `case_access_tokens.token_hash`.
- Verifica `purpose = 'case_result_access'`.
- Rechaza token revocado o expirado.

### Escrituras realizadas por la funcion

En prueba feliz:

1. Inserta una fila en `case_images` con:
   - `id`,
   - `case_id`,
   - `image_kind = 'original'`,
   - `capture_source`,
   - `bucket_name = 'case-originals'`,
   - `object_path`,
   - `mime_type`,
   - `size_bytes`,
   - `uploaded_by` si aplica.

2. Genera URL firmada de subida con:

```ts
adminClient.storage.from('case-originals').createSignedUploadUrl(objectPath)
```

3. Actualiza `cases.status` a:

```text
image_upload_requested
```

4. Registra auditoria:

```text
IMAGE_UPLOAD_REQUESTED
```

5. Registra log tecnico en `api_request_logs` con:

```text
function_name = request-image-upload
status_code = 200
metadata.alcance = solicitud_subida_imagen
```

### SQL aplicado

No se aplico SQL.

Motivo:

- La subfase 7.4 solo agrega una Edge Function.
- No define tablas, columnas, indices, RLS, policies, buckets ni enums nuevos.
- Por eso no se creo migracion SQL en `supabase/migrations`.

### Verificacion HTTP realizada

Se ejecuto una prueba completa como flujo anonimo de frontend:

1. `POST /functions/v1/create-case`
2. `POST /functions/v1/submit-questionnaire`
3. `POST /functions/v1/request-image-upload`

Resultado saneado:

```json
{
  "create_success": true,
  "submit_success": true,
  "upload_success": true,
  "case_id": "52adea12-77c5-4206-9809-5f55ec2f5b1e",
  "case_code": "OD-20260630-37C5F94F",
  "risk_score": 35,
  "image_id": "72f97637-b12d-49ec-abbf-aba76aade177",
  "bucket_name": "case-originals",
  "object_path": "OD-20260630-37C5F94F/72f97637-b12d-49ec-abbf-aba76aade177.jpg",
  "expires_in_seconds": 7200,
  "upload_url_present": true,
  "next_step": "finalize_image_upload"
}
```

Nota:

- El `case_token` no se documento ni se expuso en este archivo.
- Solo se uso durante la prueba HTTP.

### Verificacion remota por MCP

Caso, cuestionario e imagen:

```sql
select
  c.id as case_id,
  c.case_code,
  c.status,
  rq.risk_score,
  ci.id as image_id,
  ci.bucket_name,
  ci.object_path,
  ci.mime_type,
  ci.size_bytes,
  ci.capture_source,
  ci.created_at
from public.cases c
left join public.risk_questionnaires rq on rq.case_id = c.id
left join public.case_images ci on ci.case_id = c.id
where c.id = '52adea12-77c5-4206-9809-5f55ec2f5b1e';
```

Resultado validado:

- `cases.status = image_upload_requested`
- `risk_score = 35.00`
- `case_images.id = 72f97637-b12d-49ec-abbf-aba76aade177`
- `bucket_name = case-originals`
- `object_path = OD-20260630-37C5F94F/72f97637-b12d-49ec-abbf-aba76aade177.jpg`
- `mime_type = image/jpeg`
- `size_bytes = 2480000`
- `capture_source = camera`

Auditoria:

```sql
select action, entity_type, entity_id, case_id, metadata->>'case_code' as case_code,
       metadata->>'signed_upload_url_expires_in_seconds' as expires_in_seconds
from public.audit_logs
where case_id = '52adea12-77c5-4206-9809-5f55ec2f5b1e'
order by created_at desc
limit 5;
```

Resultado validado:

- `IMAGE_UPLOAD_REQUESTED`
- `entity_type = case_images`
- `expires_in_seconds = 7200`
- Tambien existen `QUESTIONNAIRE_SUBMITTED` y `CASE_CREATED` para el mismo caso.

Logs API:

```sql
select function_name, status_code, error_code, case_id, metadata
from public.api_request_logs
where case_id = '52adea12-77c5-4206-9809-5f55ec2f5b1e'
order by created_at desc
limit 5;
```

Resultado validado:

- `request-image-upload`: `status_code = 200`, `error_code = null`.
- `submit-questionnaire`: `status_code = 200`, `error_code = null`.
- `create-case`: `status_code = 200`, `error_code = null`.

Storage:

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;
```

Resultado validado:

- `case-gradcam`: privado, maximo 10 MB, MIME `image/png`, `image/jpeg`, `image/webp`.
- `case-originals`: privado, maximo 10 MB, MIME `image/jpeg`, `image/png`, `image/webp`.
- `case-reports`: privado, maximo 10 MB, MIME `application/pdf`.
- `case-thumbnails`: privado, maximo 2 MB, MIME `image/webp`, `image/jpeg`, `image/png`.

Objeto no subido todavia:

```sql
select count(*)::int as objetos_creados
from storage.objects
where bucket_id = 'case-originals'
  and name = 'OD-20260630-37C5F94F/72f97637-b12d-49ec-abbf-aba76aade177.jpg';
```

Resultado validado:

- `objetos_creados = 0`

Esto es correcto porque Fase 7.4 solo solicita URL de subida. La carga real y verificacion del objeto corresponde a Fase 7.5 `finalize-image-upload`.

### Riesgos de Fase 7.4

1. La URL firmada de subida vive 2 horas por comportamiento nativo de Supabase, no 5 minutos.
2. `object_path` se devuelve porque el contrato de la subfase lo exige; no debe usarse como URL publica.
3. La metadata de `case_images` queda creada antes de que el archivo exista. Fase 7.5 debe validar existencia real del objeto en Storage.
4. Si el usuario pide varias URLs antes de subir, pueden quedar filas preliminares sin objeto. Debe tratarse en limpieza o en Fase 7.5.
5. No hay politicas amplias sobre `storage.objects`; esto es intencional y debe mantenerse.

### Pruebas recomendadas para Fase 7.4

1. Payload sin `case_token` y sin Authorization debe devolver `UNAUTHORIZED`.
2. Token invalido debe devolver `CASE_TOKEN_INVALID`.
3. Token expirado debe devolver `CASE_TOKEN_EXPIRED`.
4. MIME no permitido debe devolver `VALIDATION_ERROR`.
5. Tamaño mayor a 10 MB debe devolver `VALIDATION_ERROR`.
6. Caso en estado distinto a `questionnaire_completed` o `image_rejected` debe devolver `VALIDATION_ERROR`.
7. Usuario interno con perfil inactivo debe devolver `FORBIDDEN`.
8. Confirmar que el frontend sube con la URL firmada y que Fase 7.5 valida el objeto.

### Prueba negativa adicional ejecutada

Se creo un caso de prueba, se completo su cuestionario y luego se llamo `request-image-upload` sin `case_token` ni Authorization.

Resultado validado:

```json
{
  "status_code": 401,
  "error_code": "UNAUTHORIZED",
  "message": "Falta token temporal valido."
}
```

Esto confirma que el frontend anonimo no puede pedir URL firmada de subida sin token temporal de caso.

## Fase 7.5 - `finalize-image-upload`

### Objetivo

Confirmar que el archivo fue subido al bucket privado `case-originals`, completar metadata tecnica de la imagen y cambiar el estado operativo del caso a `image_uploaded`.

### Archivo creado

- `supabase/functions/finalize-image-upload/index.ts`

### Archivo compartido modificado

- `supabase/functions/_shared/validation.ts`

Cambio aplicado:

```ts
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
```

Motivo:

- La expresion regular remota usada en el primer deploy de `finalize-image-upload` no aceptaba UUID estandar porque faltaba un guion antes del ultimo bloque.
- Esto causaba `VALIDATION_ERROR` con `El identificador de imagen no es valido.` para IDs validos.
- Se corrigio localmente y se redeployo la funcion como version `2`.

### Despliegue remoto

MCP de Supabase reporto:

```json
{
  "slug": "finalize-image-upload",
  "version": 2,
  "status": "ACTIVE",
  "verify_jwt": false
}
```

`verify_jwt` queda en `false` porque la funcion implementa autenticacion propia:

- token temporal de caso (`case_token`) validado contra hash en `case_access_tokens`,
- o Auth interno con usuario existente y perfil activo en `profiles`.

### Request soportado

```json
{
  "case_code": "OD-20260630-A1B2C3D4",
  "case_token": "token_temporal",
  "image_id": "uuid",
  "metadata": {
    "width_px": 1280,
    "height_px": 960,
    "sha256_hash": "hash_sha256_64_caracteres"
  }
}
```

### Response implementado

```json
{
  "success": true,
  "data": {
    "image_id": "uuid",
    "status": "image_uploaded",
    "next_step": "validate_image"
  }
}
```

### Validaciones implementadas

Payload principal:

- Solo permite `case_code`, `case_token`, `image_id`, `metadata`.
- Rechaza campos extra.
- `case_code` debe ser texto no vacio de maximo 80 caracteres.
- `case_token` debe ser texto si se envia.
- `image_id` debe ser UUID valido.
- `metadata` debe ser objeto.

Metadata:

- Solo permite `width_px`, `height_px`, `sha256_hash`.
- `width_px` y `height_px` son opcionales, pero si se envian deben ser enteros positivos entre `1` y `50000`.
- `sha256_hash` es opcional, pero si se envia debe ser hexadecimal SHA-256 de 64 caracteres.
- El hash se normaliza a minusculas.

Acceso:

- Verifica que el caso exista por `case_code`.
- Exige `cases.status = image_upload_requested`.
- Si hay Authorization, valida usuario por Supabase Auth y perfil activo.
- Si no hay Authorization, exige `case_token`.
- El token se hashea con `CASE_TOKEN_SECRET` usando SHA-256 y se compara contra `case_access_tokens.token_hash`.
- Verifica `purpose = 'case_result_access'`.
- Rechaza token revocado o expirado.

Imagen y Storage:

- Verifica que `case_images.id = image_id`.
- Verifica que la imagen pertenezca al caso.
- Verifica que `image_kind = original`.
- Verifica que el objeto exista en Storage privado usando `bucket_name` y `object_path`.
- No usa URL publica ni expone `service_role` fuera de la Edge Function.

### Escrituras realizadas por la funcion

En prueba feliz:

1. Actualiza `case_images`:
   - `width_px`,
   - `height_px`,
   - `sha256_hash`.

2. Actualiza `cases.status` a:

```text
image_uploaded
```

3. Registra auditoria:

```text
IMAGE_UPLOAD_FINALIZED
```

4. Registra log tecnico en `api_request_logs` con:

```text
function_name = finalize-image-upload
status_code = 200
metadata.alcance = finalizacion_subida_imagen
```

### SQL aplicado

No se aplico SQL.

Motivo:

- La subfase 7.5 solo agrega una Edge Function y corrige un helper TypeScript compartido.
- No define tablas, columnas, indices, RLS, policies, buckets ni enums nuevos.
- Por eso no se creo migracion SQL en `supabase/migrations`.

### Verificacion HTTP realizada

Se ejecuto una prueba completa como flujo anonimo de frontend:

1. `POST /functions/v1/create-case`
2. `POST /functions/v1/submit-questionnaire`
3. `POST /functions/v1/request-image-upload`
4. Subida real de PNG minimo mediante `upload_url` firmada.
5. `POST /functions/v1/finalize-image-upload`

Resultado saneado:

```json
{
  "create_success": true,
  "submit_success": true,
  "upload_request_success": true,
  "signed_upload_http_status": 200,
  "finalize_success": true,
  "finalize_status": "image_uploaded",
  "next_step": "validate_image",
  "case_id": "2b72e8d0-46f7-4a34-b58b-e6e4253731b6",
  "case_code": "OD-20260630-8E5615F0",
  "image_id": "3a77984e-d397-4362-896e-cf20a5053eb6",
  "object_path": "OD-20260630-8E5615F0/3a77984e-d397-4362-896e-cf20a5053eb6.png",
  "sha256_hash": "4b5c5c92cec3b23e6a294fc0eea43234ef5126c5a64f4c6c531ac8430ab0b844"
}
```

Nota:

- El `case_token` no se documento ni se expuso en este archivo.
- Solo se uso durante la prueba HTTP.
- La imagen de prueba fue un PNG minimo de 68 bytes, suficiente para verificar Storage y flujo de estado.

### Verificacion remota por MCP

Caso e imagen:

```sql
select c.id as case_id, c.case_code, c.status,
       ci.id as image_id, ci.bucket_name, ci.object_path,
       ci.width_px, ci.height_px, ci.sha256_hash
from public.cases c
join public.case_images ci on ci.case_id = c.id
where c.id = '2b72e8d0-46f7-4a34-b58b-e6e4253731b6';
```

Resultado validado:

- `cases.status = image_uploaded`
- `width_px = 1`
- `height_px = 1`
- `sha256_hash = 4b5c5c92cec3b23e6a294fc0eea43234ef5126c5a64f4c6c531ac8430ab0b844`

Objeto en Storage:

```sql
select bucket_id, name, metadata->>'mimetype' as mimetype,
       (metadata->>'size')::int as size_bytes
from storage.objects
where bucket_id = 'case-originals'
  and name = 'OD-20260630-8E5615F0/3a77984e-d397-4362-896e-cf20a5053eb6.png';
```

Resultado validado:

- `bucket_id = case-originals`
- `mimetype = image/png`
- `size_bytes = 68`

Auditoria:

```sql
select action, entity_type, entity_id, metadata->>'case_code' as case_code,
       metadata->>'estado_nuevo' as estado_nuevo,
       metadata->>'sha256_hash_present' as sha256_hash_present
from public.audit_logs
where case_id = '2b72e8d0-46f7-4a34-b58b-e6e4253731b6'
order by created_at desc
limit 5;
```

Resultado validado:

- `IMAGE_UPLOAD_FINALIZED`
- `entity_type = case_images`
- `estado_nuevo = image_uploaded`
- `sha256_hash_present = true`

Logs API:

```sql
select function_name, status_code, error_code, case_id, metadata
from public.api_request_logs
where case_id = '2b72e8d0-46f7-4a34-b58b-e6e4253731b6'
order by created_at desc
limit 6;
```

Resultado validado:

- `finalize-image-upload`: `status_code = 200`, `error_code = null`.
- `request-image-upload`: `status_code = 200`, `error_code = null`.
- `submit-questionnaire`: `status_code = 200`, `error_code = null`.
- `create-case`: `status_code = 200`, `error_code = null`.

### Riesgos de Fase 7.5

1. `width_px`, `height_px` y `sha256_hash` vienen desde el cliente; la funcion solo valida formato. Si se requiere verificacion fuerte, Fase 7.6 o una funcion backend debe recalcularlos.
2. La existencia del objeto si se valida directamente contra Storage privado.
3. La funcion permite metadata parcial porque el documento dice completar metadata si esta disponible.
4. No se marca `case_access_tokens.used_at`; no estaba indicado en la subfase y cambiarlo podria afectar el flujo anonimo posterior.
5. El objeto subido queda en Storage durante pruebas; para limpieza futura se debe usar una subfase de mantenimiento o proceso controlado.

### Pruebas recomendadas para Fase 7.5

1. Llamar sin subir archivo debe devolver `IMAGE_NOT_FOUND`.
2. Llamar sin `case_token` ni Authorization debe devolver `UNAUTHORIZED`.
3. Llamar con `image_id` de otro caso debe devolver `IMAGE_NOT_FOUND`.
4. Llamar con `sha256_hash` no hexadecimal o de longitud incorrecta debe devolver `VALIDATION_ERROR`.
5. Llamar con estado distinto a `image_upload_requested` debe devolver `VALIDATION_ERROR`.
6. Confirmar que Fase 7.6 valide resolucion minima y calidad antes de cualquier inferencia IA.

## Fase 7.6 - `validate-image`

### Objetivo

Validar calidad tecnica minima de imagen antes de IA.

### Archivo creado

- `supabase/functions/validate-image/index.ts`

### Implementado

- Metodo `POST`.
- Acceso por `case_code + case_token` o Auth interno.
- Requiere `cases.status = image_uploaded`.
- Verifica que `image_id` pertenezca al caso y que `image_kind = original`.
- Valida formato `image/jpeg`, `image/png`, `image/webp`.
- Valida resolucion minima recomendada `640x480`.
- Crea registro en `image_quality_checks`.
- Actualiza caso a:
  - `quality_accepted` si pasa.
  - `image_rejected` si falla.
- Registra auditoria `IMAGE_QUALITY_CHECKED`.
- Registra `api_request_logs`.

### Limitacion tecnica documentada

La funcion no recalcula nitidez, brillo ni contraste desde pixeles reales. Usa una validacion tecnica MVP basada en metadata persistida:

- resolucion,
- MIME,
- tamano del archivo.

Los scores se generan de forma deterministica para mantener el contrato de respuesta, pero antes de produccion se recomienda reemplazar esta validacion por procesamiento real de imagen o servicio especializado.

### Validacion realizada

Flujo probado:

1. `create-case`
2. `submit-questionnaire`
3. `request-image-upload`
4. subida real por URL firmada
5. `finalize-image-upload` con metadata `640x480`
6. `validate-image`

Resultado saneado:

```json
{
  "validate_success": true,
  "quality_status": "accepted",
  "validate_next_step": "run_inference"
}
```

MCP valido:

- `cases.status = quality_accepted`
- `image_quality_checks.status = accepted`
- `resolution_ok = true`
- `focus_ok = true`
- `illumination_ok = true`
- auditoria `IMAGE_QUALITY_CHECKED`
- log `validate-image` con `status_code = 200`

## Fase 7.7 - `run-inference`

### Objetivo

Orquestar inferencia IA, persistir resultado, crear recomendacion preventiva y actualizar el caso.

### Archivo creado

- `supabase/functions/run-inference/index.ts`

### Implementado

- Metodo `POST`.
- Acceso por `case_code + case_token` o Auth interno.
- Requiere `cases.status = quality_accepted`.
- Verifica que la imagen original pertenezca al caso.
- Verifica que la ultima calidad de imagen sea `accepted`.
- Busca modelo activo en `ai_models` con `is_active = true`.
- Crea URL firmada temporal para la imagen original.
- Registra auditoria `AI_INFERENCE_STARTED` antes de llamar al servicio.
- Llama a `AI_SERVICE_URL + /v1/inference/oral-lesion` usando `AI_SERVICE_TOKEN`.
- Valida respuesta IA esperada:
  - `suspicion_level`,
  - `probability`,
  - `class_probabilities`,
  - Grad-CAM opcional.
- Si hay Grad-CAM, lo guarda en bucket privado `case-gradcam` y crea `case_images` tipo `gradcam`.
- Crea `ai_inferences`.
- Crea `recommendations`.
- Actualiza:
  - `cases.final_suspicion_level`,
  - `cases.final_urgency_level`,
  - `cases.final_recommendation`,
  - `cases.status`.
- Registra auditoria `AI_INFERENCE_COMPLETED`.

### Estado validado

MCP confirmo que `public.ai_models` no tiene modelos activos.

Validacion HTTP realizada contra caso con `quality_accepted`:

```json
{
  "run_status_code": 503,
  "run_error_code": "AI_SERVICE_UNAVAILABLE"
}
```

Esto es correcto mientras no exista modelo IA activo. No se invento ni inserto un modelo ficticio.

### Pendiente para ruta feliz de Fase 7.7

1. Crear o registrar un modelo en `ai_models`.
2. Marcarlo con `is_active = true`.
3. Configurar `AI_SERVICE_URL`.
4. Configurar `AI_SERVICE_TOKEN`.
5. Asegurar que el servicio IA responda con el contrato esperado.

## Fase 7.8 - `generate-report`

### Objetivo

Generar PDF privado de orientacion/derivacion preventiva y devolver URL firmada temporal.

### Archivo creado

- `supabase/functions/generate-report/index.ts`

### Implementado

- Metodo `POST`.
- Acceso por `case_code + case_token` o Auth interno.
- Requiere estado `recommendation_ready`, `under_review` o `reported`.
- Requiere una recomendacion existente en `recommendations`.
- Genera PDF minimo con:
  - nombre del sistema,
  - codigo anonimo,
  - fecha,
  - datos demograficos generales,
  - zona bucal,
  - tiempo de evolucion,
  - calidad/inferencia/recomendacion cuando existe,
  - advertencia medica obligatoria.
- Guarda PDF en bucket privado `case-reports`.
- Crea fila en `pdf_reports`.
- Actualiza `cases.status = reported`.
- Devuelve `download_url` firmada por 900 segundos.
- Registra auditoria `REPORT_GENERATED`.

### Estado validado

Como `run-inference` no pudo crear recomendacion por falta de modelo IA activo, `generate-report` fue validada con fallo controlado:

```json
{
  "report_status_code": 400,
  "report_error_code": "VALIDATION_ERROR"
}
```

Motivo esperado:

- El caso no tiene recomendacion preventiva lista para reporte.

## Fase 7.9 - `get-case-result`

### Objetivo

Permitir que el usuario vea su resultado de forma controlada.

### Archivo creado

- `supabase/functions/get-case-result/index.ts`

### Implementado

- Metodo `POST`.
- Acceso por `case_code + case_token` o Auth interno.
- Devuelve:
  - `case_code`,
  - `status`,
  - `lesion_site`,
  - `lesion_duration_days`,
  - resultado preventivo si existe,
  - URLs firmadas de assets disponibles,
  - advertencia medica.
- No devuelve `bucket_name`.
- No devuelve `object_path`.
- URLs firmadas expiran en 900 segundos.

### Validacion realizada

Con el caso de prueba en `quality_accepted` y sin recomendacion todavia:

```json
{
  "result_status_code": 200,
  "result_success": true,
  "result_case_status": "quality_accepted",
  "original_url_present": true,
  "report_url_present": false
}
```

Esto confirma:

- acceso controlado funcionando,
- URL firmada de imagen original funcionando,
- no se expone ruta interna,
- resultado preventivo queda como no disponible hasta completar inferencia IA.

Validacion adicional realizada el 2026-06-30:

```json
{
  "create_success": true,
  "result_success": true,
  "result_status": "consent_accepted",
  "disclaimer_present": true
}
```

Esto confirma que `get-case-result` sigue respondiendo correctamente con token temporal recien emitido.

## Fase 7.10 - `create-signed-read-url`

### Objetivo

Crear URL temporal de lectura para imagen o PDF.

### Archivo creado

- `supabase/functions/create-signed-read-url/index.ts`

### Implementado

- Metodo `POST`.
- Acceso por `case_code + case_token` o Auth interno.
- Valida que el caso exista y que el token temporal sea valido cuando no hay usuario interno.
- Valida `asset_id` como UUID.
- Valida `asset_type` contra recursos resolubles del esquema actual:
  - `original_image`
  - `gradcam_image`
  - `thumbnail_image`
  - `report_pdf`
- Verifica que el recurso pertenezca al caso antes de firmar.
- No devuelve `bucket_name`.
- No devuelve `object_path`.
- Crea URL firmada con expiracion de 600 segundos.
- Registra auditoria `SIGNED_URL_CREATED`.
- Registra solicitud tecnica en `api_request_logs`.

### Deploy remoto

MCP reporto:

- Nombre: `create-signed-read-url`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

Motivo de `verify_jwt=false`:

- La funcion permite acceso anonimo controlado mediante `case_code + case_token`.
- Si llega `Authorization`, valida internamente el usuario.

### Validacion realizada

Flujo probado:

1. `create-case`
2. `submit-questionnaire`
3. `request-image-upload`
4. subida real por URL firmada nativa de Supabase
5. `create-signed-read-url`

Resultado saneado:

```json
{
  "signed_success": true,
  "expires": 600,
  "signed_url_present": true
}
```

MCP valido:

- Edge Function activa.
- `api_request_logs` con `status_code = 200`.
- auditoria `SIGNED_URL_CREATED`.

Nota:

- Una primera prueba contra metadata de imagen sin objeto subido devolvio `INTERNAL_ERROR`, porque Storage no pudo firmar un objeto inexistente. La prueba valida se repitio con subida real.

## Fase 7.11 - `review-case`

### Objetivo

Permitir revision por especialista o administrador.

### Archivo creado

- `supabase/functions/review-case/index.ts`

### Implementado

- Metodo `POST`.
- Requiere `Authorization: Bearer`.
- Valida usuario Supabase Auth.
- Exige perfil interno activo en `profiles`.
- Permite solo roles:
  - `specialist`
  - `admin`
- Valida `case_id`.
- Valida `decision` contra enum real:
  - `confirm_ai`
  - `correct_ai`
  - `needs_clinical_evaluation`
  - `insufficient_information`
- Si `decision = correct_ai`, exige `corrected_suspicion_level`.
- Valida `clinical_notes` obligatorio y maximo 5000 caracteres.
- Valida `recommended_action` maximo 2000 caracteres.
- Permite revision de casos en estados:
  - `analyzed`
  - `recommendation_ready`
  - `reported`
  - `under_review`
- Crea `specialist_reviews`.
- Actualiza `cases.status = reviewed`.
- Si corrige IA, actualiza `cases.final_suspicion_level`.
- Registra auditoria `CASE_REVIEWED`.
- Registra solicitud tecnica en `api_request_logs`.

### Deploy remoto

MCP reporto:

- Nombre: `review-case`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

Motivo de `verify_jwt=false`:

- La funcion implementa validacion interna de Bearer token y perfil activo.
- Esto mantiene respuesta estandar y registro en `api_request_logs`.

### Validacion realizada

Sin sesion:

```json
{
  "review_no_auth_status": 401
}
```

MCP valido:

- Edge Function activa.
- `api_request_logs` con `status_code = 401` y `error_code = UNAUTHORIZED`.

Pendiente para ruta feliz:

- Probar con usuario real autenticado con perfil activo `specialist` o `admin`.

## Fase 7.12 - `dashboard-metrics`

### Objetivo

Devolver metricas agregadas para panel sin datos crudos sensibles.

### Archivo creado

- `supabase/functions/dashboard-metrics/index.ts`

### Implementado

- Metodo `GET`.
- Requiere `Authorization: Bearer`.
- Valida usuario Supabase Auth.
- Exige perfil interno activo en `profiles`.
- Permite roles:
  - `admin`
  - `specialist`
  - `researcher`
- Devuelve solo agregados:
  - `cases_last_30_days`
  - `total_cases`
  - `pending_review`
  - `by_suspicion_level`
  - `image_quality`
  - `average_ai_latency_ms`
- No devuelve IDs, imagenes, rutas internas ni datos individuales.
- Registra solicitud tecnica en `api_request_logs`.

### Deploy remoto

MCP reporto:

- Nombre: `dashboard-metrics`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

Motivo de `verify_jwt=false`:

- La funcion implementa validacion interna de Bearer token y perfil activo.
- Esto mantiene respuesta estandar y registro en `api_request_logs`.

### Validacion realizada

Sin sesion y metodo incorrecto:

```json
{
  "dashboard_no_auth_status": 401,
  "dashboard_post_status": 405
}
```

MCP valido:

- Edge Function activa.
- `api_request_logs` con:
  - `status_code = 401`, `error_code = UNAUTHORIZED`
  - `status_code = 405`, `error_code = METHOD_NOT_ALLOWED`

Pendiente para ruta feliz:

- Probar con usuario real autenticado con perfil activo `admin`, `specialist` o `researcher`.

## Fase 7.13 - `admin-upsert-ai-model`

### Objetivo

Registrar o actualizar modelo IA.

### Archivo creado

- `supabase/functions/admin-upsert-ai-model/index.ts`

### Implementado

- Metodo `POST`.
- Requiere `Authorization: Bearer`.
- Valida usuario Supabase Auth.
- Exige perfil interno activo en `profiles`.
- Permite solo rol `admin`.
- Valida payload contra la estructura real de `ai_models`:
  - `name`,
  - `version`,
  - `architecture`,
  - `storage_path`,
  - `input_shape`,
  - `class_labels`,
  - `threshold_config`,
  - `metrics`,
  - `is_active`.
- Si `is_active = true`, desactiva modelos activos previos con el mismo `name`.
- Hace upsert por constraint unica `name, version`.
- Registra auditoria `AI_MODEL_UPSERTED`.
- Registra solicitud tecnica en `api_request_logs`.

### Deploy remoto

MCP reporto:

- Nombre: `admin-upsert-ai-model`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

Motivo de `verify_jwt=false`:

- La funcion implementa validacion interna de Bearer token, perfil activo y rol `admin`.
- Esto mantiene respuesta estandar y registro en `api_request_logs`.

### Validacion realizada

Sin sesion:

```json
{
  "admin_upsert_no_auth_status": 401
}
```

MCP valido:

- Edge Function activa.
- `api_request_logs` con `status_code = 401` y `error_code = UNAUTHORIZED`.

Pendiente para ruta feliz:

- Crear o confirmar perfil interno `admin` para el usuario Auth que ejecutara la prueba.
- Luego registrar el modelo real o de staging definido por el equipo. No se creo modelo ficticio.

## Fase 7.14 - `cleanup-expired-case-tokens`

### Objetivo

Limpieza periodica de tokens expirados.

### Archivo creado

- `supabase/functions/cleanup-expired-case-tokens/index.ts`

### Implementado

- Metodo `POST`.
- Requiere `Authorization: Bearer`.
- Valida usuario Supabase Auth.
- Exige perfil interno activo en `profiles`.
- Permite solo rol `admin`.
- Revoca tokens expirados no usados con `revoked_at = now()`.
- No borra auditoria.
- No elimina tokens.
- Devuelve `revoked_count`.
- Registra auditoria `TOKEN_CLEANUP_COMPLETED`.
- Registra solicitud tecnica en `api_request_logs`.

### Decision sobre modo Scheduled/Service

El documento permite `POST` o Scheduled y rol Admin/Service, pero no define un secreto interno ni contrato de invocacion service.

Decision aplicada:

- Se implemento ruta admin autenticada.
- No se invento variable de entorno nueva para servicio interno.
- La ejecucion scheduled/service queda pendiente hasta definir el mecanismo de autenticacion interno.

### Deploy remoto

MCP reporto:

- Nombre: `cleanup-expired-case-tokens`
- Estado: `ACTIVE`
- Version: `1`
- `verify_jwt`: `false`

Motivo de `verify_jwt=false`:

- La funcion implementa validacion interna de Bearer token, perfil activo y rol `admin`.
- Esto mantiene respuesta estandar y registro en `api_request_logs`.

### Validacion realizada

Sin sesion y metodo incorrecto:

```json
{
  "cleanup_no_auth_status": 401,
  "cleanup_get_status": 405
}
```

MCP valido:

- Edge Function activa.
- `api_request_logs` con:
  - `status_code = 401`, `error_code = UNAUTHORIZED`
  - `status_code = 405`, `error_code = METHOD_NOT_ALLOWED`

Pendiente para ruta feliz:

- Probar con usuario real autenticado con perfil activo `admin`.

## Usuario interno creado para pruebas

El usuario Auth con UID `0a379675-ebe1-4601-bb7f-465857b3e8b9` existe en Supabase Auth.

Estado observado por MCP:

- Email: `guillermo.vaca07@gmail.com`
- Perfil creado en `public.profiles`.
- `role = admin`.
- `is_active = true`.

Decision aplicada:

- El usuario pidio explicitamente convertir este UID en admin.
- Se creo/actualizo el perfil por MCP con `full_name = guillermo.vaca07@gmail.com`, porque no se proporciono nombre completo separado.

## SQL aplicado en Fase 7.6 a 7.14

No se aplicaron migraciones SQL ni cambios de esquema.

Si se aplico DML por MCP para habilitar usuario interno admin:

```sql
insert into public.profiles (id, full_name, role, institution, is_active)
select id, coalesce(email, id::text), 'admin'::public.app_role, null, true
from auth.users
where id = '0a379675-ebe1-4601-bb7f-465857b3e8b9'
on conflict (id) do update
set role = 'admin'::public.app_role,
    is_active = true,
    updated_at = now();
```

Motivo:

- Las subfases agregan Edge Functions.
- No se crearon tablas, columnas, enums, indices, policies ni buckets nuevos.
- No se creo migracion nueva en `supabase/migrations`.

## Validacion integral posterior de Fase 7

Fecha: 2026-06-30

### Validacion local con Deno

Se ejecuto `deno check` sobre las 14 Edge Functions locales:

```powershell
Get-ChildItem supabase/functions -Recurse -Filter index.ts |
  ForEach-Object { deno check $_.FullName }
```

Resultado:

- Las 14 funciones pasaron `deno check` sin errores.

Correccion local aplicada para compatibilidad con Deno:

- Se ajusto el uso de `crypto.subtle.digest` para pasar un `ArrayBuffer` explicito en:
  - `supabase/functions/_shared/case-access.ts`
  - `supabase/functions/create-case/index.ts`
  - `supabase/functions/submit-questionnaire/index.ts`
  - `supabase/functions/request-image-upload/index.ts`
  - `supabase/functions/finalize-image-upload/index.ts`
  - `supabase/functions/generate-report/index.ts`

### Validacion remota por flujo anonimo

Caso de prueba:

```json
{
  "case_code": "OD-20260630-3F97AFF5",
  "image_id": "5233a6a9-cd20-4270-9191-92a1bb0533fa"
}
```

Resultado resumido:

```json
{
  "health_get": 200,
  "health_post": 405,
  "create_case": true,
  "submit_questionnaire": true,
  "request_upload": true,
  "finalize_upload": true,
  "validate_image": true,
  "validate_quality": "accepted",
  "run_inference_status": 503,
  "run_inference_code": "AI_SERVICE_UNAVAILABLE",
  "get_case_result": true,
  "signed_read_url": true,
  "signed_expires": 600
}
```

Interpretacion:

- Fase 7.1 a 7.6 funcionan en ruta feliz.
- Fase 7.7 responde con fallo controlado esperado porque todavia no hay modelo IA activo ni servicio IA configurado.
- Fase 7.9 funciona con resultado parcial controlado.
- Fase 7.10 genera URL firmada de lectura por 600 segundos.

### Validacion remota de funciones con Auth requerida

Sin sesion:

```json
{
  "review_no_auth": 401,
  "dashboard_no_auth": 401,
  "admin_upsert_no_auth": 401,
  "cleanup_no_auth": 401,
  "cleanup_get": 405
}
```

Interpretacion:

- Las funciones internas bloquean correctamente solicitudes sin Bearer token.
- `cleanup-expired-case-tokens` rechaza metodo `GET` con `METHOD_NOT_ALLOWED`.

Pendiente para ruta feliz autenticada:

- Probar con un access token valido del usuario admin `0a379675-ebe1-4601-bb7f-465857b3e8b9`.
- Con UID solo no se puede invocar rutas autenticadas; se requiere token de sesion Supabase.
- La obtencion del `access_token` queda pendiente a decision del usuario.
- No se obtiene ni se configura desde SQL Editor.
- Debe obtenerse mediante login de Supabase Auth, por ejemplo desde PowerShell, Postman/Insomnia o el futuro frontend.
- No documentar ni guardar el `access_token` plano en este repositorio.
- Una vez obtenido, usarlo solo en cabecera HTTP:

```text
Authorization: Bearer <access_token>
```

Funciones pendientes de prueba feliz autenticada con ese token:

- `review-case`
- `dashboard-metrics`
- `admin-upsert-ai-model`
- `cleanup-expired-case-tokens`

### Validacion MCP de logs y auditoria

MCP confirmo registros recientes en `api_request_logs` para:

- `health-check`
- `create-case`
- `submit-questionnaire`
- `request-image-upload`
- `finalize-image-upload`
- `validate-image`
- `run-inference`
- `get-case-result`
- `create-signed-read-url`
- `review-case`
- `dashboard-metrics`
- `admin-upsert-ai-model`
- `cleanup-expired-case-tokens`

MCP confirmo auditoria para el caso de prueba:

- `CASE_CREATED`
- `QUESTIONNAIRE_SUBMITTED`
- `IMAGE_UPLOAD_REQUESTED`
- `IMAGE_UPLOAD_FINALIZED`
- `IMAGE_QUALITY_CHECKED`
- `SIGNED_URL_CREATED`

## Riesgos y recomendaciones de Fase 7.6 a 7.14

1. `validate-image` usa validacion tecnica MVP basada en metadata; antes de produccion conviene calcular brillo, contraste y nitidez desde pixeles reales.
2. `run-inference` queda bloqueada para ruta feliz hasta configurar modelo activo y servicio IA.
3. `generate-report` depende de que exista recomendacion preventiva.
4. `get-case-result` puede devolver resultado parcial si el caso aun no tiene recomendacion; esto es util para estado de progreso, pero el frontend debe mostrarlo claramente.
5. Mantener buckets privados y no crear politicas amplias sobre `storage.objects`.
6. No usar lenguaje diagnostico definitivo en mensajes de IA, reporte o resultado.
7. `review-case` y `dashboard-metrics` requieren prueba feliz con usuarios internos reales y perfiles activos.
8. `admin-upsert-ai-model` y `cleanup-expired-case-tokens` requieren prueba feliz con usuario interno `admin`.
9. La invocacion scheduled/service de `cleanup-expired-case-tokens` requiere definir mecanismo de autenticacion interno antes de produccion.

## Pendiente inmediato

Continuar solo con Fase 8 cuando el usuario lo confirme.

Antes de implementar Fase 8:

1. Leer Fase 8 en `docs/backend_supabase_por_fases.md`.
2. Confirmar si se aplicaran vistas/RPC mediante migracion SQL.
3. Revisar seguridad de vistas; preferir `security_invoker = true` si aplica.
4. No exponer datos crudos sensibles.
5. Registrar cualquier desviacion antes de aplicar.

## Siguiente fase pendiente

La siguiente fase no implementada del documento es:

- Fase 8: vistas y RPC.

No se debe avanzar a Fase 8 sin confirmacion explicita del usuario.

## Estado de avance de Fase 7

Subfases de Fase 7 segun el documento:

1. `health-check` - completa y verificada.
2. `create-case` - completa, desplegada y verificada.
3. `submit-questionnaire` - completa, desplegada y verificada.
4. `request-image-upload` - completa, desplegada y verificada.
5. `finalize-image-upload` - completa, desplegada y verificada.
6. `validate-image` - completa, desplegada y verificada.
7. `run-inference` - implementada y desplegada; ruta feliz bloqueada por falta de modelo IA activo/servicio IA.
8. `generate-report` - implementada y desplegada; ruta feliz depende de recomendacion generada por IA.
9. `get-case-result` - completa, desplegada y verificada para resultado parcial controlado.
10. `create-signed-read-url` - completa, desplegada y verificada.
11. `review-case` - implementada y desplegada; ruta feliz requiere usuario interno especialista/admin.
12. `dashboard-metrics` - implementada y desplegada; ruta feliz requiere usuario interno admin/specialist/researcher.
13. `admin-upsert-ai-model` - implementada y desplegada; ruta feliz requiere usuario interno admin.
14. `cleanup-expired-case-tokens` - implementada y desplegada; ruta feliz requiere usuario interno admin.

Resumen:

- Completadas, desplegadas y verificadas total o parcialmente segun dependencias externas: 14 de 14.
- Pendientes de implementar dentro de Fase 7: 0 de 14.
- Bloqueo transversal anterior resuelto: `CASE_TOKEN_SECRET` ya fue configurado.
- Bloqueo actual para ruta feliz completa: falta modelo IA activo y configuracion de servicio IA.
- Siguiente fase: Fase 8.

## Variables de entorno obligatorias

Segun Fase 6:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_SERVICE_URL=
AI_SERVICE_TOKEN=
CASE_TOKEN_SECRET=
PDF_TEMPLATE_VERSION=mvp-v1
ALLOWED_ORIGINS=
ENVIRONMENT=local|staging|production
```

Estado observado:

- `SUPABASE_URL`: disponible para Edge Functions, porque `health-check` y logs funcionan.
- `SUPABASE_SERVICE_ROLE_KEY`: disponible para Edge Functions, porque `api_request_logs` se inserta.
- `CASE_TOKEN_SECRET`: configurado y validado mediante pruebas felices de `create-case`, `submit-questionnaire` y `request-image-upload`.
- `ENVIRONMENT`: no configurado explicitamente o fallback usado como `production`.

Recomendacion:

- Configurar todos los secretos antes de seguir con funciones que dependan de IA, tokens, PDF o dominios frontend.

## Seguridad y observaciones

### Correcto hasta ahora

- Buckets Storage siguen privados.
- No hay politicas amplias en `storage.objects` para buckets sensibles.
- El flujo anonimo se esta haciendo por Edge Functions, no por inserts directos desde frontend.
- `service_role` solo aparece en codigo de Edge Functions.
- `case_token` se devuelve una sola vez y no se guarda plano.
- Sin `CASE_TOKEN_SECRET`, la funcion falla antes de crear datos, lo cual evita tokens inseguros.

### Riesgos heredados de fases 0 a 5

Advisors de Supabase reportaron avisos heredados:

- `function_search_path_mutable` en `public.set_updated_at`.
- Helpers `SECURITY DEFINER` ejecutables por `anon` y `authenticated`.
- Foreign keys sin indices dedicados.
- Politicas RLS con posible `auth_rls_initplan`.
- Politicas permisivas multiples en algunas tablas.
- Indices sin uso, esperable mientras no haya datos reales.

Recomendacion:

- No corregir estos avisos mezclados con Fase 7 si no estan en el documento.
- Crear una fase futura de endurecimiento.
- Antes de produccion, revisar y aplicar una migracion especifica de seguridad/performance.

## Consultas utiles de estado

### Edge Functions

Usar MCP:

```text
list_edge_functions(project_id: "lsicnvutjvemohcxiwjk")
```

### Conteos principales

```sql
select
  (select count(*) from public.case_subjects) as case_subjects_count,
  (select count(*) from public.cases) as cases_count,
  (select count(*) from public.consent_records) as consent_records_count,
  (select count(*) from public.case_access_tokens) as case_access_tokens_count,
  (select count(*) from public.audit_logs where action = 'CASE_CREATED') as case_created_audit_count,
  (select count(*) from public.api_request_logs where function_name = 'create-case') as create_case_request_count;
```

### Logs de funciones

```sql
select request_id, function_name, method, status_code, error_code, case_id, metadata, created_at
from public.api_request_logs
order by created_at desc
limit 20;
```

### Auditoria

```sql
select action, entity_type, entity_id, case_id, metadata, created_at
from public.audit_logs
order by created_at desc
limit 20;
```

## Diccionario de tablas en espanol

Esta seccion explica todas las tablas actuales de `public` y como encajan en el backend.

### `profiles`

Representa usuarios internos del sistema.

Ejemplos:

- administradores,
- especialistas,
- promotores,
- investigadores.

Se vincula con `auth.users`.

Uso principal:

- Controlar permisos internos.
- Alimentar funciones RLS.
- Saber quien creo, reviso o genero ciertos recursos.

No representa pacientes ni usuarios anonimos del flujo publico.

### `case_subjects`

Representa al sujeto anonimo asociado a un caso.

Guarda datos demograficos minimos:

- edad aproximada,
- sexo declarado,
- ciudad general,
- zona general.

No debe guardar:

- nombre,
- documento,
- telefono,
- direccion exacta,
- datos identificables innecesarios.

Uso principal:

- Separar datos demograficos del caso.
- Mantener el caso lo mas anonimo posible.

### `cases`

Es la tabla central del flujo.

Representa un caso de triaje preventivo.

Guarda:

- codigo anonimo visible (`case_code`),
- sujeto asociado,
- usuario interno creador si aplica,
- estado operativo,
- zona bucal observada,
- dias de evolucion,
- resultado final consolidado cuando exista,
- recomendacion preventiva final cuando exista.

Importante:

- No representa diagnostico medico.
- El lenguaje asociado debe hablar de triaje, sospecha visual, orientacion preventiva o derivacion profesional.

### `consent_records`

Registra consentimiento informado aceptado.

Uso principal:

- Demostrar que el usuario acepto el alcance del flujo antes de avanzar.
- Guardar version legal/tecnica del consentimiento.

Reglas:

- `accepted` debe ser `true`.
- Puede guardar hash de IP y user-agent si se implementa.
- No debe guardar IP cruda ni datos sensibles.

### `case_access_tokens`

Guarda tokens temporales asociados a casos anonimos.

Importante:

- Solo guarda `token_hash`.
- Nunca guarda token plano.
- El token plano solo se devuelve una vez al frontend.

Propositos permitidos:

- `case_result_access`: acceso controlado al caso/resultado.
- `image_upload`: flujo de subida de imagen.
- `report_download`: descarga de reporte.

Uso principal:

- Permitir que un usuario anonimo continue el flujo sin tener cuenta.
- Validar acceso mediante `case_code + case_token`.

### `risk_questionnaires`

Guarda cuestionario de riesgo y sintomas observados.

Incluye senales como:

- dolor,
- sangrado,
- crecimiento,
- placa blanca,
- placa roja,
- ulcera que no cicatriza,
- bulto o induracion,
- disfagia,
- tabaco,
- alcohol,
- coca,
- protesis dental,
- friccion constante.

Uso principal:

- Calcular un puntaje orientativo.
- Alimentar recomendacion preventiva.

No debe usarse para diagnostico definitivo.

### `case_images`

Guarda metadata de archivos en Supabase Storage.

No guarda el archivo binario.

Guarda:

- caso asociado,
- tipo de imagen,
- bucket,
- ruta interna del objeto,
- MIME,
- tamano,
- dimensiones,
- hash,
- usuario que subio si aplica.

Uso principal:

- Relacionar imagenes privadas de Storage con el caso.
- Controlar flujo de imagen original, miniatura, Grad-CAM o recursos embebidos.

Importante:

- Los buckets son privados.
- No se debe exponer `object_path` al frontend sin URL firmada.

### `image_quality_checks`

Guarda evaluaciones tecnicas de calidad de imagen.

Puede incluir:

- nitidez,
- brillo,
- contraste,
- resolucion suficiente,
- foco,
- iluminacion,
- motivos de rechazo.

Uso principal:

- Decidir si una imagen es apta para inferencia IA.
- Rechazar imagenes tecnicamente insuficientes.

No representa evaluacion clinica.

### `ai_models`

Catalogo de modelos IA versionados.

Guarda:

- nombre,
- version,
- arquitectura,
- ruta de almacenamiento,
- forma esperada de entrada,
- etiquetas de clases,
- umbrales,
- metricas,
- si esta activo.

Uso principal:

- Trazabilidad de inferencias.
- Saber que modelo produjo cada resultado.

### `ai_inferences`

Guarda resultados de inferencia IA.

Incluye:

- caso,
- imagen,
- modelo,
- nivel de sospecha visual,
- probabilidad,
- probabilidades por clase,
- referencia a Grad-CAM si existe,
- latencia,
- metadata tecnica.

Uso principal:

- Registrar apoyo al triaje.
- No es diagnostico medico.

### `recommendations`

Guarda recomendacion preventiva generada.

Combina:

- inferencia IA,
- cuestionario,
- reglas conservadoras.

Incluye:

- nivel de sospecha,
- nivel de urgencia,
- si recomienda derivacion profesional,
- codigos de razon,
- mensaje preventivo.

Uso principal:

- Orientar al usuario hacia seguimiento, prevencion o derivacion profesional.

No debe usar lenguaje diagnostico.

### `pdf_reports`

Guarda metadata de reportes PDF privados.

No guarda el PDF en la tabla.

Guarda:

- caso,
- usuario que genero si aplica,
- bucket,
- ruta interna,
- hash del reporte,
- version del reporte.

Uso principal:

- Trazabilidad de reportes.
- Generar URLs firmadas temporales para descarga.

### `specialist_reviews`

Guarda revisiones profesionales del caso.

Incluye:

- especialista,
- decision,
- correccion de sospecha si aplica,
- notas,
- accion recomendada.

Uso principal:

- Permitir revision humana.
- Documentar orientacion profesional.

Importante:

- No reemplaza historia clinica ni diagnostico definitivo.

### `triage_rules`

Guarda reglas configurables del motor preventivo.

Incluye:

- codigo,
- descripcion,
- si esta activa,
- configuracion JSON.

Uso principal:

- Aplicar reglas conservadoras para recomendacion preventiva.
- Permitir ajustes sin cambiar codigo.

### `audit_logs`

Guarda auditoria funcional de acciones criticas.

Ejemplos de acciones:

- `CASE_CREATED`
- `QUESTIONNAIRE_SUBMITTED`
- `IMAGE_UPLOAD_REQUESTED`
- `IMAGE_UPLOAD_FINALIZED`
- `IMAGE_QUALITY_CHECKED`
- `AI_INFERENCE_STARTED`
- `AI_INFERENCE_COMPLETED`

Uso principal:

- Trazabilidad funcional.
- Seguridad.
- Investigacion de eventos.

Regla:

- No guardar datos sensibles innecesarios.
- No guardar IP cruda.

### `api_request_logs`

Guarda logs tecnicos de Edge Functions.

Incluye:

- `request_id`,
- nombre de funcion,
- metodo HTTP,
- codigo de estado,
- actor si aplica,
- caso si aplica,
- duracion,
- codigo de error,
- metadata tecnica.

Uso principal:

- Observabilidad.
- Depuracion.
- Correlacion entre API y datos.

### `system_settings`

Guarda configuraciones globales del sistema.

Incluye:

- clave,
- valor JSON,
- descripcion,
- si es publica,
- usuario que actualizo,
- fecha de actualizacion.

Uso principal:

- Parametros operativos controlados por administradores.
- Configuraciones que no deben estar hardcodeadas.

## Modelo mental del flujo principal

1. `create-case` crea:
   - `case_subjects`,
   - `cases`,
   - `consent_records`,
   - `case_access_tokens`,
   - `audit_logs`.

2. `submit-questionnaire` crea:
   - `risk_questionnaires`,
   - actualiza `cases.status`.

3. `request-image-upload` crea:
   - `case_images`,
   - URL firmada de subida en Storage,
   - actualiza `cases.status`.

4. `finalize-image-upload` completa:
   - metadata tecnica de `case_images`,
   - estado del caso.

5. `validate-image` crea:
   - `image_quality_checks`.

6. `run-inference` crea cuando existe modelo IA activo y servicio IA configurado:
   - `ai_inferences`.

7. Motor de recomendacion crea dentro de `run-inference`:
   - `recommendations`.

8. `generate-report` crea cuando existe recomendacion preventiva:
   - PDF privado en Storage,
   - metadata en `pdf_reports`.

9. `review-case` creara:
   - `specialist_reviews`.

10. Todas las acciones importantes deben dejar:
   - `audit_logs`,
   - `api_request_logs`.

## Reglas que deben mantenerse en nuevos chats

1. Seguir `docs/backend_supabase_por_fases.md`.
2. Revisar `docs/fase_0_al_5.md` y este archivo antes de continuar.
3. No inventar tablas, columnas, enums, politicas, buckets ni rutas.
4. Trabajar fase por fase y subfase por subfase.
5. No avanzar a fases posteriores sin cerrar verificaciones de la subfase actual.
6. Usar MCP de Supabase para cambios remotos.
7. Toda migracion SQL debe quedar versionada en `supabase/migrations`.
8. No aplicar cambios destructivos sin mostrar SQL y esperar aprobacion.
9. Mantener comentarios y mensajes en espanol.
10. No usar lenguaje diagnostico medico definitivo.
11. No exponer `service_role` al frontend.
12. No permitir acceso publico directo a datos sensibles.
13. Mantener buckets Storage privados.
14. Frontend anonimo debe operar por Edge Functions y URLs/tokens temporales.
