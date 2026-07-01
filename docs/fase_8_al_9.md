# OralDiagnostic - Contexto de implementacion Supabase Fases 8 y 9

Fecha de corte: 2026-06-30  
Proyecto Supabase: `OralDiagnostic`  
Project ref: `lsicnvutjvemohcxiwjk`  
Base de datos: PostgreSQL 17.6  
Canal usado: MCP de Supabase como equivalente al SQL Editor remoto  

## Estado general

Se implementaron Fase 8 y Fase 9 del documento `docs/backend_supabase_por_fases.md`.

La Fase 8 agrega:

- Vista `public.v_dashboard_metrics`.
- Vista `public.v_cases_for_review`.
- RPC `public.validate_case_access_token`.

La Fase 9 agrega datos iniciales:

- Reglas preventivas en `public.triage_rules`.
- Registro inicial del modelo MVP en `public.ai_models`.
- Configuraciones iniciales en `public.system_settings`.

No se modificaron tablas, columnas, enums, buckets ni Edge Functions.

## Migraciones locales creadas

- `supabase/migrations/0006_views_rpc_dashboard.sql`
- `supabase/migrations/0006_views_rpc_dashboard_permissions_fix.sql`
- `supabase/migrations/0007_seed_reglas_modelo.sql`

## Migraciones aplicadas en Supabase

MCP reporto estas nuevas migraciones remotas:

- `20260630235824` - `0006_views_rpc_dashboard`
- `20260701000050` - `0006_views_rpc_dashboard_permissions_fix`
- `20260701002123` - `0007_seed_reglas_modelo`

Nota:

- La segunda migracion corrige permisos de vistas para dejarlos minimos y explicitos.
- El timestamp remoto puede aparecer como 2026-07-01 por UTC, aunque el trabajo se realizo el 2026-06-30 en horario local.

## Fase 8.1 - Vistas de dashboard y revision

### `public.v_dashboard_metrics`

Objetivo:

- Devolver metricas agregadas del sistema.
- No exponer imagenes, notas clinicas, rutas internas ni datos personales directos.

Campos:

- `cases_last_30_days`
- `total_cases`
- `pending_review`
- `low_cases`
- `moderate_cases`
- `high_cases`
- `image_rejected_cases`
- `average_ai_latency_ms`

Decision de seguridad:

- Se creo con `with (security_invoker = true)`.
- Motivo: Supabase documenta que las vistas en `public` pueden saltarse RLS por defecto si no usan `security_invoker`.

### `public.v_cases_for_review`

Objetivo:

- Devolver cola minima de casos que justifican revision profesional.

Campos:

- `case_id`
- `case_code`
- `status`
- `lesion_site`
- `lesion_duration_days`
- `final_suspicion_level`
- `final_urgency_level`
- `created_at`
- `professional_referral`
- `reason_codes`

Decision de seguridad:

- Se creo con `with (security_invoker = true)`.
- No incluye imagenes.
- No incluye `bucket_name`.
- No incluye `object_path`.
- No incluye notas clinicas.
- No incluye datos demograficos del sujeto.

## Permisos de vistas

Permisos finales validados:

- `anon`: sin permisos.
- `authenticated`: `SELECT`.
- `service_role`: `SELECT`.
- `postgres`: permisos de propietario.

Motivo:

- Evitar acceso anonimo directo.
- Mantener acceso minimo para roles autenticados bajo RLS.
- Permitir consumo backend con `service_role`.

## Fase 8.2 - RPC `validate_case_access_token`

### Objetivo

Validar token temporal hasheado asociado a un caso anonimo.

Firma:

```sql
public.validate_case_access_token(
  p_case_code text,
  p_token_hash text,
  p_purpose public.case_token_purpose
)
```

Retorna:

- `case_id`
- `token_id`
- `is_valid`
- `invalid_reason`

Razones de invalidez:

- `CASE_NOT_FOUND`
- `TOKEN_NOT_FOUND`
- `TOKEN_REVOKED`
- `TOKEN_EXPIRED`

Decision de seguridad:

- La funcion es `security definer`.
- Tiene `set search_path = public`.
- Se revoco `EXECUTE` de:
  - `public`
  - `anon`
  - `authenticated`
- Se concedio `EXECUTE` solo a:
  - `service_role`

Motivo:

- El documento indica que debe usarse preferentemente desde Edge Functions, no desde frontend.
- Al estar en schema `public` y ser `security definer`, no debe quedar ejecutable para roles publicos.

## Validaciones realizadas

### Existencia de objetos

MCP confirmo:

- Existen `public.v_dashboard_metrics` y `public.v_cases_for_review`.
- Existe `public.validate_case_access_token`.
- La RPC esta como `security_definer = true`.
- Las vistas tienen `reloptions = security_invoker=true`.

### Datos agregados

Consulta:

```sql
select * from public.v_dashboard_metrics;
```

Resultado observado:

```json
{
  "cases_last_30_days": 14,
  "total_cases": 14,
  "pending_review": 0,
  "low_cases": 0,
  "moderate_cases": 0,
  "high_cases": 0,
  "image_rejected_cases": 0,
  "average_ai_latency_ms": null
}
```

Consulta:

```sql
select count(*) as cases_for_review_count
from public.v_cases_for_review;
```

Resultado observado:

```json
{
  "cases_for_review_count": 0
}
```

Interpretacion:

- Las vistas responden correctamente.
- Aun no hay casos con inferencia/recomendacion que entren en cola de revision.

### RPC con token valido

Se valido usando un `token_hash` real existente en base de datos, sin exponer token plano.

Resultado saneado:

```json
{
  "case_id_present": true,
  "token_id_present": true,
  "is_valid": true,
  "invalid_reason": null
}
```

### RPC con caso inexistente

Consulta:

```sql
select is_valid, invalid_reason
from public.validate_case_access_token(
  'NO-EXISTE',
  repeat('0', 64),
  'case_result_access'::public.case_token_purpose
);
```

Resultado:

```json
{
  "is_valid": false,
  "invalid_reason": "CASE_NOT_FOUND"
}
```

## Desviaciones documentadas

1. El documento base no incluia `security_invoker` en las vistas.
   - Se agrego porque el proyecto usa PostgreSQL 17.6 y Supabase recomienda `security_invoker` para evitar que vistas en `public` salten RLS.

2. El documento base no revocaba permisos de ejecucion de la RPC.
   - Se revoco ejecucion publica porque la funcion es `security definer` y debe ser usada desde Edge Functions/backend.

3. Se agrego una migracion de correccion de permisos.
   - Motivo: la primera validacion mostro privilegios amplios por defaults sobre las vistas.
   - Estado final: permisos minimos verificados.

## Fase 9 - Reglas iniciales y configuracion

### Migracion `0007_seed_reglas_modelo.sql`

Objetivo:

- Cargar reglas preventivas iniciales para el futuro motor de recomendacion.
- Cargar configuraciones iniciales del sistema.
- Registrar el modelo IA MVP descrito en el documento base.

Decision aplicada por instruccion del usuario:

- El modelo `oral-lesion-triage-cnn` version `1.0.0` se registro con `is_active = false`.
- Motivo: aun no existe `AI_SERVICE_URL`, token de servicio IA ni modelo IA operativo conectado.
- Esto mantiene trazabilidad del modelo propuesto sin habilitar inferencias reales todavia.

### Reglas sembradas

Se insertaron o actualizaron 6 reglas activas:

- `RULE_IMAGE_REJECTED`
- `RULE_AI_HIGH`
- `RULE_AI_MODERATE`
- `RULE_DURATION_ALERT_SYMPTOMS`
- `RULE_DYSPHAGIA_GROWTH_LUMP`
- `RULE_AI_LOW_MONITORING`

Validacion MCP:

```json
{
  "triage_rules_count": 6,
  "active_triage_rules_count": 6
}
```

### Modelo IA registrado

Registro:

```json
{
  "name": "oral-lesion-triage-cnn",
  "version": "1.0.0",
  "architecture": "mobilenetv3-small",
  "storage_path": "models/oral-lesion-triage-cnn/1.0.0/model.keras",
  "input_shape": [224, 224, 3],
  "class_labels": ["low", "moderate", "high"],
  "threshold_config": {
    "low_max": 0.25,
    "moderate_max": 0.55,
    "high_min": 0.56
  },
  "is_active": false
}
```

Nota registrada en `metrics.notes`:

```text
Modelo inicial pendiente de validacion clinica externa. Se registra inactivo porque aun no existe AI_SERVICE_URL ni servicio IA operativo configurado.
```

Validacion MCP:

```json
{
  "ai_models_count": 1,
  "active_ai_models_count": 0
}
```

Impacto actual:

- `run-inference` sigue sin ruta feliz completa.
- Mientras no exista modelo activo y servicio IA configurado, la inferencia real debe permanecer bloqueada.
- No se invento URL de servicio IA.
- No se activo modelo sin respaldo operativo.

### Configuraciones sembradas

Se insertaron o actualizaron 3 settings:

- `medical_disclaimer`
  - `is_public = true`
  - Texto preventivo, no diagnostico.
- `image_quality_thresholds`
  - `is_public = false`
  - Umbrales iniciales de calidad de imagen.
- `signed_url_expiration`
  - `is_public = false`
  - Duraciones de URLs firmadas.

Validacion MCP:

```json
{
  "target_settings_count": 3
}
```

## Desviaciones documentadas Fase 9

1. El documento base indicaba insertar el modelo con `is_active = true`.
   - Se cambio a `is_active = false` por instruccion del usuario.
   - Motivo: aun no existe `AI_SERVICE_URL`, token de servicio IA ni modelo IA operativo conectado.

2. Se mantuvieron los valores del documento base para nombre, version, arquitectura, rutas, etiquetas y umbrales.
   - No se inventaron valores alternativos.

3. Se agrego una nota explicita en `metrics.notes`.
   - Motivo: dejar trazabilidad de que el modelo esta registrado pero no operativo.

## Pendiente inmediato

La siguiente fase del documento es:

- Fase 10: recomendacion preventiva.

Antes de implementar Fase 10:

1. Revisar la seccion Fase 10 en `docs/backend_supabase_por_fases.md`.
2. Confirmar si el motor de recomendacion debe trabajar solo con reglas y datos existentes mientras la IA real sigue inactiva.
3. Mantener lenguaje preventivo, no diagnostico.
4. No activar `ai_models` hasta configurar `AI_SERVICE_URL` y servicio IA operativo.
