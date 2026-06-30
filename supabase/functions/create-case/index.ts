import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, parseJsonBody } from '../_shared/validation.ts'

const FUNCTION_NAME = 'create-case'
const TOKEN_TTL_HOURS = 24
const SEX_VALUES = new Set(['female', 'male', 'other', 'not_specified'])
const LESION_SITE_VALUES = new Set([
  'lip',
  'tongue',
  'gum',
  'palate',
  'floor_of_mouth',
  'cheek_mucosa',
  'other',
  'not_specified'
])

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type CreateCasePayload = {
  consent: {
    accepted: true
    consent_version: string
  }
  demographics: {
    age_years?: number | null
    sex?: string
    city?: string | null
    zone?: string | null
  }
  case: {
    lesion_site: string
    lesion_duration_days: number
  }
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

function optionalText(value: unknown, fieldName: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value !== 'string' || value.length > maxLength) {
    throw new ApiError('VALIDATION_ERROR', `El campo ${fieldName} no es válido.`, 400)
  }

  return value
}

function parsePayload(body: unknown): CreateCasePayload {
  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es válido.', 400)
  }

  assertNoExtraKeys(body, ['consent', 'demographics', 'case'], 'principal')

  const consent = body.consent
  const demographics = body.demographics
  const caseInput = body.case

  if (!isRecord(consent) || !isRecord(demographics) || !isRecord(caseInput)) {
    throw new ApiError('VALIDATION_ERROR', 'La estructura del payload no es válida.', 400)
  }

  assertNoExtraKeys(consent, ['accepted', 'consent_version'], 'consent')
  assertNoExtraKeys(demographics, ['age_years', 'sex', 'city', 'zone'], 'demographics')
  assertNoExtraKeys(caseInput, ['lesion_site', 'lesion_duration_days'], 'case')

  if (consent.accepted !== true) {
    throw new ApiError('VALIDATION_ERROR', 'El consentimiento debe estar aceptado.', 400)
  }

  if (typeof consent.consent_version !== 'string' || consent.consent_version.length < 1 || consent.consent_version.length > 80) {
    throw new ApiError('VALIDATION_ERROR', 'La versión de consentimiento no es válida.', 400)
  }
  const consentVersion = consent.consent_version

  const ageYears = demographics.age_years
  if (
    ageYears !== undefined &&
    ageYears !== null &&
    (typeof ageYears !== 'number' || !Number.isInteger(ageYears) || ageYears < 0 || ageYears > 120)
  ) {
    throw new ApiError('VALIDATION_ERROR', 'La edad debe estar entre 0 y 120 años.', 400)
  }

  const sex = demographics.sex ?? 'not_specified'
  if (typeof sex !== 'string' || !SEX_VALUES.has(sex)) {
    throw new ApiError('VALIDATION_ERROR', 'El sexo declarado no es válido.', 400)
  }
  const parsedSex = sex

  if (typeof caseInput.lesion_site !== 'string' || !LESION_SITE_VALUES.has(caseInput.lesion_site)) {
    throw new ApiError('VALIDATION_ERROR', 'La zona bucal indicada no es válida.', 400)
  }
  const lesionSite = caseInput.lesion_site

  const lesionDurationDays = caseInput.lesion_duration_days
  if (
    typeof lesionDurationDays !== 'number' ||
    !Number.isInteger(lesionDurationDays) ||
    lesionDurationDays < 0 ||
    lesionDurationDays > 3650
  ) {
    throw new ApiError('VALIDATION_ERROR', 'La duración de la lesión debe estar entre 0 y 3650 días.', 400)
  }

  return {
    consent: {
      accepted: true,
      consent_version: consentVersion
    },
    demographics: {
      age_years: ageYears as number | null | undefined,
      sex: parsedSex,
      city: optionalText(demographics.city, 'city', 120),
      zone: optionalText(demographics.zone, 'zone', 120)
    },
    case: {
      lesion_site: lesionSite,
      lesion_duration_days: lesionDurationDays
    }
  }
}

function buildCaseCode(): string {
  const now = new Date()
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const random = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()

  return `OD-${yyyy}${mm}${dd}-${random}`
}

function buildCaseToken(): string {
  const randomA = crypto.randomUUID().replaceAll('-', '')
  const randomB = crypto.randomUUID().replaceAll('-', '')

  return `odct_${randomA}${randomB}`
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)

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

async function resolveActorId(adminClient: SupabaseAdminClient, request: Request): Promise<string | null> {
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

async function cleanupPartialCase(adminClient: SupabaseAdminClient, caseId: string | null, subjectId: string | null): Promise<void> {
  if (caseId) {
    await adminClient.from('cases').delete().eq('id', caseId)
  }

  if (subjectId) {
    await adminClient.from('case_subjects').delete().eq('id', subjectId)
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
      alcance: 'creacion_caso'
    }
  })
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const adminClient = createSupabaseAdminClient()
  let actorId: string | null = null
  let subjectId: string | null = null
  let caseId: string | null = null
  let shouldCleanup = false

  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    assertMethod(request, ['POST'])

    actorId = await resolveActorId(adminClient, request)

    const payload = parsePayload(await parseJsonBody(request))
    const caseToken = buildCaseToken()
    const tokenHash = await hashCaseToken(caseToken)
    const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000).toISOString()

    const { data: subject, error: subjectError } = await adminClient
      .from('case_subjects')
      .insert({
        age_years: payload.demographics.age_years ?? null,
        sex: payload.demographics.sex,
        city: payload.demographics.city,
        zone: payload.demographics.zone
      })
      .select('id')
      .single()

    if (subjectError || !subject) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear el sujeto anónimo del caso.', 500)
    }

    subjectId = subject.id
    shouldCleanup = true

    let caseRecord: { id: string; case_code: string; status: string } | null = null
    let lastCaseError: unknown = null

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const caseCode = buildCaseCode()
      const { data, error } = await adminClient
        .from('cases')
        .insert({
          case_code: caseCode,
          subject_id: subjectId,
          created_by: actorId,
          status: 'consent_accepted',
          lesion_site: payload.case.lesion_site,
          lesion_duration_days: payload.case.lesion_duration_days,
          clinical_disclaimer_acknowledged: true
        })
        .select('id, case_code, status')
        .single()

      if (!error && data) {
        caseRecord = data
        break
      }

      lastCaseError = error
    }

    if (!caseRecord) {
      console.error('No se pudo crear el caso.', lastCaseError)
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear el caso.', 500)
    }

    caseId = caseRecord.id

    const { error: consentError } = await adminClient
      .from('consent_records')
      .insert({
        case_id: caseId,
        accepted: true,
        consent_version: payload.consent.consent_version,
        metadata: {
          origen: 'create-case'
        }
      })

    if (consentError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar el consentimiento.', 500)
    }

    const { error: tokenError } = await adminClient
      .from('case_access_tokens')
      .insert({
        case_id: caseId,
        token_hash: tokenHash,
        purpose: 'case_result_access',
        expires_at: expiresAt
      })

    if (tokenError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar el token temporal.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'CASE_CREATED',
      entityType: 'cases',
      entityId: caseId,
      caseId,
      metadata: {
        case_code: caseRecord.case_code,
        token_purpose: 'case_result_access',
        token_ttl_hours: TOKEN_TTL_HOURS
      }
    })

    shouldCleanup = false

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      case_id: caseId,
      case_code: caseRecord.case_code,
      case_token: caseToken,
      status: caseRecord.status,
      next_step: 'questionnaire'
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    if (shouldCleanup) {
      await cleanupPartialCase(adminClient, caseId, subjectId)
    }

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
