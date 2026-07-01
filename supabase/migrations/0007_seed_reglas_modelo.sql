-- ============================================================
-- MIGRACION: 0007_seed_reglas_modelo.sql
-- Proyecto: OralDiagnostic
-- Proposito: Cargar reglas preventivas iniciales, settings y
-- registrar el modelo IA MVP como inactivo hasta configurar AI service.
-- ============================================================

insert into public.triage_rules (code, description, is_active, rule_config)
values
  (
    'RULE_IMAGE_REJECTED',
    'Si la imagen no supera la validacion de calidad, no se ejecuta IA y se solicita nueva captura.',
    true,
    '{"condition":"image_quality_status = rejected","urgency_level":"none","professional_referral":false}'::jsonb
  ),
  (
    'RULE_AI_HIGH',
    'Si la IA clasifica sospecha alta, se recomienda evaluacion profesional prioritaria.',
    true,
    '{"condition":"ai_level = high","urgency_level":"urgent","professional_referral":true}'::jsonb
  ),
  (
    'RULE_AI_MODERATE',
    'Si la IA clasifica sospecha moderada, se recomienda evaluacion profesional.',
    true,
    '{"condition":"ai_level = moderate","urgency_level":"priority","professional_referral":true}'::jsonb
  ),
  (
    'RULE_DURATION_ALERT_SYMPTOMS',
    'Si la lesion dura mas de 14 dias y presenta senales de alerta, se eleva recomendacion a profesional aunque la IA sea baja.',
    true,
    '{"condition":"lesion_duration_days > 14 and alert_symptoms = true","urgency_level":"priority","professional_referral":true}'::jsonb
  ),
  (
    'RULE_DYSPHAGIA_GROWTH_LUMP',
    'Si existe dificultad para tragar acompanada de crecimiento o bulto, se recomienda evaluacion prioritaria.',
    true,
    '{"condition":"dysphagia = true and (growth = true or lump_or_induration = true)","urgency_level":"urgent","professional_referral":true}'::jsonb
  ),
  (
    'RULE_AI_LOW_MONITORING',
    'Si la IA es baja y no existen criterios de alerta, se sugiere monitoreo y consulta si persiste o empeora.',
    true,
    '{"condition":"ai_level = low and alert_symptoms = false","urgency_level":"routine","professional_referral":false}'::jsonb
  )
on conflict (code) do update
set
  description = excluded.description,
  is_active = excluded.is_active,
  rule_config = excluded.rule_config,
  updated_at = now();

insert into public.ai_models (
  name,
  version,
  architecture,
  storage_path,
  input_shape,
  class_labels,
  threshold_config,
  metrics,
  is_active
)
values (
  'oral-lesion-triage-cnn',
  '1.0.0',
  'mobilenetv3-small',
  'models/oral-lesion-triage-cnn/1.0.0/model.keras',
  '[224,224,3]'::jsonb,
  '["low","moderate","high"]'::jsonb,
  '{"low_max":0.25,"moderate_max":0.55,"high_min":0.56}'::jsonb,
  '{"accuracy":null,"precision":null,"recall":null,"f1_score":null,"notes":"Modelo inicial pendiente de validacion clinica externa. Se registra inactivo porque aun no existe AI_SERVICE_URL ni servicio IA operativo configurado."}'::jsonb,
  false
)
on conflict (name, version) do update
set
  architecture = excluded.architecture,
  storage_path = excluded.storage_path,
  input_shape = excluded.input_shape,
  class_labels = excluded.class_labels,
  threshold_config = excluded.threshold_config,
  metrics = excluded.metrics,
  is_active = excluded.is_active;

insert into public.system_settings (key, value, description, is_public)
values
  (
    'medical_disclaimer',
    '{"text":"Este sistema es una herramienta de apoyo al triaje preventivo. No constituye diagnostico medico ni confirma o descarta cancer bucal."}'::jsonb,
    'Texto obligatorio de advertencia medica.',
    true
  ),
  (
    'image_quality_thresholds',
    '{"min_width":640,"min_height":480,"max_size_bytes":10485760,"allowed_mime_types":["image/jpeg","image/png","image/webp"],"min_sharpness_score":100,"min_brightness_score":40,"max_brightness_score":220,"min_contrast_score":20}'::jsonb,
    'Umbrales iniciales de calidad de imagen para MVP.',
    false
  ),
  (
    'signed_url_expiration',
    '{"upload_seconds":300,"read_seconds":600,"report_seconds":900}'::jsonb,
    'Duracion de URLs firmadas.',
    false
  )
on conflict (key) do update
set
  value = excluded.value,
  description = excluded.description,
  is_public = excluded.is_public,
  updated_at = now();
