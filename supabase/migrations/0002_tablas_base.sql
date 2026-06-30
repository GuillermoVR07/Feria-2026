-- ============================================================
-- MIGRACION: 0002_tablas_base.sql
-- Proyecto: OralDiagnostic
-- Proposito: Crear tablas principales del backend MVP.
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 160),
  role public.app_role not null default 'promoter',
  institution text check (institution is null or char_length(institution) <= 160),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
'Perfiles de usuarios internos vinculados a Supabase Auth.';
comment on column public.profiles.id is
'Identificador del usuario. Referencia a auth.users(id).';
comment on column public.profiles.role is
'Rol interno usado por RLS y Edge Functions.';

create table public.case_subjects (
  id uuid primary key default gen_random_uuid(),
  age_years smallint check (age_years is null or age_years between 0 and 120),
  sex public.biological_sex not null default 'not_specified',
  city text check (city is null or char_length(city) <= 120),
  zone text check (zone is null or char_length(zone) <= 120),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.case_subjects is
'Datos minimos y anonimos del sujeto asociado al caso. No almacenar nombre, documento, telefono ni direccion exacta.';

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  case_code text not null unique,
  subject_id uuid not null references public.case_subjects(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  status public.case_status not null default 'draft',
  lesion_site public.lesion_site not null default 'not_specified',
  lesion_duration_days integer not null check (lesion_duration_days between 0 and 3650),
  final_suspicion_level public.suspicion_level,
  final_urgency_level public.urgency_level,
  final_recommendation text check (final_recommendation is null or char_length(final_recommendation) <= 3000),
  clinical_disclaimer_acknowledged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz,
  constraint cases_final_level_consistency check (
    (final_suspicion_level is null and final_urgency_level is null)
    or
    (final_suspicion_level is not null and final_urgency_level is not null)
  )
);

comment on table public.cases is
'Caso principal de triaje preventivo. No representa diagnostico medico.';
comment on column public.cases.case_code is
'Codigo anonimo visible para usuario, sin datos identificables.';
comment on column public.cases.final_recommendation is
'Mensaje preventivo final. Debe evitar lenguaje diagnostico.';

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  accepted boolean not null,
  consent_version text not null check (char_length(consent_version) <= 80),
  accepted_at timestamptz not null default now(),
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  constraint consent_must_be_true_for_mvp check (accepted = true)
);

comment on table public.consent_records is
'Registro de consentimiento informado aceptado por el usuario.';

create table public.case_access_tokens (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  token_hash text not null unique,
  purpose public.case_token_purpose not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint token_expiration_future check (expires_at > created_at)
);

comment on table public.case_access_tokens is
'Tokens temporales hasheados para permitir acceso anonimo controlado al caso, resultado o PDF. Nunca guardar token plano.';

create table public.risk_questionnaires (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null unique references public.cases(id) on delete cascade,
  pain boolean not null default false,
  bleeding boolean not null default false,
  growth boolean not null default false,
  white_patch boolean not null default false,
  red_patch boolean not null default false,
  non_healing_ulcer boolean not null default false,
  lump_or_induration boolean not null default false,
  dysphagia boolean not null default false,
  tobacco_use boolean not null default false,
  alcohol_use boolean not null default false,
  coca_chewing boolean not null default false,
  coca_machucada boolean not null default false,
  bicarbonate_or_additives boolean not null default false,
  dental_prosthesis boolean not null default false,
  constant_friction boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 1000),
  risk_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint risk_score_range check (risk_score is null or (risk_score >= 0 and risk_score <= 100))
);

comment on table public.risk_questionnaires is
'Cuestionario clinico basico de riesgo. Sirve para triaje preventivo, no para diagnostico.';

create table public.case_images (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  image_kind public.image_kind not null default 'original',
  capture_source public.capture_source,
  bucket_name text not null check (char_length(bucket_name) <= 80),
  object_path text not null check (char_length(object_path) <= 500),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  width_px integer check (width_px is null or width_px > 0),
  height_px integer check (height_px is null or height_px > 0),
  sha256_hash text check (sha256_hash is null or char_length(sha256_hash) = 64),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(bucket_name, object_path)
);

comment on table public.case_images is
'Metadata de objetos almacenados en Supabase Storage: imagen original, Grad-CAM, miniaturas o recursos derivados.';

create table public.image_quality_checks (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.case_images(id) on delete cascade,
  status public.image_quality_status not null,
  sharpness_score numeric(8,3),
  brightness_score numeric(8,3),
  contrast_score numeric(8,3),
  resolution_ok boolean not null default false,
  focus_ok boolean not null default false,
  illumination_ok boolean not null default false,
  rejection_reasons text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.image_quality_checks is
'Validaciones tecnicas de calidad de imagen antes de ejecutar IA.';

create table public.ai_models (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 120),
  version text not null check (char_length(version) <= 40),
  architecture text not null check (char_length(architecture) <= 120),
  storage_path text check (storage_path is null or char_length(storage_path) <= 500),
  input_shape jsonb not null,
  class_labels jsonb not null,
  threshold_config jsonb not null,
  metrics jsonb not null default '{}'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique(name, version)
);

comment on table public.ai_models is
'Catalogo de modelos IA versionados. Toda inferencia debe referenciar un modelo.';

create table public.ai_inferences (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  image_id uuid not null references public.case_images(id) on delete restrict,
  model_id uuid not null references public.ai_models(id) on delete restrict,
  suspicion_level public.suspicion_level not null,
  probability numeric(6,5) not null check (probability >= 0 and probability <= 1),
  class_probabilities jsonb not null,
  gradcam_image_id uuid references public.case_images(id) on delete set null,
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  service_request_id text check (service_request_id is null or char_length(service_request_id) <= 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.ai_inferences is
'Resultado de inferencia IA. Es apoyo al triaje, no diagnostico medico.';

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  inference_id uuid references public.ai_inferences(id) on delete set null,
  suspicion_level public.suspicion_level not null,
  urgency_level public.urgency_level not null,
  professional_referral boolean not null default false,
  reason_codes text[] not null default '{}',
  message text not null check (char_length(message) <= 3000),
  created_at timestamptz not null default now()
);

comment on table public.recommendations is
'Recomendacion preventiva generada combinando IA, cuestionario y reglas conservadoras.';

create table public.pdf_reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  generated_by uuid references public.profiles(id) on delete set null,
  bucket_name text not null check (char_length(bucket_name) <= 80),
  object_path text not null check (char_length(object_path) <= 500),
  report_hash text check (report_hash is null or char_length(report_hash) = 64),
  report_version text not null default 'mvp-v1' check (char_length(report_version) <= 80),
  created_at timestamptz not null default now(),
  unique(bucket_name, object_path)
);

comment on table public.pdf_reports is
'Metadata de reportes PDF privados de derivacion preventiva.';

create table public.specialist_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  decision public.review_decision not null,
  corrected_suspicion_level public.suspicion_level,
  clinical_notes text not null check (char_length(clinical_notes) <= 5000),
  recommended_action text check (recommended_action is null or char_length(recommended_action) <= 2000),
  created_at timestamptz not null default now()
);

comment on table public.specialist_reviews is
'Revision profesional del caso. No reemplaza historia clinica ni diagnostico definitivo.';

create table public.triage_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) <= 80),
  description text not null check (char_length(description) <= 1000),
  is_active boolean not null default true,
  rule_config jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.triage_rules is
'Reglas configurables del motor de recomendacion preventiva.';

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (char_length(action) <= 120),
  entity_type text not null check (char_length(entity_type) <= 120),
  entity_id uuid,
  case_id uuid references public.cases(id) on delete set null,
  ip_hash text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
'Auditoria funcional de acciones criticas. No almacenar IP cruda ni datos innecesarios.';

create table public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  function_name text not null check (char_length(function_name) <= 120),
  method text not null check (method in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS')),
  status_code integer check (status_code is null or status_code between 100 and 599),
  actor_id uuid references public.profiles(id) on delete set null,
  case_id uuid references public.cases(id) on delete set null,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 120),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.api_request_logs is
'Logs tecnicos de Edge Functions para observabilidad y depuracion.';

create table public.system_settings (
  key text primary key check (char_length(key) <= 120),
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.system_settings is
'Configuraciones globales controladas por administradores.';
