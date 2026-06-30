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
- Fase 7.2 implementada y desplegada: Edge Function `create-case`.
- Fase 7.2 pendiente de prueba feliz completa por falta del secreto remoto `CASE_TOKEN_SECRET`.
- Fase 7.3 implementada y desplegada: Edge Function `submit-questionnaire`.
- Fase 7.3 pendiente de prueba feliz completa porque depende de un `case_code + case_token` real generado por `create-case`.

No se avanzo a Fase 7.4 porque la Fase 7.2 todavia requiere configurar secreto y validar creacion real de caso. La Fase 7.3 quedo implementada, pero su prueba feliz queda bloqueada por la misma dependencia.

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

No se aplicaron nuevas migraciones SQL en Fase 6 ni Fase 7.1/7.2, porque estas fases trabajan con Edge Functions y no definen DDL/DML de esquema.

### Edge Functions remotas

MCP reporto estas Edge Functions:

- `health-check`
  - Estado: `ACTIVE`
  - Version: `1`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.1 indica `Auth: No`.

- `create-case`
  - Estado: `ACTIVE`
  - Version: `1`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.2 indica `Auth: Opcional` y flujo publico controlado.

- `submit-questionnaire`
  - Estado: `ACTIVE`
  - Version: `1`
  - `verify_jwt`: `false`
  - Motivo: la subfase 7.3 indica `Auth: Opcional con token de caso / Auth interno`.

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

- Deno no esta instalado localmente, por lo que no se pudo ejecutar `deno check`.
- Supabase CLI no esta disponible localmente segun el estado previo, por lo que no se uso `supabase functions serve`.

### Recomendaciones de Fase 6

1. Instalar Deno para validacion local:

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

Conclusion:

- La funcion sigue fallando antes de crear datos.
- No hay datos parciales que limpiar.
- No es seguro avanzar a Fase 7.3 porque `submit-questionnaire` requiere un `case_code + case_token` valido generado por `create-case`.

### Bloqueo actual de Fase 7.2

Falta configurar el secreto remoto:

```text
CASE_TOKEN_SECRET
```

Sin este secreto, `create-case` no puede crear token seguro.

### Instrucciones para desbloquear Fase 7.2

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

### Prueba feliz pendiente despues de configurar secreto

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
- La prueba feliz queda pendiente hasta que `create-case` pueda crear un caso real con `CASE_TOKEN_SECRET`.

### Prueba feliz pendiente de Fase 7.3

Requisitos previos:

1. Configurar `CASE_TOKEN_SECRET`.
2. Ejecutar prueba feliz de `create-case`.
3. Obtener `case_code` y `case_token` reales.

Luego ejecutar:

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

1. No avanzar a Fase 7.4 en entorno real hasta validar la prueba feliz de `create-case` y `submit-questionnaire`.
2. Mantener `risk_score` como valor orientativo interno.
3. Revisar formula de pesos en Fase 10.
4. No permitir edicion anonima del cuestionario hasta definir reglas claras de upsert.
5. Si se habilita edicion, implementar upsert controlado y auditoria diferenciada.
6. Mantener validacion estricta de campos para evitar payloads sensibles o inesperados.

## Pendiente inmediato

Antes de continuar con Fase 7.4:

1. Configurar `CASE_TOKEN_SECRET`.
2. Repetir prueba feliz de `create-case`.
3. Confirmar creacion de:
   - `case_subjects`,
   - `cases`,
   - `consent_records`,
   - `case_access_tokens`,
   - `audit_logs`.
4. Confirmar que `case_token` no se almacena plano.
5. Confirmar que `token_hash` existe y que `case_token` solo aparece en respuesta.
6. Confirmar que `api_request_logs` registra `status_code = 200`.
7. Repetir prueba feliz de `submit-questionnaire` con `case_code + case_token` reales.
8. Confirmar que se crea `risk_questionnaires`.
9. Confirmar que `cases.status` cambia a `questionnaire_completed`.
10. Confirmar auditoria `QUESTIONNAIRE_SUBMITTED`.

## Siguiente fase despues del desbloqueo

La siguiente subfase no implementada del documento es:

- Fase 7.4: `request-image-upload`

No se debe avanzar a esta subfase hasta cerrar la validacion feliz de Fase 7.2 y Fase 7.3, salvo decision explicita del usuario.

## Estado de avance de Fase 7

Subfases de Fase 7 segun el documento:

1. `health-check` - completa y verificada.
2. `create-case` - implementada y desplegada; prueba feliz bloqueada por `CASE_TOKEN_SECRET`.
3. `submit-questionnaire` - implementada y desplegada; prueba feliz bloqueada porque depende de caso/token reales.
4. `request-image-upload` - pendiente.
5. `finalize-image-upload` - pendiente.
6. `validate-image` - pendiente.
7. `run-inference` - pendiente.
8. `generate-report` - pendiente.
9. `get-case-result` - pendiente.
10. `create-signed-read-url` - pendiente.
11. `review-case` - pendiente.
12. `dashboard-metrics` - pendiente.
13. `admin-upsert-ai-model` - pendiente.
14. `cleanup-expired-case-tokens` - pendiente.

Resumen:

- Completada y verificada: 1 de 14.
- Implementadas y desplegadas con prueba feliz pendiente: 2 de 14.
- Pendientes de implementar: 11 de 14.
- Bloqueo transversal actual: falta `CASE_TOKEN_SECRET`.

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
- `CASE_TOKEN_SECRET`: faltante.
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

2. `submit-questionnaire` creara:
   - `risk_questionnaires`,
   - actualizara `cases.status`.

3. `request-image-upload` creara:
   - `case_images`,
   - URL firmada de subida en Storage,
   - actualizara `cases.status`.

4. `finalize-image-upload` completara:
   - metadata tecnica de `case_images`,
   - estado del caso.

5. `validate-image` creara:
   - `image_quality_checks`.

6. `run-inference` creara:
   - `ai_inferences`.

7. Motor de recomendacion creara:
   - `recommendations`.

8. `generate-report` creara:
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
