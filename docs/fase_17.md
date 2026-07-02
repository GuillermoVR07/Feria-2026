# OralDiagnostic - Contexto de implementacion Supabase Fase 17

Fecha: 2026-07-02

Proyecto Supabase: `OralDiagnostic`

Project ref: `lsicnvutjvemohcxiwjk`

## Resumen

Se documento la Fase 17 del documento `docs/backend_supabase_por_fases.md`: preparacion para conectar frontend.

Objetivo:

- Dejar claro que endpoints debe consumir el frontend.
- Definir los estados que debe respetar la interfaz.
- Registrar el DTO minimo esperado para resultados.
- Marcar diferencias reales entre el contrato documentado y lo desplegado actualmente.

Esta fase no crea el frontend. Solo deja el contrato backend listo para que el frontend se conecte sin leer tablas sensibles directamente.

## Estado remoto verificado

Funciones activas en Supabase:

| Funcion | Estado |
|---|---|
| `create-case` | ACTIVE |
| `submit-questionnaire` | ACTIVE |
| `request-image-upload` | ACTIVE |
| `finalize-image-upload` | ACTIVE |
| `validate-image` | ACTIVE |
| `run-inference` | ACTIVE |
| `generate-report` | ACTIVE |
| `get-case-result` | ACTIVE |
| `create-signed-read-url` | ACTIVE |
| `review-case` | ACTIVE |
| `dashboard-metrics` | ACTIVE |

## Subfase 17.1 - Endpoints que consumira el frontend

| Flujo frontend futuro | Edge Function | Estado |
|---|---|---|
| Crear caso | `create-case` | Listo |
| Guardar cuestionario | `submit-questionnaire` | Listo |
| Pedir URL de upload | `request-image-upload` | Listo |
| Confirmar upload | `finalize-image-upload` | Listo |
| Validar imagen | `validate-image` | Listo |
| Ejecutar IA | `run-inference` | Listo |
| Ver resultado | `get-case-result` | Listo con observacion |
| Descargar PDF | `generate-report` | Listo |
| Descargar/leer asset firmado | `create-signed-read-url` | Listo |
| Revisar caso especialista | `review-case` | Listo, requiere usuario interno |
| Dashboard | `dashboard-metrics` | Listo, requiere usuario interno |

## Flujo publico recomendado

El frontend anonimo debe operar asi:

```text
1. create-case
2. Guardar case_code y case_token temporalmente
3. submit-questionnaire
4. request-image-upload
5. Subir archivo a upload_url firmada
6. finalize-image-upload
7. validate-image
8. Si quality_status = accepted, ejecutar run-inference
9. generate-report si se requiere PDF
10. get-case-result para mostrar resultado final
```

Regla central:

- El frontend publico no debe leer ni escribir tablas directamente.
- El frontend publico no debe construir rutas internas de Storage.
- Todo acceso a imagenes o reportes debe usar URLs firmadas.

## Subfase 17.2 - Estados que debe respetar el frontend

Estados definidos por el contrato:

```ts
export type CaseStatus =
  | 'draft'
  | 'consent_accepted'
  | 'demographics_completed'
  | 'questionnaire_completed'
  | 'image_upload_requested'
  | 'image_uploaded'
  | 'quality_check_pending'
  | 'image_rejected'
  | 'quality_accepted'
  | 'ai_pending'
  | 'ai_failed'
  | 'analyzed'
  | 'recommendation_ready'
  | 'reported'
  | 'under_review'
  | 'reviewed'
  | 'closed'
  | 'failed'
```

Estados observados en la prueba completa:

```text
consent_accepted
questionnaire_completed
image_upload_requested
image_uploaded
quality_accepted
under_review
reported
```

Interpretacion para UX:

| Estado | Accion frontend |
|---|---|
| `consent_accepted` | Continuar a cuestionario. |
| `questionnaire_completed` | Permitir seleccionar/capturar imagen. |
| `image_upload_requested` | Subir archivo a URL firmada. |
| `image_uploaded` | Ejecutar validacion tecnica. |
| `image_rejected` | Pedir nueva captura. |
| `quality_accepted` | Permitir IA. |
| `ai_failed` | Mostrar reintento o mensaje tecnico preventivo. |
| `recommendation_ready` | Mostrar resultado. |
| `under_review` | Indicar que requiere revision profesional. |
| `reported` | Mostrar resultado y PDF si existe. |

## Subfase 17.3 - DTO minimo para resultado

Contrato documentado esperado:

```ts
export type CaseResultDto = {
  case_code: string
  status: CaseStatus
  lesion_site: string
  lesion_duration_days: number
  result: {
    suspicion_level: 'invalid_image' | 'low' | 'moderate' | 'high'
    urgency_level: 'none' | 'routine' | 'priority' | 'urgent'
    professional_referral: boolean
    message: string
    reason_codes: string[]
  }
  assets?: {
    original_image_url?: string
    gradcam_image_url?: string
    report_download_url?: string
  }
  medical_disclaimer: string
}
```

### Respuesta real observada en `get-case-result`

La funcion desplegada devuelve:

```text
case_code
status
lesion_site
lesion_duration_days
result.suspicion_level
result.urgency_level
result.professional_referral
result.message
assets.original_image_url
assets.gradcam_image_url
assets.report_download_url
medical_disclaimer
```

Observacion importante:

- El contrato de Fase 17 incluye `result.reason_codes`.
- La funcion desplegada `get-case-result` actualmente no devuelve `reason_codes`.
- La tabla `recommendations` si guarda `reason_codes`.

Pendiente recomendado:

- Ajustar `get-case-result` para incluir `reason_codes` antes de conectar el frontend definitivo.

## Subfase 17.4 - Reglas para frontend futuro

Reglas obligatorias:

1. No leer tablas directamente para flujo anonimo.
2. Usar Edge Functions.
3. Guardar `case_token` temporalmente de forma segura.
4. No mostrar rutas internas de Storage.
5. Mostrar siempre disclaimer medico.
6. No cambiar textos preventivos por textos diagnosticos.
7. No exponer probabilidades si se decide simplificar UX.
8. No permitir continuar sin consentimiento.
9. No ejecutar IA si calidad de imagen fue rechazada.
10. No descargar PDF sin token o sesion valida.

Reglas adicionales por lo ya probado:

1. Si `validate-image` devuelve `quality_status = rejected`, volver a captura.
2. Si `run-inference` devuelve error, no crear resultado falso en frontend.
3. Si `result.assets.gradcam_image_url` es `null`, ocultar el bloque Grad-CAM.
4. Si `result.assets.report_download_url` es `null`, mostrar boton para generar reporte.
5. Si `status = under_review`, mostrar que el caso requiere revision profesional, no diagnostico.

## Variables que necesitara el frontend

Para frontend publico:

```text
SUPABASE_URL=https://lsicnvutjvemohcxiwjk.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

O si se usa formato historico:

```text
SUPABASE_ANON_KEY=...
```

Regla:

- Nunca usar `SUPABASE_SERVICE_ROLE_KEY` en frontend.

## Resultado de Fase 17

Fase 17 documentada y lista para frontend.

Pendientes antes de implementar frontend:

- Decidir si el frontend usara `sb_publishable_...` o legacy `anon`.
- Ajustar `get-case-result` para devolver `reason_codes`.
- Generar tipos TypeScript desde Supabase cuando se defina estructura del frontend.
- Definir donde se guardara temporalmente `case_token` en navegador.
