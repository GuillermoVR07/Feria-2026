import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { assertMethod, isUuid, parseJsonBody } from '../_shared/validation.ts'
import { assertNoExtraKeys, isRecord } from '../_shared/case-access.ts'

const FUNCTION_NAME = 'review-case'
const ALLOWED_CASE_STATUSES = ['analyzed', 'recommendation_ready', 'reported', 'under_review']

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type ReviewDecision = 'confirm_ai' | 'correct_ai' | 'needs_clinical_evaluation' | 'insufficient_information'
type SuspicionLevel = 'invalid_image' | 'low' | 'moderate' | 'high'

type Payload = {
  case_id: string
  decision: ReviewDecision
  corrected_suspicion_level?: SuspicionLevel | null
  clinical_notes: string
  recommended_action?: string | null
}

type InternalActor = {
  id: string
  role: string
}

function isReviewDecision(value: unknown): value is ReviewDecision {
  return value === 'confirm_ai' ||
    value === 'correct_ai' ||
    value === 'needs_clinical_evaluation' ||
    value === 'insufficient_information'
}

function isSuspicionLevel(value: unknown): value is SuspicionLevel {
  return value === 'invalid_image' || value === 'low' || value === 'moderate' || value === 'high'
}

function parsePayload(body: unknown): Payload {
  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es valido.', 400)
  }

  assertNoExtraKeys(
    body,
    ['case_id', 'decision', 'corrected_suspicion_level', 'clinical_notes', 'recommended_action'],
    'principal'
  )

  if (!isUuid(body.case_id)) {
    throw new ApiError('VALIDATION_ERROR', 'El identificador del caso no es valido.', 400)
  }

  if (!isReviewDecision(body.decision)) {
    throw new ApiError('VALIDATION_ERROR', 'La decision de revision no es valida.', 400)
  }

  if (typeof body.clinical_notes !== 'string' || body.clinical_notes.trim().length < 1 || body.clinical_notes.length > 5000) {
    throw new ApiError('VALIDATION_ERROR', 'Las notas clinicas son obligatorias y deben tener maximo 5000 caracteres.', 400)
  }

  if (
    body.recommended_action !== undefined &&
    body.recommended_action !== null &&
    (typeof body.recommended_action !== 'string' || body.recommended_action.length > 2000)
  ) {
    throw new ApiError('VALIDATION_ERROR', 'La accion recomendada no es valida.', 400)
  }

  if (body.corrected_suspicion_level !== undefined && body.corrected_suspicion_level !== null && !isSuspicionLevel(body.corrected_suspicion_level)) {
    throw new ApiError('VALIDATION_ERROR', 'El nivel de sospecha corregido no es valido.', 400)
  }

  if (body.decision === 'correct_ai' && !isSuspicionLevel(body.corrected_suspicion_level)) {
    throw new ApiError('VALIDATION_ERROR', 'El nivel de sospecha corregido es obligatorio cuando se corrige la IA.', 400)
  }

  return {
    case_id: body.case_id,
    decision: body.decision,
    corrected_suspicion_level: body.corrected_suspicion_level ?? null,
    clinical_notes: body.clinical_notes.trim(),
    recommended_action: typeof body.recommended_action === 'string' ? body.recommended_action.trim() : null
  }
}

async function resolveReviewer(adminClient: SupabaseAdminClient, request: Request): Promise<InternalActor> {
  const user = await getAuthenticatedUser(adminClient, request)
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo validar el perfil interno.', 500)
  }

  if (!data || data.is_active !== true) {
    throw new ApiError('FORBIDDEN', 'El usuario interno no esta habilitado para operar.', 403)
  }

  if (data.role !== 'specialist' && data.role !== 'admin') {
    throw new ApiError('FORBIDDEN', 'El usuario no tiene permiso para revisar casos.', 403)
  }

  return {
    id: data.id,
    role: data.role
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
    metadata: { alcance: 'revision_especialista' }
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

    const reviewer = await resolveReviewer(adminClient, request)
    actorId = reviewer.id

    const payload = parsePayload(await parseJsonBody(request))
    caseId = payload.case_id

    const { data: caseRecord, error: caseError } = await adminClient
      .from('cases')
      .select('id, status')
      .eq('id', payload.case_id)
      .maybeSingle()

    if (caseError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el caso.', 500)
    }

    if (!caseRecord) {
      throw new ApiError('NOT_FOUND', 'Caso inexistente o inaccesible.', 404)
    }

    if (!ALLOWED_CASE_STATUSES.includes(caseRecord.status)) {
      throw new ApiError('VALIDATION_ERROR', 'El caso no esta en un estado valido para revision.', 400, {
        estado_actual: caseRecord.status,
        estados_permitidos: ALLOWED_CASE_STATUSES
      })
    }

    const { data: review, error: reviewError } = await adminClient
      .from('specialist_reviews')
      .insert({
        case_id: payload.case_id,
        reviewed_by: reviewer.id,
        decision: payload.decision,
        corrected_suspicion_level: payload.corrected_suspicion_level,
        clinical_notes: payload.clinical_notes,
        recommended_action: payload.recommended_action
      })
      .select('id, case_id, created_at')
      .single()

    if (reviewError || !review) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar la revision.', 500)
    }

    const updatePayload: Record<string, unknown> = { status: 'reviewed' }
    if (payload.decision === 'correct_ai') {
      updatePayload.final_suspicion_level = payload.corrected_suspicion_level
    }

    const { error: updateError } = await adminClient
      .from('cases')
      .update(updatePayload)
      .eq('id', payload.case_id)

    if (updateError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo actualizar el estado del caso.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId: reviewer.id,
      action: 'CASE_REVIEWED',
      entityType: 'specialist_reviews',
      entityId: review.id,
      caseId: payload.case_id,
      metadata: {
        request_id: requestId,
        decision: payload.decision,
        corrected: payload.decision === 'correct_ai'
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      review_id: review.id,
      case_id: review.case_id,
      status: 'reviewed',
      created_at: review.created_at
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
