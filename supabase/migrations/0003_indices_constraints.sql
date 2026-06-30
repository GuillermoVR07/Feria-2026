-- ============================================================
-- MIGRACION: 0003_indices_constraints.sql
-- Proyecto: OralDiagnostic
-- Proposito: Indices, constraints adicionales y triggers de actualizacion.
-- ============================================================

-- Indices para casos.
create index idx_cases_status_created_at
on public.cases(status, created_at desc)
where deleted_at is null;

create index idx_cases_created_by_created_at
on public.cases(created_by, created_at desc)
where deleted_at is null;

create index idx_cases_subject_id
on public.cases(subject_id);

create index idx_cases_case_code
on public.cases(case_code);

-- Indices para sujetos.
create index idx_case_subjects_city
on public.case_subjects(city);

-- Indices para tokens.
create index idx_case_access_tokens_case_purpose
on public.case_access_tokens(case_id, purpose, expires_at desc);

create index idx_case_access_tokens_active
on public.case_access_tokens(case_id, purpose)
where used_at is null and revoked_at is null;

-- Indices para imagenes.
create index idx_case_images_case_kind
on public.case_images(case_id, image_kind, created_at desc);

create index idx_case_images_hash
on public.case_images(sha256_hash)
where sha256_hash is not null;

-- Indices para calidad.
create index idx_quality_image_created_at
on public.image_quality_checks(image_id, created_at desc);

create index idx_quality_status_created_at
on public.image_quality_checks(status, created_at desc);

-- Indices para IA.
create index idx_ai_models_active
on public.ai_models(is_active)
where is_active = true;

create index idx_ai_inferences_case_created_at
on public.ai_inferences(case_id, created_at desc);

create index idx_ai_inferences_image_created_at
on public.ai_inferences(image_id, created_at desc);

create index idx_ai_inferences_model_created_at
on public.ai_inferences(model_id, created_at desc);

-- Indices para recomendaciones.
create index idx_recommendations_case_created_at
on public.recommendations(case_id, created_at desc);

create index idx_recommendations_levels
on public.recommendations(suspicion_level, urgency_level, created_at desc);

-- Indices para reportes.
create index idx_pdf_reports_case_created_at
on public.pdf_reports(case_id, created_at desc);

-- Indices para revisiones.
create index idx_specialist_reviews_case_created_at
on public.specialist_reviews(case_id, created_at desc);

create index idx_specialist_reviews_reviewed_by
on public.specialist_reviews(reviewed_by, created_at desc);

-- Indices para auditoria y logs.
create index idx_audit_logs_case_created_at
on public.audit_logs(case_id, created_at desc);

create index idx_audit_logs_actor_created_at
on public.audit_logs(actor_id, created_at desc);

create index idx_audit_logs_action_created_at
on public.audit_logs(action, created_at desc);

create index idx_api_request_logs_request_id
on public.api_request_logs(request_id);

create index idx_api_request_logs_function_created_at
on public.api_request_logs(function_name, created_at desc);

-- Funcion generica para updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
'Actualiza automaticamente la columna updated_at antes de cada update.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger cases_set_updated_at
before update on public.cases
for each row execute function public.set_updated_at();

create trigger risk_questionnaires_set_updated_at
before update on public.risk_questionnaires
for each row execute function public.set_updated_at();

create trigger triage_rules_set_updated_at
before update on public.triage_rules
for each row execute function public.set_updated_at();

-- Garantizar que solo exista un modelo activo por nombre logico.
create unique index uq_ai_models_one_active_per_name
on public.ai_models(name)
where is_active = true;
