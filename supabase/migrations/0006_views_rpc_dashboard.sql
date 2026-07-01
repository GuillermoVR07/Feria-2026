-- ============================================================
-- MIGRACION: 0006_views_rpc_dashboard.sql
-- Proyecto: OralDiagnostic
-- Proposito: Vistas agregadas y RPC de apoyo para dashboard/backend.
-- ============================================================

create or replace view public.v_dashboard_metrics
with (security_invoker = true)
as
select
  count(*) filter (where c.created_at >= now() - interval '30 days') as cases_last_30_days,
  count(*) as total_cases,
  count(*) filter (where c.status = 'under_review') as pending_review,
  count(*) filter (where c.final_suspicion_level = 'low') as low_cases,
  count(*) filter (where c.final_suspicion_level = 'moderate') as moderate_cases,
  count(*) filter (where c.final_suspicion_level = 'high') as high_cases,
  count(*) filter (where c.status = 'image_rejected') as image_rejected_cases,
  avg(ai.latency_ms) as average_ai_latency_ms
from public.cases c
left join lateral (
  select ai2.latency_ms
  from public.ai_inferences ai2
  where ai2.case_id = c.id
  order by ai2.created_at desc
  limit 1
) ai on true
where c.deleted_at is null;

comment on view public.v_dashboard_metrics is
'Metricas agregadas del sistema. No expone datos personales ni imagenes. Usa security_invoker para respetar RLS.';

create or replace view public.v_cases_for_review
with (security_invoker = true)
as
select
  c.id as case_id,
  c.case_code,
  c.status,
  c.lesion_site,
  c.lesion_duration_days,
  c.final_suspicion_level,
  c.final_urgency_level,
  c.created_at,
  r.professional_referral,
  r.reason_codes
from public.cases c
left join lateral (
  select r2.*
  from public.recommendations r2
  where r2.case_id = c.id
  order by r2.created_at desc
  limit 1
) r on true
where c.deleted_at is null
  and c.status in ('analyzed', 'recommendation_ready', 'reported', 'under_review', 'reviewed')
  and (
    c.final_suspicion_level in ('moderate', 'high')
    or c.final_urgency_level in ('priority', 'urgent')
    or r.professional_referral = true
  );

comment on view public.v_cases_for_review is
'Cola de casos que justifican revision profesional. No incluye imagenes, notas clinicas ni rutas internas.';

create or replace function public.validate_case_access_token(
  p_case_code text,
  p_token_hash text,
  p_purpose public.case_token_purpose
)
returns table (
  case_id uuid,
  token_id uuid,
  is_valid boolean,
  invalid_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case_id uuid;
  v_token record;
begin
  select c.id
  into v_case_id
  from public.cases c
  where c.case_code = p_case_code
    and c.deleted_at is null;

  if v_case_id is null then
    return query select null::uuid, null::uuid, false, 'CASE_NOT_FOUND'::text;
    return;
  end if;

  select *
  into v_token
  from public.case_access_tokens t
  where t.case_id = v_case_id
    and t.token_hash = p_token_hash
    and t.purpose = p_purpose
  order by t.created_at desc
  limit 1;

  if v_token.id is null then
    return query select v_case_id, null::uuid, false, 'TOKEN_NOT_FOUND'::text;
    return;
  end if;

  if v_token.revoked_at is not null then
    return query select v_case_id, v_token.id, false, 'TOKEN_REVOKED'::text;
    return;
  end if;

  if v_token.expires_at <= now() then
    return query select v_case_id, v_token.id, false, 'TOKEN_EXPIRED'::text;
    return;
  end if;

  return query select v_case_id, v_token.id, true, null::text;
end;
$$;

comment on function public.validate_case_access_token(text, text, public.case_token_purpose) is
'Valida token temporal hasheado asociado a un caso anonimo. Uso previsto: Edge Functions/backend, no frontend publico.';

revoke all on public.v_dashboard_metrics from public;
revoke all on public.v_dashboard_metrics from anon;
revoke all on public.v_dashboard_metrics from authenticated;
revoke all on public.v_dashboard_metrics from service_role;
revoke all on public.v_cases_for_review from public;
revoke all on public.v_cases_for_review from anon;
revoke all on public.v_cases_for_review from authenticated;
revoke all on public.v_cases_for_review from service_role;
grant select on public.v_dashboard_metrics to authenticated;
grant select on public.v_cases_for_review to authenticated;
grant select on public.v_dashboard_metrics to service_role;
grant select on public.v_cases_for_review to service_role;

revoke execute on function public.validate_case_access_token(text, text, public.case_token_purpose) from public;
revoke execute on function public.validate_case_access_token(text, text, public.case_token_purpose) from anon;
revoke execute on function public.validate_case_access_token(text, text, public.case_token_purpose) from authenticated;
grant execute on function public.validate_case_access_token(text, text, public.case_token_purpose) to service_role;
