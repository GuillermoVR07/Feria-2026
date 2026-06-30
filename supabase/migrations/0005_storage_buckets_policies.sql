-- ============================================================
-- MIGRACION: 0005_storage_buckets_policies.sql
-- Proyecto: OralDiagnostic
-- Proposito: Crear buckets privados para archivos sensibles del MVP.
-- Nota: Por decision de seguridad, no se crean politicas amplias
-- sobre storage.objects en esta fase. La lectura y carga se haran
-- mediante Edge Functions y URLs firmadas de corta duracion.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('case-originals', 'case-originals', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('case-gradcam', 'case-gradcam', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('case-reports', 'case-reports', false, 10485760, array['application/pdf']),
  ('case-thumbnails', 'case-thumbnails', false, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
