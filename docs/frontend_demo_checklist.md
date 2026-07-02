# Checklist QA frontend demo - OralDiagnostic

Fecha: 2026-07-02

## Automatizado

- `corepack pnpm lint`
- `corepack pnpm test:unit`
- `corepack pnpm test:e2e`
- `corepack pnpm build`

## Flujo publico

- Abrir `/`.
- Iniciar caso anonimo.
- Confirmar que no avanza sin consentimiento.
- Crear caso sin datos identificables.
- Guardar cuestionario con booleanos reales.
- Subir imagen por URL firmada.
- Mostrar rechazo de calidad y permitir nueva captura.
- Ejecutar inferencia solo por Supabase Edge Function.
- Generar reporte PDF firmado.
- Mostrar resultado preventivo con disclaimer.
- Ocultar Grad-CAM cuando no exista URL real.

## Panel interno

- Abrir `/login`.
- Iniciar sesion con usuario interno real.
- Confirmar bloqueo de `/panel` sin sesion.
- Confirmar dashboard con `dashboard-metrics`.
- Confirmar revision con `review-case` usando usuario `admin` o `specialist`.
- No consultar tablas directas desde el navegador para cola de revision.

## PWA

- Verificar `manifest.webmanifest`.
- Verificar `/sw.js` en build de produccion.
- Instalar PWA en navegador compatible.
- Probar fallback `/~offline`.
- Confirmar que no se cachean tokens, URLs firmadas ni rutas de resultado/reporte.

## Seguridad y lenguaje

- No exponer `SUPABASE_SERVICE_ROLE_KEY`, `AI_SERVICE_TOKEN`, `CASE_TOKEN_SECRET` ni secretos.
- No registrar `case_token` en consola.
- No usar buckets publicos.
- No llamar Hugging Face para inferencia desde el navegador.
- No usar textos como "cancer detectado", "diagnostico positivo" o "resultado definitivo".
- Mostrar siempre: "Este sistema no emite diagnostico medico. El resultado es una orientacion preventiva de triaje visual y debe ser revisado por un profesional de salud."

## Pendientes manuales

- Probar con usuario interno real de Supabase Auth.
- Despertar Hugging Face en `/health` antes de la feria.
- Probar en telefono fisico la captura con camara.
- Confirmar CORS del dominio final antes de desplegar publicamente.
