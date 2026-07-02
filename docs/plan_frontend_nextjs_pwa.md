# Plan frontend Next.js PWA - OralDiagnostic MVP

Fecha: 2026-07-02

Este documento define el plan para construir el frontend MVP de OralDiagnostic con Next.js, TypeScript, Tailwind CSS v4 y PWA. No es un plan de producto comercial ni de produccion clinica: es para una feria de investigacion, demostracion y simulacion controlada.

## Fuentes revisadas

- `docs/proyecto_por_fases.md`
- `docs/frontend_backend_ia_plan.md`
- `BACKEND_REVISION.md`
- Next.js App Router, instalacion y estructura: https://nextjs.org/docs/app/getting-started/installation
- Next.js PWA: https://nextjs.org/docs/app/guides/progressive-web-apps
- Next.js manifest: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
- Next.js variables de entorno: https://nextjs.org/docs/app/guides/environment-variables
- Tailwind CSS v4 con Next.js: https://tailwindcss.com/docs/installation/framework-guides/nextjs
- Supabase con Next.js: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- Supabase SSR/Auth en Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs
- Serwist para PWA en Next.js: https://serwist.pages.dev/docs/next/getting-started

## Decision principal

Crear un nuevo frontend en:

```text
apps/web/
```

Mantener por ahora el frontend estatico actual en:

```text
frontend/
```

Ese frontend viejo puede quedar como referencia visual o respaldo de demo, pero el MVP conectado debe vivir en `apps/web`.

## Stack obligatorio

| Area | Libreria / tecnologia | Uso |
|---|---|---|
| Framework | Next.js App Router | Rutas, layouts, server/client components. |
| Lenguaje | TypeScript | Contratos y seguridad de tipos. |
| Estilos | Tailwind CSS v4 | UI responsive y rapida. |
| UI base | shadcn/ui | Componentes accesibles y aceleracion de interfaz. |
| Iconos | lucide-react | Iconos para acciones, estados y dashboard. |
| Formularios | react-hook-form | Formularios rapidos y limpios. |
| Validacion | zod | Validar payloads antes de llamar Supabase. |
| Data fetching | @tanstack/react-query | Mutations, retries controlados, loading/error states. |
| Supabase | @supabase/supabase-js | Auth interno y llamadas controladas. |
| PWA | @serwist/next + serwist | Service worker, offline fallback, cache basico. |
| Toasts | sonner | Mensajes de exito/error. |
| Fechas | date-fns | Formato de fechas para dashboard/reportes. |
| Graficos | recharts | Dashboard MVP. |
| Tablas | @tanstack/react-table | Panel interno y revision de casos. |
| Utilidades UI | clsx + tailwind-merge + class-variance-authority | Variantes de componentes. |
| Camara/imagenes | browser-image-compression | Compresion opcional antes de upload. |
| Tests | Vitest + Testing Library + Playwright | Pruebas unitarias y flujo E2E demo. |

## Instalacion base propuesta

Cuando apruebes implementar:

```bash
mkdir apps
pnpm create next-app@latest apps/web --yes --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
cd apps/web
pnpm add @supabase/supabase-js @tanstack/react-query zod react-hook-form @hookform/resolvers lucide-react sonner date-fns recharts @tanstack/react-table clsx tailwind-merge class-variance-authority browser-image-compression
pnpm add @serwist/next
pnpm add -D serwist vitest @testing-library/react @testing-library/jest-dom playwright
```

Despues se inicializa shadcn/ui y se agregan solo los componentes necesarios:

```bash
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input textarea select checkbox radio-group form card badge alert dialog sheet tabs table separator skeleton progress sonner
```

## Estructura modular obligatoria

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
      ~offline/page.tsx
      sw.ts
      (public)/
        casos/nuevo/page.tsx
        casos/nuevo/consentimiento/page.tsx
        casos/nuevo/datos/page.tsx
        casos/nuevo/cuestionario/page.tsx
        casos/nuevo/imagen/page.tsx
        casos/[caseCode]/procesando/page.tsx
        casos/[caseCode]/resultado/page.tsx
        casos/[caseCode]/reporte/page.tsx
      (auth)/
        login/page.tsx
      panel/
        layout.tsx
        dashboard/page.tsx
        revision/page.tsx
        revision/[caseId]/page.tsx
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
        api.ts
        schemas.ts
        types.ts
        store.ts
        hooks.ts
      questionnaire/
        schemas.ts
        questions.ts
      images/
        api.ts
        schemas.ts
        utils.ts
      inference/
        api.ts
        types.ts
      reports/
        api.ts
        types.ts
      auth/
        api.ts
        types.ts
      dashboard/
        api.ts
        types.ts
      review/
        api.ts
        schemas.ts
    lib/
      supabase/
        browser.ts
        server.ts
        edge-functions.ts
      http/
        errors.ts
        result.ts
      query/
        query-client.tsx
        provider.tsx
      utils/
        cn.ts
        image-metadata.ts
        session-case.ts
    styles/
      globals.css
    tests/
      e2e/
      unit/
```

## Variables de entorno separadas

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

## Archivos de entorno tipados

### `src/config/env.client.ts`

Responsabilidad:

- leer solo variables `NEXT_PUBLIC_*`;
- validar con Zod;
- fallar con mensaje claro si falta algo;
- exportar `clientEnv`.

Variables:

```ts
NEXT_PUBLIC_APP_NAME
NEXT_PUBLIC_APP_ENV
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_AI_HEALTH_URL
```

### `src/config/env.server.ts`

Responsabilidad:

- reservar espacio para variables solo de servidor si luego se agregan Route Handlers;
- no usar secretos por ahora, porque el backend real esta en Supabase Edge Functions;
- evitar inicializar clientes privados a nivel de modulo.

Para este MVP, probablemente quede casi vacio. Eso esta bien.

## Arquitectura de llamadas

El frontend no debe llamar a la IA directamente.

Flujo correcto:

```text
Next.js PWA -> Supabase Edge Functions -> Supabase Storage/DB -> Servicio IA Hugging Face
```

Flujo prohibido:

```text
Next.js PWA -> Hugging Face IA
```

Excepcion permitida:

```text
GET NEXT_PUBLIC_AI_HEALTH_URL
```

Solo para mostrar si la IA esta despierta en una pantalla tecnica de demo, nunca para inferencia.

## Cliente de Edge Functions

Crear:

```text
src/lib/supabase/edge-functions.ts
```

Debe centralizar:

- base URL de functions;
- `apikey` publica;
- `Authorization: Bearer publishable_key` si las functions lo requieren;
- parseo de errores;
- timeout razonable por request;
- normalizacion del contrato `{ success, data, error, request_id }`.

No duplicar `fetch` por toda la app.

## Contratos frontend por modulo

### `features/cases`

Funciones:

- `createCase(payload)`
- `getCaseResult(payload)`

Schemas:

- `createCaseSchema`
- `caseResultSchema`

Guarda en `sessionStorage`:

```text
case_code
case_token
case_id
image_id
report_id
```

Usar `sessionStorage`, no `localStorage`, porque es demo y el token temporal no debe quedar persistente.

### `features/questionnaire`

Funciones:

- `submitQuestionnaire(payload)`

Debe mapear exactamente los campos del backend:

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

### `features/images`

Funciones:

- `requestImageUpload(payload)`
- `uploadToSignedUrl(uploadUrl, file)`
- `finalizeImageUpload(payload)`
- `validateImage(payload)`

Utilidades:

- detectar MIME;
- medir ancho/alto;
- calcular tamano;
- opcional: comprimir imagen antes de pedir upload si pesa demasiado.

### `features/inference`

Funciones:

- `runInference(payload)`

Estados:

- `idle`
- `validating_image`
- `running_ai`
- `recommendation_ready`
- `ai_failed`

### `features/reports`

Funciones:

- `generateReport(payload)`
- `openReport(downloadUrl)`

Regla:

- el PDF real viene de Supabase;
- no generar PDF client-side como fuente oficial.

### `features/auth`

Para MVP feria:

- login simple con Supabase Auth para usuarios internos;
- pantallas de panel protegidas;
- si no hay usuarios internos listos, dejar modo demo documentado pero no simular permisos de especialista como si fueran reales.

### `features/review`

Funciones:

- `reviewCase(payload)`

Pantallas:

- cola de revision;
- detalle de caso;
- decision del especialista;
- observaciones.

### `features/dashboard`

Funciones:

- `getDashboardMetrics()`

Usar Recharts para:

- casos por nivel de sospecha;
- imagenes aceptadas/rechazadas;
- casos por estado;
- conteo de inferencias;
- reportes generados.

## Rutas publicas

| Ruta | Objetivo |
|---|---|
| `/` | Pantalla inicial directa, no marketing largo. |
| `/casos/nuevo` | Inicio del flujo guiado. |
| `/casos/nuevo/consentimiento` | Consentimiento informado. |
| `/casos/nuevo/datos` | Edad, sexo, ciudad/zona, sitio de lesion, duracion. |
| `/casos/nuevo/cuestionario` | Factores de riesgo y sintomas. |
| `/casos/nuevo/imagen` | Camara/galeria, preview, upload real. |
| `/casos/[caseCode]/procesando` | Validacion, IA y generacion de resultado. |
| `/casos/[caseCode]/resultado` | Resultado preventivo, imagen, Grad-CAM si existe, PDF. |
| `/casos/[caseCode]/reporte` | Descarga o apertura del PDF firmado. |

## Rutas internas

| Ruta | Objetivo |
|---|---|
| `/login` | Login Supabase para admin/especialista/promotor. |
| `/panel/dashboard` | Indicadores de feria/demo. |
| `/panel/revision` | Cola de casos para especialista. |
| `/panel/revision/[caseId]` | Revision individual. |

Para el MVP de feria, si el tiempo es corto:

1. primero completar flujo publico;
2. luego dashboard;
3. finalmente revision especialista.

## Flujo publico exacto

1. Usuario abre `/`.
2. Acepta consentimiento.
3. Se llama `create-case`.
4. Se guarda `case_code` y `case_token` en sessionStorage.
5. Completa cuestionario.
6. Se llama `submit-questionnaire`.
7. Selecciona o captura imagen.
8. Se llama `request-image-upload`.
9. El navegador hace `PUT upload_url`.
10. Se llama `finalize-image-upload`.
11. Se llama `validate-image`.
12. Si la imagen es rechazada, volver a captura.
13. Si la imagen es aceptada, llamar `run-inference`.
14. Llamar `generate-report`.
15. Llamar `get-case-result`.
16. Mostrar resultado y boton de PDF.

## PWA

Implementar PWA con:

- `src/app/manifest.ts`;
- `src/app/sw.ts`;
- `src/app/~offline/page.tsx`;
- iconos en `public/icons`;
- metadata PWA en `layout.tsx`;
- registro de service worker por Serwist;
- cache solo para shell de app y assets;
- no cachear URLs firmadas de imagenes/PDF;
- no cachear respuestas con `case_token`;
- fallback offline simple.

Para una feria, el modo offline debe ser honesto:

```text
Puedes abrir la app instalada y ver la pantalla base, pero crear casos, subir imagenes, ejecutar IA y descargar PDF requieren internet.
```

## Diseño UI recomendado

Tono visual:

- limpio, institucional, investigacion/salud;
- no parecer app de diagnostico medico definitivo;
- mucho enfasis en triaje preventivo;
- mobile-first;
- formularios grandes y claros para feria;
- dashboard sobrio para explicar resultados.

Componentes clave:

- stepper de flujo;
- tarjetas de estado;
- preview de imagen;
- barra de progreso de procesamiento;
- alertas de advertencia medica;
- badges de nivel `low`, `moderate`, `high`;
- skeletons durante carga;
- empty states para dashboard/revision;
- toasts para exito/error.

Paleta sugerida:

- base clara;
- acento verde/teal salud;
- advertencias en amber;
- riesgo alto en rojo controlado;
- evitar que toda la app sea azul oscuro o morada.

## Textos obligatorios

En resultado y PDF visible:

```text
Este sistema no emite diagnostico medico. El resultado es una orientacion preventiva de triaje visual y debe ser revisado por un profesional de salud.
```

Evitar:

```text
Tienes cancer
Diagnostico positivo
Cancer detectado
Resultado definitivo
```

Usar:

```text
Sospecha visual baja
Sospecha visual moderada
Sospecha visual alta
Se recomienda evaluacion profesional
```

## Estado global

Usar una combinacion simple:

- React Query para llamadas y mutations;
- `sessionStorage` para la sesion temporal del caso;
- React state local para formularios;
- no usar Redux para este MVP.

Crear:

```text
src/features/cases/store.ts
```

Para helpers:

- `saveCaseSession`
- `getCaseSession`
- `clearCaseSession`
- `requireCaseSession`

## Validaciones

Todas las pantallas deben validar antes de llamar backend:

- consentimiento aceptado;
- edad entre rango permitido;
- sitio de lesion seleccionado;
- duracion valida;
- al menos imagen valida;
- MIME permitido: `image/jpeg`, `image/png`, `image/webp`;
- maximo 10 MB;
- cuestionario con booleanos reales.

El backend sigue siendo la fuente final de verdad. La validacion frontend solo mejora experiencia.

## Manejo de errores

Crear mapa de errores:

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

Mostrar mensajes simples:

- si IA duerme: "El servicio de IA esta iniciando. Intenta nuevamente en unos segundos.";
- si imagen rechazada: mostrar razones y boton para repetir;
- si token expiro: iniciar nuevo caso;
- si PDF falla: permitir reintentar generacion.

## Pruebas minimas

### Unitarias

- schemas Zod;
- helper `edge-functions`;
- session case store;
- image metadata;
- mapeo de errores.

### E2E con Playwright

Flujo feliz:

1. abrir app;
2. aceptar consentimiento;
3. crear caso;
4. completar datos;
5. completar cuestionario;
6. subir imagen;
7. validar;
8. correr IA;
9. generar reporte;
10. ver resultado.

Flujos negativos:

- no aceptar consentimiento;
- imagen demasiado grande;
- imagen rechazada;
- token faltante;
- IA no disponible.

## Orden de implementacion

### Fase Frontend 0 - Scaffolding

Objetivo:

- crear `apps/web`;
- instalar librerias;
- Tailwind v4;
- shadcn/ui;
- estructura modular;
- `.env.example`;
- `.env.local` ignorado por Git.

Criterio:

- `pnpm dev` abre la app;
- `pnpm build` compila.

### Fase Frontend 1 - Configuracion y clientes

Objetivo:

- `env.client.ts`;
- `env.server.ts`;
- cliente Supabase browser/server;
- cliente Edge Functions;
- QueryProvider;
- Sonner;
- layout base.

Criterio:

- se puede llamar `health-check`;
- errores se muestran con toast.

### Fase Frontend 2 - Flujo publico base

Objetivo:

- rutas de consentimiento, datos y cuestionario;
- schemas Zod;
- React Hook Form;
- persistencia temporal de caso.

Criterio:

- `create-case` y `submit-questionnaire` funcionan desde UI.

### Fase Frontend 3 - Imagen

Objetivo:

- captura/galeria;
- preview;
- metadatos;
- `request-image-upload`;
- `PUT upload_url`;
- `finalize-image-upload`;
- `validate-image`.

Criterio:

- imagen queda en Supabase Storage privado y se valida.

### Fase Frontend 4 - IA y resultado

Objetivo:

- pantalla procesando;
- `run-inference`;
- `generate-report`;
- `get-case-result`;
- resultado preventivo.

Criterio:

- flujo completo de caso termina con recomendacion y PDF.

### Fase Frontend 5 - PWA

Objetivo:

- manifest;
- iconos;
- service worker Serwist;
- offline fallback;
- metadata mobile.

Criterio:

- navegador permite instalar;
- offline muestra fallback;
- no se cachean datos sensibles.

### Fase Frontend 6 - Panel interno MVP

Objetivo:

- login;
- dashboard;
- cola de revision;
- detalle;
- `review-case`.

Criterio:

- usuario interno puede revisar un caso y dashboard muestra metricas.

### Fase Frontend 7 - QA final feria

Objetivo:

- Playwright;
- test visual manual en movil/escritorio;
- probar Hugging Face despierto;
- probar Supabase Functions;
- checklist demo.

Criterio:

- demo repetible de principio a fin.

## Checklist antes de implementar

- Confirmar que usaras `pnpm`.
- Confirmar si el frontend nuevo va en `apps/web`.
- Tener `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Confirmar si quieres panel interno en el primer corte o despues del flujo publico.
- Preparar iconos PWA, o permitirme generar iconos simples desde el logo actual.

## Recomendacion final

Para avanzar rapido y sin romper lo que ya existe:

1. crear `apps/web` como frontend nuevo;
2. implementar primero el flujo publico completo;
3. agregar PWA;
4. agregar dashboard simple;
5. dejar revision especialista como ultima parte si el tiempo aprieta.

Esto cumple el objetivo de feria: mostrar un caso real simulado conectado a Supabase, IA, recomendacion y PDF, sin venderlo como producto clinico listo para produccion.
