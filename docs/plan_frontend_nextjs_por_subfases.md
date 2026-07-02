# Plan frontend Next.js por subfases - OralDiagnostic MVP

Fecha: 2026-07-02

## Proposito

Este documento convierte el plan frontend general en un plan de ejecucion por subfases para construir el frontend MVP de OralDiagnostic con Next.js, TypeScript, Tailwind CSS v4 y PWA.

El objetivo es que el desarrollo pueda hacerse con Codex u otro agente sin inventar arquitectura, endpoints, campos, contratos, roles ni flujos. El proyecto es para feria de investigacion y simulacion; no es un producto clinico de produccion ni debe presentarse como diagnostico medico.

## Documentos revisados

Se usaron como contexto los archivos existentes de `docs/`:

- `docs/proyecto_por_fases.md`
- `docs/backend_supabase_por_fases.md`
- `docs/fase_0_al_5.md`
- `docs/fase_6_al_7.md`
- `docs/fase_8_al_9.md`
- `docs/fase_10.md`
- `docs/fase_11.md`
- `docs/fase_12_13.md`
- `docs/fase_14.md`
- `docs/fase_15.md`
- `docs/fase_16.md`
- `docs/fase_17.md`
- `docs/fase_18.md`
- `docs/frontend_backend_ia_plan.md`
- `docs/plan_frontend_nextjs_pwa.md`
- `docs/proyecto_modelo_ia.md`
- `docs/plan_modelo_ia.md`
- `docs/implementarIA.md`
- `docs/deno.md`
- `BACKEND_REVISION.md`

Tambien se contrasto con documentacion tecnica actual:

- Next.js App Router: https://nextjs.org/docs/app/getting-started/installation
- Next.js PWA: https://nextjs.org/docs/app/guides/progressive-web-apps
- Next.js env vars: https://nextjs.org/docs/app/guides/environment-variables
- Tailwind CSS v4 con Next.js: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Supabase con Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Serwist con Next.js: https://serwist.pages.dev/docs/next/getting-started

## Alcance del MVP frontend

Debe implementarse una PWA que permita:

1. Crear un caso anonimo.
2. Registrar consentimiento informado.
3. Capturar datos anonimos minimos.
4. Responder cuestionario de riesgo.
5. Capturar o subir imagen.
6. Subir imagen mediante URL firmada de Supabase.
7. Validar calidad de imagen.
8. Ejecutar inferencia mediante Supabase Edge Function.
9. Mostrar resultado preventivo.
10. Descargar reporte PDF firmado.
11. Acceder a login interno.
12. Mostrar dashboard basico.
13. Permitir revision especialista/admin si hay usuario interno.

Fuera del alcance:

- Diagnostico medico.
- Llamar la IA directamente desde el navegador.
- Exponer buckets publicos.
- Exponer secretos.
- Reentrenamiento de modelo.
- Modo offline completo para crear casos sin internet.

## Arquitectura obligatoria

Flujo permitido:

```text
Next.js PWA -> Supabase Edge Functions -> Supabase DB/Storage -> Servicio IA Hugging Face
```

Flujo prohibido:

```text
Next.js PWA -> Servicio IA Hugging Face para inferencia
```

Excepcion permitida:

```text
GET https://guillermovr-oraldiagnostic-ai-service.hf.space/health
```

Solo se usa para mostrar estado tecnico de demo. La inferencia siempre pasa por `run-inference`.

## Stack obligatorio

| Area | Tecnologia | Motivo |
|---|---|---|
| Framework | Next.js App Router | Rutas modernas, layouts, Server/Client Components. |
| Lenguaje | TypeScript | Contratos claros y menor riesgo de errores. |
| CSS | Tailwind CSS v4 | Desarrollo rapido y responsive. |
| UI | shadcn/ui | Componentes accesibles y consistentes. |
| Iconos | lucide-react | Iconografia rapida y uniforme. |
| Formularios | react-hook-form | Formularios eficientes para el flujo largo. |
| Validacion | zod | Validar payloads antes de llamar Supabase. |
| Datos remotos | @tanstack/react-query | Loading, error, retry y mutations controladas. |
| Supabase | @supabase/supabase-js | Auth interno y cliente publico. |
| PWA | @serwist/next + serwist | Service worker y fallback offline. |
| Toasts | sonner | Mensajes no intrusivos. |
| Fechas | date-fns | Formato de fechas. |
| Graficos | recharts | Dashboard MVP. |
| Tablas | @tanstack/react-table | Cola de revision y dashboard. |
| Imagenes | browser-image-compression | Compresion opcional antes del upload. |
| Tests | Vitest, Testing Library, Playwright | QA minimo de demo. |

## Estructura modular esperada

```text
apps/web/
  .env.example
  .env.local
  next.config.ts
  postcss.config.mjs
  public/
    icons/
    screenshots/
  src/
    app/
      layout.tsx
      page.tsx
      manifest.ts
      sw.ts
      ~offline/page.tsx
      (public)/
      (auth)/
      panel/
    components/
      ui/
      layout/
      case-flow/
      image-upload/
      results/
      dashboard/
      review/
      shared/
    config/
      env.client.ts
      env.server.ts
      constants.ts
    features/
      cases/
      questionnaire/
      images/
      inference/
      reports/
      auth/
      dashboard/
      review/
    lib/
      supabase/
      http/
      query/
      utils/
    styles/
      globals.css
    tests/
      unit/
      e2e/
```

## Variables de entorno

### `.env.example`

```text
NEXT_PUBLIC_APP_NAME=OralDiagnostic
NEXT_PUBLIC_APP_ENV=demo
NEXT_PUBLIC_SUPABASE_URL=https://lsicnvutjvemohcxiwjk.supabase.co
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://lsicnvutjvemohcxiwjk.functions.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REEMPLAZAR
NEXT_PUBLIC_AI_HEALTH_URL=https://guillermovr-oraldiagnostic-ai-service.hf.space/health
```

### `.env.local`

```text
NEXT_PUBLIC_APP_NAME=OralDiagnostic
NEXT_PUBLIC_APP_ENV=demo
NEXT_PUBLIC_SUPABASE_URL=https://lsicnvutjvemohcxiwjk.supabase.co
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL=https://lsicnvutjvemohcxiwjk.functions.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_AI_HEALTH_URL=https://guillermovr-oraldiagnostic-ai-service.hf.space/health
```

### Nunca poner en frontend

```text
SUPABASE_SERVICE_ROLE_KEY
AI_SERVICE_TOKEN
CASE_TOKEN_SECRET
JWT_SECRET
```

## Contratos Supabase que debe consumir el frontend

| Funcion | Metodo | Uso frontend |
|---|---|---|
| `health-check` | GET/POST segun funcion desplegada | Verificar backend tecnico. |
| `create-case` | POST | Crear caso anonimo y recibir `case_code` + `case_token`. |
| `submit-questionnaire` | POST | Registrar cuestionario. |
| `request-image-upload` | POST | Pedir URL firmada de subida. |
| `finalize-image-upload` | POST | Confirmar que el archivo quedo en Storage. |
| `validate-image` | POST | Validar calidad tecnica antes de IA. |
| `run-inference` | POST | Ejecutar IA desde Supabase, no desde frontend. |
| `generate-report` | POST | Crear PDF y obtener URL firmada. |
| `get-case-result` | POST | Mostrar resultado final. |
| `review-case` | POST | Revision especialista/admin. |
| `dashboard-metrics` | GET/POST segun funcion desplegada | Metricas internas. |

Pendiente conocido: `get-case-result` aun no devuelve `result.reason_codes`, aunque el backend genera y guarda `reason_codes` en recomendaciones. No bloquear el MVP si no se muestran codigos de razon.

## Flujo publico completo

1. Usuario abre `/`.
2. Acepta consentimiento.
3. UI llama `create-case`.
4. Guardar `case_id`, `case_code`, `case_token` en `sessionStorage`.
5. Usuario responde cuestionario.
6. UI llama `submit-questionnaire`.
7. Usuario carga o captura imagen.
8. UI valida MIME, peso y metadatos.
9. UI llama `request-image-upload`.
10. UI hace `PUT upload_url` con el archivo.
11. UI llama `finalize-image-upload`.
12. UI llama `validate-image`.
13. Si calidad es rechazada, pedir nueva imagen.
14. Si calidad es aceptada, UI llama `run-inference`.
15. UI llama `generate-report`.
16. UI llama `get-case-result`.
17. UI muestra resultado preventivo, disclaimer y descarga de PDF.

## Subfase 0.1 - Preparacion del workspace

Objetivo: preparar el repositorio sin borrar el frontend estatico existente.

Archivos a crear/modificar:

- `.gitignore`
- `apps/` si no existe
- `apps/web/` solo cuando se apruebe implementar

Librerias usadas: ninguna.

Endpoints Supabase: ninguno.

Variables de entorno: ninguna.

Pasos:

1. Revisar estructura actual del repo.
2. Confirmar que el frontend nuevo vivira en `apps/web`.
3. Mantener `frontend/` como referencia visual o respaldo de demo.
4. Confirmar que se usara `pnpm`.
5. Confirmar Node compatible con Next.js actual.
6. Preparar `.gitignore` para `.env.local`, `.next`, `node_modules`, archivos Serwist generados y reportes de test.

Criterios de aceptacion:

- No se borra `frontend/`.
- Existe decision clara: frontend final en `apps/web`.
- `.env.local` no se versiona.

Riesgos o advertencias:

- Crear Next.js encima de una carpeta con archivos existentes puede fallar o pisar archivos.

Que NO hacer:

- No mover ni borrar `frontend/`.
- No copiar secretos al repo.

## Subfase 0.2 - Scaffolding Next.js

Objetivo: crear la base Next.js con TypeScript, App Router y Tailwind CSS.

Archivos a crear/modificar:

- `apps/web/package.json`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/globals.css` o `src/styles/globals.css`
- `apps/web/tsconfig.json`
- `apps/web/next.config.ts`

Librerias usadas:

- next
- react
- react-dom
- typescript
- tailwindcss
- eslint

Endpoints Supabase: ninguno.

Variables de entorno: ninguna todavia.

Pasos:

1. Crear `apps/web` con `create-next-app`.
2. Usar App Router.
3. Usar `src/`.
4. Configurar alias `@/*`.
5. Usar Tailwind CSS v4.
6. Verificar que `pnpm dev` abre la app.
7. Verificar que `pnpm build` compila.

Comando sugerido:

```bash
pnpm create next-app@latest apps/web --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Criterios de aceptacion:

- `apps/web` existe.
- La app corre en desarrollo.
- El build inicial compila.

Riesgos o advertencias:

- Si `apps/web` ya existe y no esta vacia, revisar antes de usar `--force`.

Que NO hacer:

- No crear Pages Router.
- No mezclar el frontend estatico con el nuevo.

## Subfase 0.3 - Instalacion de librerias

Objetivo: instalar librerias necesarias para acelerar el MVP sin sobredisenar.

Archivos a crear/modificar:

- `apps/web/package.json`
- `apps/web/pnpm-lock.yaml`
- `apps/web/components.json` al inicializar shadcn/ui

Librerias usadas:

- `@supabase/supabase-js`
- `@tanstack/react-query`
- `zod`
- `react-hook-form`
- `@hookform/resolvers`
- `lucide-react`
- `sonner`
- `date-fns`
- `recharts`
- `@tanstack/react-table`
- `clsx`
- `tailwind-merge`
- `class-variance-authority`
- `browser-image-compression`
- `@serwist/next`
- `serwist`
- `vitest`
- `@testing-library/react`
- `@testing-library/jest-dom`
- `playwright`

Endpoints Supabase: ninguno.

Variables de entorno: ninguna.

Pasos:

1. Instalar dependencias runtime.
2. Instalar dependencias dev.
3. Inicializar shadcn/ui.
4. Agregar componentes shadcn necesarios: button, input, textarea, select, checkbox, radio-group, form, card, badge, alert, dialog, sheet, tabs, table, separator, skeleton, progress, sonner.
5. Aplicar ajuste de fuente Geist/Tailwind v4 si shadcn genera referencias circulares en `@theme inline`.

Criterios de aceptacion:

- El lockfile existe.
- La app sigue compilando.
- shadcn/ui esta listo.

Riesgos o advertencias:

- No dejar dependencias sin lockfile.

Que NO hacer:

- No instalar librerias grandes sin uso claro.
- No agregar Redux para este MVP.

## Subfase 1.1 - Variables de entorno

Objetivo: separar configuracion publica y privada de forma segura.

Archivos a crear/modificar:

- `apps/web/.env.example`
- `apps/web/.env.local`
- `apps/web/src/config/env.client.ts`
- `apps/web/src/config/env.server.ts`

Librerias usadas:

- zod

Endpoints Supabase:

- `health-check` para primera prueba posterior.

Variables:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_AI_HEALTH_URL`

Pasos:

1. Crear `.env.example`.
2. Crear `.env.local` local con la publishable key real.
3. Crear `env.client.ts` validando solo `NEXT_PUBLIC_*`.
4. Crear `env.server.ts` reservado para futuro.
5. Documentar que secretos de Supabase e IA solo viven en Supabase Edge Functions.

Criterios de aceptacion:

- La app falla con mensaje claro si falta una variable publica.
- No hay secretos en archivos frontend.

Riesgos o advertencias:

- Todo `NEXT_PUBLIC_*` se expone al navegador.

Que NO hacer:

- No poner `SUPABASE_SERVICE_ROLE_KEY`.
- No poner `AI_SERVICE_TOKEN`.
- No poner `CASE_TOKEN_SECRET`.

## Subfase 1.2 - Configuracion base de aplicacion

Objetivo: preparar layout, estilos y providers.

Archivos a crear/modificar:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/styles/globals.css`
- `src/lib/query/provider.tsx`
- `src/lib/query/query-client.tsx`
- `src/lib/utils/cn.ts`

Librerias usadas:

- @tanstack/react-query
- sonner
- clsx
- tailwind-merge
- next/font

Endpoints Supabase: ninguno.

Variables: `NEXT_PUBLIC_APP_NAME`.

Pasos:

1. Configurar metadata base.
2. Configurar fuente con `next/font`.
3. Agregar `QueryProvider`.
4. Agregar `Toaster`.
5. Crear helper `cn`.
6. Establecer estilos globales con Tailwind v4.

Criterios de aceptacion:

- Layout renderiza todas las rutas.
- React Query disponible.
- Toasts disponibles.
- No hay errores de hidratacion.

Riesgos o advertencias:

- Evitar poner toda la app como Client Component.

Que NO hacer:

- No inicializar clientes con secretos en scope global.

## Subfase 1.3 - Cliente Supabase y Edge Functions

Objetivo: centralizar toda comunicacion con Supabase.

Archivos a crear/modificar:

- `src/lib/supabase/browser.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/edge-functions.ts`
- `src/lib/http/errors.ts`
- `src/lib/http/result.ts`

Librerias usadas:

- @supabase/supabase-js
- zod

Endpoints Supabase:

- `health-check`

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Crear cliente browser con publishable key.
2. Crear cliente server si se necesita para Auth interno.
3. Crear `callEdgeFunction`.
4. Agregar headers `Content-Type`, `apikey` y `Authorization` con publishable key si aplica.
5. Normalizar errores.
6. Agregar timeout.
7. Probar `health-check`.

Criterios de aceptacion:

- Una llamada a `health-check` funciona desde la app.
- Todas las funciones usan el mismo helper.

Riesgos o advertencias:

- Las funciones publicas pueden tener `verify_jwt: false`, pero la seguridad del caso depende de `case_code + case_token`.

Que NO hacer:

- No duplicar `fetch` para cada pantalla.
- No llamar tablas sensibles directamente desde anonimo.

## Subfase 2.1 - Rutas publicas base

Objetivo: crear el esqueleto navegable del flujo publico.

Archivos a crear/modificar:

- `src/app/page.tsx`
- `src/app/(public)/casos/nuevo/page.tsx`
- `src/app/(public)/casos/nuevo/consentimiento/page.tsx`
- `src/app/(public)/casos/nuevo/datos/page.tsx`
- `src/app/(public)/casos/nuevo/cuestionario/page.tsx`
- `src/app/(public)/casos/nuevo/imagen/page.tsx`
- `src/app/(public)/casos/[caseCode]/procesando/page.tsx`
- `src/app/(public)/casos/[caseCode]/resultado/page.tsx`
- `src/app/(public)/casos/[caseCode]/reporte/page.tsx`

Librerias usadas:

- next/link
- shadcn/ui
- lucide-react

Endpoints Supabase: ninguno en esta subfase.

Variables: ninguna nueva.

Pasos:

1. Crear rutas.
2. Crear layout visual del flujo.
3. Crear stepper de avance.
4. Crear estados vacios.
5. Agregar disclaimer visible.

Criterios de aceptacion:

- Todas las rutas abren.
- La navegacion basica funciona.
- El copy no usa lenguaje diagnostico.

Riesgos o advertencias:

- No hacer landing de marketing pesada; la primera pantalla debe iniciar la experiencia.

Que NO hacer:

- No mostrar "diagnostico".
- No prometer exactitud clinica.

## Subfase 2.2 - Consentimiento y creacion de caso

Objetivo: crear caso anonimo real en Supabase.

Archivos a crear/modificar:

- `src/features/cases/api.ts`
- `src/features/cases/schemas.ts`
- `src/features/cases/types.ts`
- `src/features/cases/store.ts`
- `src/app/(public)/casos/nuevo/consentimiento/page.tsx`
- `src/app/(public)/casos/nuevo/datos/page.tsx`

Librerias usadas:

- react-hook-form
- zod
- @hookform/resolvers
- @tanstack/react-query

Endpoint Supabase:

- `create-case`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Crear schema de consentimiento y datos anonimos.
2. Enviar payload a `create-case`.
3. Guardar `case_id`, `case_code`, `case_token`, `status` en `sessionStorage`.
4. Redirigir a cuestionario.
5. Evitar logs con `case_token`.

Criterios de aceptacion:

- Caso creado correctamente.
- El usuario no avanza sin consentimiento.
- El token queda solo en `sessionStorage`.

Riesgos o advertencias:

- Si `case_token` se pierde, el usuario debe iniciar nuevo caso.

Que NO hacer:

- No guardar `case_token` en consola.
- No usar `localStorage` salvo decision explicita.
- No pedir nombre, cedula, telefono ni direccion exacta.

## Subfase 2.3 - Datos anonimos y cuestionario

Objetivo: registrar cuestionario segun contrato real.

Archivos a crear/modificar:

- `src/features/questionnaire/questions.ts`
- `src/features/questionnaire/schemas.ts`
- `src/features/questionnaire/api.ts`
- `src/app/(public)/casos/nuevo/cuestionario/page.tsx`

Librerias usadas:

- react-hook-form
- zod
- @tanstack/react-query
- shadcn/ui

Endpoint Supabase:

- `submit-questionnaire`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Campos exactos:

```text
pain
bleeding
growth
white_patch
red_patch
non_healing_ulcer
lump_or_induration
dysphagia
tobacco_use
alcohol_use
coca_chewing
coca_machucada
bicarbonate_or_additives
dental_prosthesis
constant_friction
notes
```

Pasos:

1. Leer `case_code` y `case_token` desde `sessionStorage`.
2. Validar cuestionario.
3. Llamar `submit-questionnaire`.
4. Redirigir a imagen.

Criterios de aceptacion:

- Cuestionario se guarda.
- Booleanos se envian como booleanos reales.
- Error de cuestionario duplicado se muestra claro.

Riesgos o advertencias:

- El backend puede rechazar duplicados.

Que NO hacer:

- No inventar preguntas nuevas como campos backend.
- No mandar strings `"true"` o `"false"`.

## Subfase 3.1 - Captura y seleccion de imagen

Objetivo: permitir camara/galeria y validar imagen antes de subir.

Archivos a crear/modificar:

- `src/components/image-upload/image-picker.tsx`
- `src/components/image-upload/image-preview.tsx`
- `src/features/images/schemas.ts`
- `src/features/images/utils.ts`
- `src/lib/utils/image-metadata.ts`
- `src/app/(public)/casos/nuevo/imagen/page.tsx`

Librerias usadas:

- browser-image-compression
- shadcn/ui
- lucide-react

Endpoints Supabase: ninguno todavia.

Variables: ninguna nueva.

Pasos:

1. Crear input file con `accept="image/jpeg,image/png,image/webp"`.
2. Permitir `capture` para movil cuando aplique.
3. Mostrar preview.
4. Validar peso maximo 10 MB.
5. Validar MIME.
6. Leer ancho/alto.
7. Comprimir opcionalmente si ayuda al demo.

Criterios de aceptacion:

- El usuario ve la imagen antes de subir.
- Imagen invalida se rechaza en frontend con mensaje claro.

Riesgos o advertencias:

- La validacion frontend no reemplaza `validate-image`.

Que NO hacer:

- No aceptar PDF, HEIC u otros formatos si backend no los acepta.
- No ejecutar IA antes de validacion backend.

## Subfase 3.2 - Upload firmado a Supabase Storage

Objetivo: subir imagen a Storage privado usando URL firmada.

Archivos a crear/modificar:

- `src/features/images/api.ts`
- `src/features/images/types.ts`
- `src/app/(public)/casos/nuevo/imagen/page.tsx`

Librerias usadas:

- @tanstack/react-query

Endpoints Supabase:

- `request-image-upload`
- `finalize-image-upload`
- `validate-image`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Llamar `request-image-upload`.
2. Guardar `image_id`, `upload_url`, `bucket_name`, `object_path`.
3. Subir archivo con `PUT upload_url`.
4. Llamar `finalize-image-upload`.
5. Llamar `validate-image`.
6. Si `quality_status = rejected`, permitir nueva captura.
7. Si `quality_status = accepted`, ir a procesamiento.

Criterios de aceptacion:

- Imagen queda en bucket privado.
- No se usan URLs publicas.
- Rechazo de calidad se muestra con razon.

Riesgos o advertencias:

- La URL firmada puede expirar.

Que NO hacer:

- No hacer publicos los buckets.
- No guardar `upload_url` de forma permanente.

## Subfase 4.1 - Inferencia IA por Supabase

Objetivo: ejecutar IA mediante `run-inference`.

Archivos a crear/modificar:

- `src/features/inference/api.ts`
- `src/features/inference/types.ts`
- `src/app/(public)/casos/[caseCode]/procesando/page.tsx`

Librerias usadas:

- @tanstack/react-query
- sonner
- lucide-react

Endpoint Supabase:

- `run-inference`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_AI_HEALTH_URL` solo para estado tecnico opcional

Pasos:

1. Leer `case_code`, `case_token`, `image_id`.
2. Mostrar timeline de procesamiento.
3. Llamar `run-inference`.
4. Manejar timeout y `AI_SERVICE_UNAVAILABLE`.
5. Indicar que Hugging Face puede tardar al despertar.
6. Continuar a reporte/resultado.

Criterios de aceptacion:

- Inferencia se ejecuta y persiste.
- El frontend nunca llama `/v1/inference/oral-lesion`.

Riesgos o advertencias:

- El modelo actual es apto para pruebas de software, no validacion clinica.

Que NO hacer:

- No enviar `AI_SERVICE_TOKEN` al navegador.
- No interpretar fallo tecnico como resultado medico.

## Subfase 4.2 - Resultado preventivo

Objetivo: mostrar resultado desde `get-case-result`.

Archivos a crear/modificar:

- `src/features/cases/api.ts`
- `src/features/cases/types.ts`
- `src/components/results/risk-summary.tsx`
- `src/components/results/disclaimer.tsx`
- `src/components/results/asset-viewer.tsx`
- `src/app/(public)/casos/[caseCode]/resultado/page.tsx`

Librerias usadas:

- @tanstack/react-query
- shadcn/ui
- lucide-react

Endpoint Supabase:

- `get-case-result`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Llamar `get-case-result`.
2. Mostrar `suspicion_level`, `urgency_level`, `professional_referral` y `message`.
3. Mostrar `medical_disclaimer`.
4. Mostrar imagen original si llega URL firmada.
5. Mostrar Grad-CAM solo si `assets.gradcam_image_url` existe.
6. Si no hay Grad-CAM, mostrar "Grad-CAM no disponible en esta prueba".

Criterios de aceptacion:

- Resultado sale desde backend.
- Disclaimer siempre visible.
- No hay lenguaje diagnostico.

Riesgos o advertencias:

- `reason_codes` esta pendiente en contrato.

Que NO hacer:

- No simular Grad-CAM como real.
- No decir "cancer detectado".

## Subfase 4.3 - Reporte PDF

Objetivo: generar y descargar PDF real de Supabase.

Archivos a crear/modificar:

- `src/features/reports/api.ts`
- `src/features/reports/types.ts`
- `src/components/results/report-actions.tsx`
- `src/app/(public)/casos/[caseCode]/reporte/page.tsx`

Librerias usadas:

- @tanstack/react-query
- shadcn/ui

Endpoint Supabase:

- `generate-report`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Llamar `generate-report`.
2. Recibir `report_id`, `download_url`, `expires_in_seconds`.
3. Mostrar boton de descarga.
4. Manejar expiracion de URL.
5. Permitir reintento si falla.

Criterios de aceptacion:

- PDF se genera desde backend.
- La descarga usa URL firmada.

Riesgos o advertencias:

- La URL expira.

Que NO hacer:

- No generar PDF client-side como reporte oficial.
- No exponer rutas internas de Storage.

## Subfase 5.1 - PWA manifest

Objetivo: permitir instalacion como PWA.

Archivos a crear/modificar:

- `src/app/manifest.ts`
- `public/icons/*`
- `public/screenshots/*` opcional
- `src/app/layout.tsx`

Librerias usadas:

- Next.js MetadataRoute

Endpoints Supabase: ninguno.

Variables:

- `NEXT_PUBLIC_APP_NAME`

Pasos:

1. Crear `manifest.ts`.
2. Definir `name`, `short_name`, `description`, `start_url`, `display`, `theme_color`, `background_color`.
3. Agregar iconos 192x192 y 512x512.
4. Agregar metadata mobile.

Criterios de aceptacion:

- Navegador permite instalar app.
- Manifest valido.

Riesgos o advertencias:

- Iconos deben ser reales o derivados del logo.

Que NO hacer:

- No usar PWA para prometer funcionamiento completo sin internet.

## Subfase 5.2 - Service Worker con Serwist

Objetivo: agregar shell offline seguro.

Archivos a crear/modificar:

- `src/app/sw.ts`
- `src/app/~offline/page.tsx`
- `next.config.ts`
- `.gitignore`

Librerias usadas:

- @serwist/next
- serwist

Endpoints Supabase: ninguno.

Variables: ninguna nueva.

Pasos:

1. Configurar Serwist en `next.config.ts`.
2. Crear service worker.
3. Crear ruta `~offline`.
4. Cachear shell y assets estaticos.
5. Excluir URLs firmadas, respuestas con tokens y endpoints de caso.

Criterios de aceptacion:

- Offline muestra fallback.
- No se cachean datos sensibles.

Riesgos o advertencias:

- Service worker mal configurado puede servir datos obsoletos.

Que NO hacer:

- No cachear `case_token`.
- No cachear `download_url` ni `upload_url`.

## Subfase 6.1 - Login interno

Objetivo: permitir acceso interno con Supabase Auth.

Archivos a crear/modificar:

- `src/app/(auth)/login/page.tsx`
- `src/features/auth/api.ts`
- `src/features/auth/types.ts`
- `src/app/panel/layout.tsx`
- `src/proxy.ts` si se decide proteger rutas a nivel de entrada

Librerias usadas:

- @supabase/supabase-js
- react-hook-form
- zod

Endpoints Supabase:

- Supabase Auth

Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Crear formulario de login.
2. Usar Supabase Auth.
3. Proteger rutas `/panel`.
4. Revalidar permisos en llamadas backend.
5. Mostrar errores claros.

Criterios de aceptacion:

- Usuario interno puede iniciar sesion.
- Usuario anonimo no entra al panel.

Riesgos o advertencias:

- El frontend no es la fuente de autorizacion final.

Que NO hacer:

- No confiar solo en `proxy.ts` para seguridad.
- No usar metadata editable del usuario para permisos.

## Subfase 6.2 - Dashboard

Objetivo: mostrar indicadores basicos para feria.

Archivos a crear/modificar:

- `src/app/panel/dashboard/page.tsx`
- `src/features/dashboard/api.ts`
- `src/features/dashboard/types.ts`
- `src/components/dashboard/metric-card.tsx`
- `src/components/dashboard/charts.tsx`

Librerias usadas:

- recharts
- @tanstack/react-query
- shadcn/ui

Endpoint Supabase:

- `dashboard-metrics`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Llamar `dashboard-metrics` con sesion interna.
2. Mostrar cards.
3. Mostrar graficos.
4. Manejar loading, empty y error.

Criterios de aceptacion:

- Dashboard carga metricas.
- Acceso anonimo bloqueado.

Riesgos o advertencias:

- Falta probar roles internos reales segun `BACKEND_REVISION.md`.

Que NO hacer:

- No mostrar datos sensibles innecesarios.

## Subfase 6.3 - Revision especialista

Objetivo: permitir revision de casos por especialista/admin.

Archivos a crear/modificar:

- `src/app/panel/revision/page.tsx`
- `src/app/panel/revision/[caseId]/page.tsx`
- `src/features/review/api.ts`
- `src/features/review/schemas.ts`
- `src/components/review/review-table.tsx`
- `src/components/review/review-form.tsx`

Librerias usadas:

- @tanstack/react-table
- react-hook-form
- zod
- @tanstack/react-query

Endpoint Supabase:

- `review-case`

Variables:

- `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Pasos:

1. Mostrar cola de revision si el backend la expone o usar endpoint disponible acordado.
2. Mostrar detalle del caso.
3. Registrar clasificacion revisada y observaciones.
4. Llamar `review-case`.
5. Actualizar estado visual.

Criterios de aceptacion:

- Especialista/admin puede registrar revision.
- Anonimo no puede revisar.

Riesgos o advertencias:

- Si no existe endpoint para listar cola, marcar pendiente antes de implementar.

Que NO hacer:

- No inventar endpoint de listado si no esta documentado.
- No simular revision como real sin login.

## Subfase 7.1 - Testing unitario

Objetivo: cubrir logica critica de frontend.

Archivos a crear/modificar:

- `src/tests/unit/*.test.ts`
- `vitest.config.ts`

Librerias usadas:

- vitest
- @testing-library/react
- @testing-library/jest-dom

Endpoints Supabase: mocks del helper.

Variables: variables fake de test.

Pasos:

1. Probar schemas Zod.
2. Probar `edge-functions.ts`.
3. Probar session store.
4. Probar image metadata.
5. Probar error mapper.

Criterios de aceptacion:

- Tests unitarios pasan.
- Errores esperados tienen mensajes claros.

Riesgos o advertencias:

- No hacer tests fragiles de estilos.

Que NO hacer:

- No llamar Supabase real desde unit tests.

## Subfase 7.2 - Testing E2E

Objetivo: validar flujo completo de demo.

Archivos a crear/modificar:

- `playwright.config.ts`
- `src/tests/e2e/public-flow.spec.ts`
- `src/tests/e2e/error-flow.spec.ts`

Librerias usadas:

- Playwright

Endpoints Supabase:

- `create-case`
- `submit-questionnaire`
- `request-image-upload`
- `finalize-image-upload`
- `validate-image`
- `run-inference`
- `generate-report`
- `get-case-result`

Variables:

- variables `NEXT_PUBLIC_*` de test/demo.

Pasos:

1. Probar flujo feliz.
2. Probar consentimiento no aceptado.
3. Probar imagen rechazada.
4. Probar token faltante.
5. Probar IA no disponible si puede simularse.
6. Probar PDF generado.

Criterios de aceptacion:

- Demo completa repetible.
- Errores principales controlados.

Riesgos o advertencias:

- Hugging Face puede dormir y alargar tiempos.

Que NO hacer:

- No depender de datos clinicos reales.

## Subfase 7.3 - QA final para feria

Objetivo: dejar una demo estable y explicable.

Archivos a crear/modificar:

- `docs/frontend_demo_checklist.md` opcional
- capturas o evidencia de prueba opcional

Librerias usadas:

- Playwright
- navegador movil/escritorio

Endpoints Supabase:

- todos los del flujo publico
- `dashboard-metrics`
- `review-case` si aplica

Variables:

- `.env.local` completo con publishable key.

Pasos:

1. Abrir `/health` de IA para despertar Hugging Face.
2. Probar `health-check`.
3. Ejecutar flujo desde movil.
4. Ejecutar flujo desde escritorio.
5. Instalar PWA.
6. Probar offline fallback.
7. Generar PDF.
8. Revisar que no se vea ningun secreto.
9. Revisar que no exista lenguaje diagnostico.

Criterios de aceptacion:

- Demo corre de principio a fin.
- PDF se descarga.
- Disclaimer visible.
- App instalable.

Riesgos o advertencias:

- Si Hugging Face tarda, explicarlo como arranque de servicio gratuito.

Que NO hacer:

- No presentar el resultado como diagnostico.
- No usar casos clinicos reales sin consentimiento.

## Manejo de estados frontend

Estados minimos:

```text
idle
consent_pending
case_created
questionnaire_completed
image_selected
image_uploading
image_uploaded
image_rejected
quality_accepted
running_ai
ai_failed
recommendation_ready
report_generating
reported
under_review
reviewed
failed
```

## Manejo de errores

Errores esperados:

```text
VALIDATION_ERROR
CONSENT_REQUIRED
UNAUTHORIZED
FORBIDDEN
CASE_NOT_FOUND
IMAGE_NOT_FOUND
IMAGE_QUALITY_REJECTED
AI_SERVICE_UNAVAILABLE
REPORT_GENERATION_FAILED
INTERNAL_ERROR
```

Reglas:

- Mostrar mensaje humano.
- Guardar `request_id` si el backend lo devuelve.
- Permitir reintento en IA/PDF.
- Reiniciar caso si falta token.
- Pedir nueva foto si imagen rechazada.

## Seguridad frontend

Reglas obligatorias:

1. No guardar secretos.
2. No imprimir `case_token`.
3. No cachear respuestas con tokens.
4. No usar buckets publicos.
5. No llamar tablas sensibles desde anonimo.
6. No llamar IA para inferencia directa.
7. No mostrar rutas internas de Storage.
8. No depender solo del frontend para permisos internos.

## UI/UX para feria

Principios:

- Mobile-first.
- Flujo guiado por pasos.
- Lenguaje claro y preventivo.
- Botones grandes.
- Indicadores de progreso.
- Estados de carga visibles.
- Dashboard simple para explicar la investigacion.
- Colores sobrios: base clara, acento teal/verde, amber para advertencia, rojo solo para alto riesgo.

Texto obligatorio:

```text
Este sistema no emite diagnostico medico. El resultado es una orientacion preventiva de triaje visual y debe ser revisado por un profesional de salud.
```

Textos prohibidos:

```text
Tienes cancer
Diagnostico positivo
Cancer detectado
Resultado definitivo
```

## Orden recomendado de ejecucion

1. Subfase 0.1 - Preparacion del workspace.
2. Subfase 0.2 - Scaffolding Next.js.
3. Subfase 0.3 - Instalacion de librerias.
4. Subfase 1.1 - Variables de entorno.
5. Subfase 1.2 - Configuracion base.
6. Subfase 1.3 - Cliente Supabase y Edge Functions.
7. Subfase 2.1 - Rutas publicas base.
8. Subfase 2.2 - Consentimiento y caso.
9. Subfase 2.3 - Cuestionario.
10. Subfase 3.1 - Captura de imagen.
11. Subfase 3.2 - Upload firmado y validacion.
12. Subfase 4.1 - Inferencia.
13. Subfase 4.2 - Resultado.
14. Subfase 4.3 - PDF.
15. Subfase 5.1 - Manifest PWA.
16. Subfase 5.2 - Service worker.
17. Subfase 6.1 - Login interno.
18. Subfase 6.2 - Dashboard.
19. Subfase 6.3 - Revision especialista.
20. Subfase 7.1 - Unit tests.
21. Subfase 7.2 - E2E.
22. Subfase 7.3 - QA feria.

Si el tiempo aprieta, prioridad:

```text
Flujo publico completo -> PDF -> PWA instalable -> dashboard simple -> revision especialista
```

## Checklist antes de implementar

- Confirmar uso de `pnpm`.
- Confirmar que el frontend nuevo va en `apps/web`.
- Tener `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Confirmar si panel interno entra en primer corte.
- Decidir si se generan iconos desde `frontend/logo.png`.
- Confirmar dominio final para CORS si se despliega.
- Confirmar si se ajustara `get-case-result` para devolver `reason_codes`.

## Checklist antes de demo

- IA despierta en `/health`.
- Supabase `health-check` responde.
- Flujo anonimo crea caso.
- Cuestionario se guarda.
- Imagen se sube por URL firmada.
- Imagen se valida.
- `run-inference` genera inferencia.
- `generate-report` genera PDF.
- `get-case-result` muestra resultado.
- Disclaimer visible.
- No hay secretos en navegador.
- PWA instala.
- Offline fallback funciona.
- Grad-CAM se oculta si no existe URL real.
- Dashboard carga si hay usuario interno.

## Pendientes que requieren confirmacion del usuario

1. Publishable key exacta de Supabase para `.env.local`.
2. Confirmar uso de `pnpm`.
3. Confirmar si se crea `apps/web` o si se migra el contenido de `frontend/`.
4. Confirmar si el primer corte debe incluir panel interno o solo flujo publico.
5. Confirmar si se generaran iconos PWA desde `frontend/logo.png`.
6. Confirmar dominio de despliegue frontend para CORS.
7. Confirmar si backend agregara `reason_codes` a `get-case-result` antes de UI final.

## Veredicto

El backend Supabase y la IA ya son suficientes para iniciar el frontend MVP. El desarrollo debe concentrarse primero en el flujo publico conectado a Edge Functions, luego PWA y finalmente panel interno. La regla central se mantiene: OralDiagnostic orienta triaje preventivo, no diagnostica cancer bucal.
