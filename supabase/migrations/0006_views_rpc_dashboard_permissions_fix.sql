-- ============================================================
-- MIGRACION: 0006_views_rpc_dashboard_permissions_fix.sql
-- Proyecto: OralDiagnostic
-- Proposito: Ajustar permisos minimos de vistas de Fase 8.
-- ============================================================

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
