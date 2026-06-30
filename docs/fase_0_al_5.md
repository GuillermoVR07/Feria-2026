# OralDiagnostic - Contexto de implementacion Supabase Fase 0 a Fase 5

Fecha de corte: 2026-06-30  
Proyecto Supabase: `OralDiagnostic`  
Project ref: `lsicnvutjvemohcxiwjk`  
Base de datos: PostgreSQL 17.6  
Canal usado: MCP de Supabase como equivalente al SQL Editor remoto  

## Estado general

Se implemento el backend Supabase hasta la Fase 5 del documento `docs/backend_supabase_por_fases.md`.

La Supabase CLI no esta disponible localmente, por lo que las migraciones se versionaron en `supabase/migrations` y se aplicaron al proyecto remoto mediante MCP.

El directorio local no estaba inicializado como repositorio Git durante estas fases.

## Migraciones locales creadas

- `supabase/migrations/0000_fase_0_preparacion_entorno.sql`
- `supabase/migrations/0001_extensiones_enums.sql`
- `supabase/migrations/0002_tablas_base.sql`
- `supabase/migrations/0003_indices_constraints.sql`
- `supabase/migrations/0004_rls_helpers_policies.sql`
- `supabase/migrations/0005_storage_buckets_policies.sql`

## Migraciones aplicadas en Supabase

- `20260630064501` - `0001_extensiones_enums`
- `20260630065027` - `0000_fase_0_preparacion_entorno`
- `20260630065350` - `0002_tablas_base`
- `20260630065649` - `0003_indices_constraints`
- `20260630070623` - `0004_rls_helpers_policies`
- `20260630071652` - `0005_storage_buckets_policies`

Nota: `0000` fue registrada despues de `0001`. Es una migracion vacia/no operativa, por lo que no afecta el esquema.

## Fase 0 - Preparacion del entorno

Hecho:

- Se valido que el proyecto Supabase `OralDiagnostic` existe y esta activo.
- Se creo `.mcp.json` apuntando a `https://mcp.supabase.com/mcp`.
- Se creo una migracion base no operativa: `0000_fase_0_preparacion_entorno.sql`.
- Se verifico que inicialmente no habia tablas de usuario en `public`.

Pendiente/mejora:

- Instalar Supabase CLI si se quiere usar flujo local completo con `supabase migration new`, `supabase db reset`, `supabase db diff` y advisors CLI.
- Inicializar Git para versionar formalmente el proyecto.

## Fase 1 - Extensiones y enums

Hecho:

- Se activo `pgcrypto`.
- Se crearon los enums:
  - `app_role`
  - `biological_sex`
  - `case_status`
  - `lesion_site`
  - `capture_source`
  - `image_kind`
  - `image_quality_status`
  - `suspicion_level`
  - `urgency_level`
  - `review_decision`
  - `case_token_purpose`
- Se agregaron comentarios SQL en espanol.

Verificado:

- `pgcrypto` existe.
- Los 11 enums existen con sus valores.

## Fase 2 - Tablas base

Hecho:

Se crearon las 17 tablas definidas por el documento:

- `profiles`
- `case_subjects`
- `cases`
- `consent_records`
- `case_access_tokens`
- `risk_questionnaires`
- `case_images`
- `image_quality_checks`
- `ai_models`
- `ai_inferences`
- `recommendations`
- `pdf_reports`
- `specialist_reviews`
- `triage_rules`
- `audit_logs`
- `api_request_logs`
- `system_settings`

Verificado:

- Las 17 tablas existen en `public`.
- Las relaciones, checks basicos y comentarios fueron aplicados.

## Fase 3 - Indices, constraints y triggers

Hecho:

- Se crearon los indices definidos en el documento.
- Se creo la funcion `public.set_updated_at()`.
- Se crearon triggers `updated_at` para:
  - `profiles`
  - `cases`
  - `risk_questionnaires`
  - `triage_rules`
- Se creo el indice unico parcial `uq_ai_models_one_active_per_name`.

Verificado:

- Los indices esperados existen.
- Los 4 triggers existen.
- La funcion `set_updated_at` existe en `plpgsql`.

## Fase 4 - RLS, helpers y politicas

Hecho:

- Se activo RLS en las 17 tablas de `public`.
- Se crearon helpers:
  - `current_user_role`
  - `is_admin`
  - `is_specialist_or_admin`
  - `is_promoter_specialist_or_admin`
  - `user_can_read_case`
  - `user_can_review_case`
- Se crearon politicas RLS minimas para lectura y administracion controlada.

Decision aprobada:

- El documento original permitia `profiles_update_own_limited_or_admin`.
- Se cambio por `profiles_update_admin_only`, porque la politica original no limitaba columnas y podia permitir que un usuario autenticado cambiara su propio `role` o `is_active`.

Verificado:

- Las 17 tablas tienen RLS activo.
- Existen 23 politicas RLS.
- Los helpers existen y estan como `security definer`, segun el documento.

Recomendacion:

- Antes de produccion, revisar los helpers `security definer` con advisors de Supabase.
- Considerar mover helpers privilegiados a un schema no expuesto si se refactoriza el modelo de seguridad.

## Fase 5 - Storage privado

Hecho:

Se crearon 4 buckets privados:

- `case-originals`
- `case-gradcam`
- `case-reports`
- `case-thumbnails`

Configuracion aplicada:

- Ningun bucket es publico.
- `case-originals`: 10 MB, `image/jpeg`, `image/png`, `image/webp`.
- `case-gradcam`: 10 MB, `image/png`, `image/jpeg`, `image/webp`.
- `case-reports`: 10 MB, `application/pdf`.
- `case-thumbnails`: 2 MB, `image/webp`, `image/jpeg`, `image/png`.

Decision de seguridad:

- No se crearon las politicas amplias del documento sobre `storage.objects`.
- Motivo: las politicas propuestas permitian lectura e insert directo a cualquier usuario `authenticated` sobre buckets sensibles.
- Se mantiene el modelo seguro: Edge Functions con `service_role` generaran URLs firmadas de corta duracion.

Verificado:

- Los 4 buckets existen.
- Todos tienen `public = false`.
- No existen politicas directas en `storage.objects` para estos buckets.

## Pendiente por hacer

Siguiente fase inmediata del documento:

- Fase 6: API backend con Edge Functions.
- Crear estructura `supabase/functions`.
- Implementar `_shared`.
- Implementar primero `health-check`.

Fases posteriores:

- Fase 7: Edge Functions obligatorias del flujo.
- Fase 8: vistas y RPC.
- Fase 9: seeds de reglas y modelo.
- Fase 10: motor de recomendacion preventiva.
- Fase 11: integracion con servicio IA externo.
- Fase 12: auditoria funcional completa.
- Fase 13: validaciones backend.
- Fase 14: QA tecnico backend.
- Fase 15: despliegue y operacion.
- Fase 17: contrato futuro para frontend.

## Recomendaciones para mejorar lo ya hecho

1. Inicializar Git y confirmar cada migracion en commits pequenos.
2. Instalar Supabase CLI para ejecutar `supabase db advisors`, `supabase migration list` y pruebas locales.
3. Crear una fase futura de endurecimiento de seguridad despues de completar el MVP:
   - Revisar funciones `security definer`.
   - Revocar permisos innecesarios sobre funciones helper.
   - Definir grants explicitos para `anon` y `authenticated`.
   - Ejecutar advisors de seguridad.
   - Probar RLS con usuarios reales de rol `admin`, `specialist`, `promoter` y `researcher`.
4. Crear una fase futura de Storage avanzado:
   - Disenar politicas estrictas que relacionen `storage.objects.name` con `case_images.object_path`.
   - Permitir lectura solo si `public.user_can_read_case(case_id)` es verdadero.
   - Mantener uploads anonimos exclusivamente por signed upload URL.
   - Registrar auditoria cuando se generen signed URLs.
5. Crear pruebas automatizadas SQL para constraints criticos:
   - Edad mayor a 120 debe fallar.
   - Probabilidad IA mayor a 1 debe fallar.
   - Modelo activo duplicado por nombre debe fallar.
   - Consentimiento con `accepted = false` debe fallar.
6. Definir politica de retencion de imagenes antes de produccion.
7. Documentar variables de entorno requeridas para Edge Functions y servicio IA.
8. Mantener lenguaje no diagnostico en APIs, reportes y comentarios.

## Consultas utiles para validar estado

```sql
select version();
```

```sql
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

```sql
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('case-originals', 'case-gradcam', 'case-reports', 'case-thumbnails')
order by id;
```

```sql
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
```
