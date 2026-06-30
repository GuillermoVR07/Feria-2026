import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, parseJsonBody } from '../_shared/validation.ts'
import { parseCaseTokenPayload, resolveCaseAccess } from '../_shared/case-access.ts'

const FUNCTION_NAME = 'generate-report'
const REPORT_BUCKET = 'case-reports'
const REPORT_VERSION = Deno.env.get('PDF_TEMPLATE_VERSION') ?? 'mvp-v1'
const SIGNED_REPORT_EXPIRES_IN_SECONDS = 900
const MEDICAL_DISCLAIMER =
  'IMPORTANTE: Este reporte es una herramienta de apoyo al triaje preventivo. No constituye diagnostico medico ni confirma cancer bucal. El diagnostico definitivo requiere evaluacion clinica por un profesional de salud y, cuando corresponda, estudios complementarios o biopsia.'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type GenerateReportPayload = {
  case_code: string
  case_token?: string | null
}

function parsePayload(body: unknown): GenerateReportPayload {
  return parseCaseTokenPayload(body, ['case_code', 'case_token'])
}

function escapePdfText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()\\]/g, '\\$&')
    .replace(/[^\x20-\x7E]/g, '')
}

function buildSimplePdf(lines: string[]): Uint8Array {
  const content = [
    'BT',
    '/F1 10 Tf',
    '50 780 Td',
    ...lines.flatMap((line, index) => {
      const safeLine = escapePdfText(line).slice(0, 110)
      return index === 0 ? [`(${safeLine}) Tj`] : ['0 -16 Td', `(${safeLine}) Tj`]
    }),
    'ET'
  ].join('\n')

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  for (const object of objects) {
    offsets.push(pdf.length)
    pdf += object
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new TextEncoder().encode(pdf)
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function getReportData(adminClient: SupabaseAdminClient, caseId: string) {
  const { data: caseRecord, error: caseError } = await adminClient
    .from('cases')
    .select('id, case_code, status, lesion_site, lesion_duration_days, final_suspicion_level, final_urgency_level, final_recommendation, subject_id, created_at')
    .eq('id', caseId)
    .single()

  if (caseError || !caseRecord) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el caso.', 500)
  }

  const { data: subject } = await adminClient
    .from('case_subjects')
    .select('age_years, sex, city, zone')
    .eq('id', caseRecord.subject_id)
    .maybeSingle()

  const { data: questionnaire } = await adminClient
    .from('risk_questionnaires')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle()

  const { data: recommendation } = await adminClient
    .from('recommendations')
    .select('suspicion_level, urgency_level, professional_referral, reason_codes, message')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: inference } = await adminClient
    .from('ai_inferences')
    .select('model_id, suspicion_level, probability, created_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!recommendation) {
    throw new ApiError('VALIDATION_ERROR', 'El caso no tiene recomendación preventiva lista para reporte.', 400)
  }

  let model: { name: string; version: string; architecture: string } | null = null
  if (inference?.model_id) {
    const { data: modelRecord } = await adminClient
      .from('ai_models')
      .select('name, version, architecture')
      .eq('id', inference.model_id)
      .maybeSingle()
    model = modelRecord ?? null
  }

  return {
    caseRecord,
    subject,
    questionnaire,
    recommendation,
    inference,
    model
  }
}

async function logRequest(
  adminClient: SupabaseAdminClient,
  requestId: string,
  request: Request,
  startedAt: number,
  statusCode: number,
  actorId: string | null,
  caseId: string | null,
  errorCode: string | null = null
): Promise<void> {
  await logApiRequest(adminClient, {
    requestId,
    functionName: FUNCTION_NAME,
    method: request.method,
    statusCode,
    actorId,
    caseId,
    durationMs: Date.now() - startedAt,
    errorCode,
    metadata: { alcance: 'generacion_reporte_pdf' }
  })
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const adminClient = createSupabaseAdminClient()
  let actorId: string | null = null
  let caseId: string | null = null

  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    assertMethod(request, ['POST'])

    const payload = parsePayload(await parseJsonBody(request))
    const access = await resolveCaseAccess(adminClient, request, {
      caseCode: payload.case_code,
      caseToken: payload.case_token,
      allowedStatuses: ['recommendation_ready', 'under_review', 'reported']
    })
    actorId = access.actorId
    caseId = access.caseId

    const reportData = await getReportData(adminClient, caseId)
    const reportId = crypto.randomUUID()
    const objectPath = `${payload.case_code}/${reportId}.pdf`
    const generatedAt = new Date().toISOString()

    const lines = [
      'OralDiagnostic - Reporte preventivo',
      `Codigo anonimo: ${payload.case_code}`,
      `Fecha: ${generatedAt}`,
      `Edad: ${reportData.subject?.age_years ?? 'no especificada'} | Sexo: ${reportData.subject?.sex ?? 'no especificado'}`,
      `Ciudad/Zona: ${reportData.subject?.city ?? 'no especificada'} / ${reportData.subject?.zone ?? 'no especificada'}`,
      `Zona bucal: ${reportData.caseRecord.lesion_site}`,
      `Tiempo de evolucion: ${reportData.caseRecord.lesion_duration_days} dias`,
      `Puntaje orientativo de cuestionario: ${reportData.questionnaire?.risk_score ?? 'no disponible'}`,
      `Sospecha visual orientativa: ${reportData.recommendation.suspicion_level}`,
      `Urgencia preventiva: ${reportData.recommendation.urgency_level}`,
      `Derivacion profesional: ${reportData.recommendation.professional_referral ? 'si' : 'no'}`,
      `Modelo IA: ${reportData.model ? `${reportData.model.name} ${reportData.model.version}` : 'no disponible'}`,
      `Recomendacion: ${reportData.recommendation.message}`,
      MEDICAL_DISCLAIMER
    ]

    const pdfBytes = buildSimplePdf(lines)
    const reportHash = await sha256Bytes(pdfBytes)

    const { error: uploadError } = await adminClient
      .storage
      .from(REPORT_BUCKET)
      .upload(objectPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      throw new ApiError('REPORT_GENERATION_FAILED', 'Fallo generando PDF de orientación preventiva.', 500)
    }

    const { error: reportError } = await adminClient
      .from('pdf_reports')
      .insert({
        id: reportId,
        case_id: caseId,
        generated_by: actorId,
        bucket_name: REPORT_BUCKET,
        object_path: objectPath,
        report_hash: reportHash,
        report_version: REPORT_VERSION
      })

    if (reportError) {
      throw new ApiError('REPORT_GENERATION_FAILED', 'No se pudo registrar metadata del reporte.', 500)
    }

    await adminClient
      .from('cases')
      .update({ status: 'reported' })
      .eq('id', caseId)

    const { data: signedUrl, error: signedError } = await adminClient
      .storage
      .from(REPORT_BUCKET)
      .createSignedUrl(objectPath, SIGNED_REPORT_EXPIRES_IN_SECONDS)

    if (signedError || !signedUrl?.signedUrl) {
      throw new ApiError('REPORT_GENERATION_FAILED', 'No se pudo crear URL firmada del reporte.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'REPORT_GENERATED',
      entityType: 'pdf_reports',
      entityId: reportId,
      caseId,
      metadata: {
        case_code: payload.case_code,
        report_version: REPORT_VERSION,
        bucket_name: REPORT_BUCKET,
        hash_present: true
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      report_id: reportId,
      case_code: payload.case_code,
      download_url: signedUrl.signedUrl,
      expires_in_seconds: SIGNED_REPORT_EXPIRES_IN_SECONDS
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
