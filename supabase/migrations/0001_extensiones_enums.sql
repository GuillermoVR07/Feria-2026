-- ============================================================
-- MIGRACION: 0001_extensiones_enums.sql
-- Proyecto: OralDiagnostic
-- Proposito: Crear extensiones y tipos enumerados controlados.
-- ============================================================

-- Extension para UUID y funciones criptograficas.
create extension if not exists pgcrypto;

-- Rol interno de usuarios autenticados.
create type public.app_role as enum (
  'admin',
  'specialist',
  'promoter',
  'researcher'
);

comment on type public.app_role is
'Roles internos del sistema OralDiagnostic. No incluye visitante anonimo.';

-- Sexo biologico/declarado con opcion de no especificar.
create type public.biological_sex as enum (
  'female',
  'male',
  'other',
  'not_specified'
);

comment on type public.biological_sex is
'Sexo declarado de forma general y no identificable.';

-- Estado operativo del caso.
create type public.case_status as enum (
  'draft',
  'consent_accepted',
  'demographics_completed',
  'questionnaire_completed',
  'image_upload_requested',
  'image_uploaded',
  'quality_check_pending',
  'image_rejected',
  'quality_accepted',
  'ai_pending',
  'ai_failed',
  'analyzed',
  'recommendation_ready',
  'reported',
  'under_review',
  'reviewed',
  'closed',
  'failed'
);

comment on type public.case_status is
'Estado del flujo backend del caso de triaje.';

-- Zona bucal afectada.
create type public.lesion_site as enum (
  'lip',
  'tongue',
  'gum',
  'palate',
  'floor_of_mouth',
  'cheek_mucosa',
  'other',
  'not_specified'
);

comment on type public.lesion_site is
'Zona anatomica bucal reportada para el caso.';

-- Fuente de captura de imagen.
create type public.capture_source as enum (
  'camera',
  'gallery'
);

comment on type public.capture_source is
'Origen de la imagen cargada por el usuario.';

-- Tipo de imagen almacenada.
create type public.image_kind as enum (
  'original',
  'gradcam',
  'thumbnail',
  'report_embedded'
);

comment on type public.image_kind is
'Clasificacion del objeto de imagen almacenado en Storage.';

-- Estado de calidad de imagen.
create type public.image_quality_status as enum (
  'pending',
  'accepted',
  'rejected',
  'error'
);

comment on type public.image_quality_status is
'Resultado de validacion tecnica de imagen.';

-- Nivel de sospecha visual.
create type public.suspicion_level as enum (
  'invalid_image',
  'low',
  'moderate',
  'high'
);

comment on type public.suspicion_level is
'Nivel de sospecha visual usado como apoyo al triaje. No representa diagnostico medico.';

-- Nivel de urgencia preventiva.
create type public.urgency_level as enum (
  'none',
  'routine',
  'priority',
  'urgent'
);

comment on type public.urgency_level is
'Nivel de urgencia preventiva para recomendacion de derivacion.';

-- Decision de revision profesional.
create type public.review_decision as enum (
  'confirm_ai',
  'correct_ai',
  'needs_clinical_evaluation',
  'insufficient_information'
);

comment on type public.review_decision is
'Decision registrada por especialista durante revision del caso.';

-- Proposito de token temporal.
create type public.case_token_purpose as enum (
  'case_result_access',
  'image_upload',
  'report_download'
);

comment on type public.case_token_purpose is
'Proposito controlado para tokens temporales asociados a casos anonimos.';
