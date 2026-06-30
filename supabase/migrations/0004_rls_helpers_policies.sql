-- ============================================================
-- MIGRACION: 0004_rls_helpers_policies.sql
-- Proyecto: OralDiagnostic
-- Proposito: Activar RLS, crear helpers de autorizacion y politicas minimas.
-- Nota: Por decision aprobada, profiles solo puede actualizarse por admin.
-- ============================================================

-- Parte 1: Activacion RLS.
alter table public.profiles enable row level security;
alter table public.case_subjects enable row level security;
alter table public.cases enable row level security;
alter table public.consent_records enable row level security;
alter table public.case_access_tokens enable row level security;
alter table public.risk_questionnaires enable row level security;
alter table public.case_images enable row level security;
alter table public.image_quality_checks enable row level security;
alter table public.ai_models enable row level security;
alter table public.ai_inferences enable row level security;
alter table public.recommendations enable row level security;
alter table public.pdf_reports enable row level security;
alter table public.specialist_reviews enable row level security;
alter table public.triage_rules enable row level security;
alter table public.audit_logs enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.system_settings enable row level security;

-- Parte 2: Helpers de seguridad.
create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;
$$;

comment on function public.current_user_role() is
'Devuelve el rol del usuario autenticado activo.';

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() = 'admin';
$$;

create or replace function public.is_specialist_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('specialist', 'admin');
$$;

create or replace function public.is_promoter_specialist_or_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.current_user_role() in ('promoter', 'specialist', 'admin');
$$;

create or replace function public.user_can_read_case(target_case_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = target_case_id
      and c.deleted_at is null
      and (
        c.created_by = auth.uid()
        or public.current_user_role() in ('admin', 'specialist')
      )
  );
$$;

comment on function public.user_can_read_case(uuid) is
'Determina si el usuario autenticado puede leer un caso. No aplica para acceso anonimo con token.';

create or replace function public.user_can_review_case(target_case_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.cases c
    where c.id = target_case_id
      and c.deleted_at is null
      and public.current_user_role() in ('admin', 'specialist')
      and c.status in ('analyzed', 'recommendation_ready', 'reported', 'under_review', 'reviewed')
  );
$$;

comment on function public.user_can_review_case(uuid) is
'Determina si el usuario autenticado puede revisar un caso.';

-- Parte 3: Politicas RLS.

-- PROFILES
create policy "profiles_select_own_or_admin"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy "profiles_update_admin_only"
on public.profiles
for update
to authenticated
using (
  public.is_admin()
)
with check (
  public.is_admin()
);

-- CASE SUBJECTS
create policy "case_subjects_select_by_case_access"
on public.case_subjects
for select
to authenticated
using (
  exists (
    select 1
    from public.cases c
    where c.subject_id = case_subjects.id
      and public.user_can_read_case(c.id)
  )
);

-- CASES
create policy "cases_select_by_role_or_owner"
on public.cases
for select
to authenticated
using (
  deleted_at is null
  and (
    created_by = auth.uid()
    or public.current_user_role() in ('admin', 'specialist')
  )
);

create policy "cases_update_by_specialist_or_admin_or_owner_promoter"
on public.cases
for update
to authenticated
using (
  deleted_at is null
  and (
    public.current_user_role() in ('admin', 'specialist')
    or created_by = auth.uid()
  )
)
with check (
  deleted_at is null
  and (
    public.current_user_role() in ('admin', 'specialist')
    or created_by = auth.uid()
  )
);

-- CONSENT RECORDS
create policy "consent_records_select_by_case_access"
on public.consent_records
for select
to authenticated
using (
  public.user_can_read_case(case_id)
);

-- CASE ACCESS TOKENS
create policy "case_access_tokens_select_admin_only"
on public.case_access_tokens
for select
to authenticated
using (
  public.is_admin()
);

-- RISK QUESTIONNAIRES
create policy "risk_questionnaires_select_by_case_access"
on public.risk_questionnaires
for select
to authenticated
using (
  public.user_can_read_case(case_id)
);

-- CASE IMAGES
create policy "case_images_select_by_case_access"
on public.case_images
for select
to authenticated
using (
  public.user_can_read_case(case_id)
);

-- IMAGE QUALITY CHECKS
create policy "image_quality_select_by_case_access"
on public.image_quality_checks
for select
to authenticated
using (
  exists (
    select 1
    from public.case_images ci
    where ci.id = image_quality_checks.image_id
      and public.user_can_read_case(ci.case_id)
  )
);

-- AI MODELS
create policy "ai_models_select_authenticated"
on public.ai_models
for select
to authenticated
using (true);

create policy "ai_models_admin_all"
on public.ai_models
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- AI INFERENCES
create policy "ai_inferences_select_by_case_access"
on public.ai_inferences
for select
to authenticated
using (
  public.user_can_read_case(case_id)
);

-- RECOMMENDATIONS
create policy "recommendations_select_by_case_access"
on public.recommendations
for select
to authenticated
using (
  public.user_can_read_case(case_id)
);

-- PDF REPORTS
create policy "pdf_reports_select_by_case_access"
on public.pdf_reports
for select
to authenticated
using (
  public.user_can_read_case(case_id)
);

-- SPECIALIST REVIEWS
create policy "specialist_reviews_select_specialist_admin"
on public.specialist_reviews
for select
to authenticated
using (
  public.current_user_role() in ('admin', 'specialist')
);

create policy "specialist_reviews_insert_specialist_admin"
on public.specialist_reviews
for insert
to authenticated
with check (
  public.current_user_role() in ('admin', 'specialist')
  and reviewed_by = auth.uid()
);

-- TRIAGE RULES
create policy "triage_rules_select_authenticated"
on public.triage_rules
for select
to authenticated
using (true);

create policy "triage_rules_admin_all"
on public.triage_rules
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- AUDIT LOGS
create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (
  public.is_admin()
);

-- API REQUEST LOGS
create policy "api_request_logs_select_admin"
on public.api_request_logs
for select
to authenticated
using (
  public.is_admin()
);

-- SYSTEM SETTINGS
create policy "system_settings_select_public_or_admin"
on public.system_settings
for select
to authenticated
using (
  is_public = true
  or public.is_admin()
);

create policy "system_settings_admin_all"
on public.system_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
