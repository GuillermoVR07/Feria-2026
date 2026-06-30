import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, parseJsonBody } from '../_shared/validation.ts'

const FUNCTION_NAME = 'submit-questionnaire'
const TOKEN_PURPOSE = 'case_result_access'

const QUESTIONNAIRE_BOOLEAN_FIELDS = [
  'pain',
  'bleeding',
  'growth',
  'white_patch',
  'red_patch',
  'non_healing_ulcer',
  'lump_or_induration',
  'dysphagia',
  'tobacco_use',
  'alcohol_use',
  'coca_chewing',
  'coca_machucada',
  'bicarbonate_or_additives',
  'dental_prosthesis',
  'constant_friction'
] as const

const RISK_WEIGHTS: Record<typeof QUESTIONNAIRE_BOOLEAN_FIELDS[number], number> = {
  pain: 5,
  bleeding: 8,
  growth: 8,
  white_patch: 8,
  red_patch: 8,
  non_healing_ulcer: 10,
  lump_or_induration: 8,
  dysphagia: 8,
  tobacco_use: 5,
  alcohol_use: 5,
  coca_chewing: 4,
  coca_machucada: 4,
  bicarbonate_or_additives: 3,
  dental_prosthesis: 3,
  constant_friction: 3
}

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>
type BooleanQuestionnaireField = typeof QUESTIONNAIRE_BOOLEAN_FIELDS[number]

type SubmitQuestionnairePayload = {
  case_code: string
  case_token?: string | null
  questionnaire: Record<BooleanQuestionnaireField, boolean> & {
    notes?: string | null
  }
}

type CaseAccess = {
  caseId: string
  actorId: string | null
  accessMode: 'case_token' | 'internal_auth'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertNoExtraKeys(value: Record<string, unknown>, allowedKeys: string[], fieldName: string): void {
  const extras = Object.keys(value).filter((key) => !allowedKeys.includes(key))

  if (extras.length > 0) {
    throw new ApiError('VALIDATION_ERROR', `El objeto ${fieldName} contiene campos no permitidos.`, 400, {
      campos_no_permitidos: extras
    })
  }
}

function parsePayload(body: unknown): SubmitQuestionnairePayload {
  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es válido.', 400)
  }

  assertNoExtraKeys(body, ['case_code', 'case_token', 'questionnaire'], 'principal')

  if (typeof body.case_code !== 'string' || body.case_code.length < 1 || body.case_code.length > 80) {
    throw new ApiError('VALIDATION_ERROR', 'El código de caso no es válido.', 400)
  }

  if (body.case_token !== undefined && body.case_token !== null && typeof body.case_token !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'El token temporal no es válido.', 400)
  }

  if (!isRecord(body.questionnaire)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuestionario no es válido.', 400)
  }

  assertNoExtraKeys(body.questionnaire, [...QUESTIONNAIRE_BOOLEAN_FIELDS, 'notes'], 'questionnaire')

  const questionnaire = {} as SubmitQuestionnairePayload['questionnaire']

  for (const field of QUESTIONNAIRE_BOOLEAN_FIELDS) {
    const value = body.questionnaire[field]

    if (typeof value !== 'boolean') {
      throw new ApiError('VALIDATION_ERROR', `El campo ${field} debe ser verdadero o falso.`, 400)
    }

    questionnaire[field] = value
  }

  const notes = body.questionnaire.notes
  if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 1000)) {
    throw new ApiError('VALIDATION_ERROR', 'Las notas no son válidas.', 400)
  }

  questionnaire.notes = notes === undefined || notes === '' ? null : notes

  return {
    case_code: body.case_code,
    case_token: body.case_token ?? null,
    questionnaire
  }
}

function calculateRiskScore(questionnaire: SubmitQuestionnairePayload['questionnaire']): number {
  const rawScore = QUESTIONNAIRE_BOOLEAN_FIELDS.reduce((score, field) => {
    return questionnaire[field] ? score + RISK_WEIGHTS[field] : score
  }, 0)

  return Math.min(100, Number(rawScore.toFixed(2)))
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function hashCaseToken(token: string): Promise<string> {
  const secret = Deno.env.get('CASE_TOKEN_SECRET')

  if (!secret) {
    throw new ApiError('INTERNAL_ERROR', 'Variable de entorno CASE_TOKEN_SECRET no configurada.', 500)
  }

  return sha256Hex(`${secret}:${token}`)
}

async function resolveInternalActor(adminClient: SupabaseAdminClient, request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization')

  if (!authorization) {
    return null
  }

  const user = await getAuthenticatedUser(adminClient, request)
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, is_active')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo validar el perfil interno.', 500)
  }

  if (!data || data.is_active !== true) {
    throw new ApiError('FORBIDDEN', 'El usuario interno no está habilitado para operar.', 403)
  }

  return data.id
}

async function resolveCaseAccess(
  adminClient: SupabaseAdminClient,
  request: Request,
  payload: SubmitQuestionnairePayload
): Promise<CaseAccess> {
  const actorId = await resolveInternalActor(adminClient, request)

  const { data: caseRecord, error: caseError } = await adminClient
    .from('cases')
    .select('id, status')
    .eq('case_code', payload.case_code)
    .maybeSingle()

  if (caseError) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el caso.', 500)
  }

  if (!caseRecord) {
    throw new ApiError('NOT_FOUND', 'Caso inexistente o inaccesible.', 404)
  }

  const { data: consentRecord, error: consentError } = await adminClient
    .from('consent_records')
    .select('id')
    .eq('case_id', caseRecord.id)
    .eq('accepted', true)
    .maybeSingle()

  if (consentError) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo validar el consentimiento.', 500)
  }

  if (!consentRecord) {
    throw new ApiError('FORBIDDEN', 'El caso no tiene consentimiento aceptado.', 403)
  }

  if (actorId) {
    return {
      caseId: caseRecord.id,
      actorId,
      accessMode: 'internal_auth'
    }
  }

  if (!payload.case_token) {
    throw new ApiError('UNAUTHORIZED', 'Falta token temporal válido.', 401)
  }

  const tokenHash = await hashCaseToken(payload.case_token)
  const { data: tokenRecord, error: tokenError } = await adminClient
    .from('case_access_tokens')
    .select('id, expires_at, revoked_at')
    .eq('case_id', caseRecord.id)
    .eq('token_hash', tokenHash)
    .eq('purpose', TOKEN_PURPOSE)
    .maybeSingle()

  if (tokenError) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo validar el token temporal.', 500)
  }

  if (!tokenRecord || tokenRecord.revoked_at) {
    throw new ApiError('CASE_TOKEN_INVALID', 'Token temporal inválido.', 401)
  }

  if (new Date(tokenRecord.expires_at).getTime() <= Date.now()) {
    throw new ApiError('CASE_TOKEN_EXPIRED', 'Token temporal expirado.', 401)
  }

  return {
    caseId: caseRecord.id,
    actorId: null,
    accessMode: 'case_token'
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
    metadata: {
      alcance: 'guardar_cuestionario'
    }
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
    const access = await resolveCaseAccess(adminClient, request, payload)
    actorId = access.actorId
    caseId = access.caseId

    const { data: existingQuestionnaire, error: existingError } = await adminClient
      .from('risk_questionnaires')
      .select('id')
      .eq('case_id', caseId)
      .maybeSingle()

    if (existingError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo verificar el cuestionario.', 500)
    }

    if (existingQuestionnaire) {
      throw new ApiError('VALIDATION_ERROR', 'El cuestionario ya fue registrado para este caso.', 400)
    }

    const riskScore = calculateRiskScore(payload.questionnaire)

    const { error: questionnaireError } = await adminClient
      .from('risk_questionnaires')
      .insert({
        case_id: caseId,
        ...payload.questionnaire,
        risk_score: riskScore
      })

    if (questionnaireError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo guardar el cuestionario.', 500)
    }

    const { error: caseUpdateError } = await adminClient
      .from('cases')
      .update({
        status: 'questionnaire_completed'
      })
      .eq('id', caseId)

    if (caseUpdateError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo actualizar el estado del caso.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'QUESTIONNAIRE_SUBMITTED',
      entityType: 'risk_questionnaires',
      caseId,
      metadata: {
        case_code: payload.case_code,
        access_mode: access.accessMode,
        risk_score: riskScore
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      case_id: caseId,
      status: 'questionnaire_completed',
      risk_score: riskScore,
      next_step: 'image_upload'
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
