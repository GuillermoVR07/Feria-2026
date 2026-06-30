import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, parseJsonBody } from '../_shared/validation.ts'

const FUNCTION_NAME = 'request-image-upload'
const TOKEN_PURPOSE = 'case_result_access'
const BUCKET_NAME = 'case-originals'
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
const SIGNED_UPLOAD_EXPIRES_IN_SECONDS = 2 * 60 * 60
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_CAPTURE_SOURCES = new Set(['camera', 'gallery'])
const ALLOWED_CASE_STATUSES = new Set(['questionnaire_completed', 'image_rejected'])

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type RequestImageUploadPayload = {
  case_code: string
  case_token?: string | null
  image: {
    mime_type: string
    size_bytes: number
    capture_source: string
  }
}

type CaseAccess = {
  caseId: string
  actorId: string | null
  accessMode: 'case_token' | 'internal_auth'
  currentStatus: string
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

function parsePayload(body: unknown): RequestImageUploadPayload {
  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es válido.', 400)
  }

  assertNoExtraKeys(body, ['case_code', 'case_token', 'image'], 'principal')

  if (typeof body.case_code !== 'string' || body.case_code.length < 1 || body.case_code.length > 80) {
    throw new ApiError('VALIDATION_ERROR', 'El código de caso no es válido.', 400)
  }

  if (body.case_token !== undefined && body.case_token !== null && typeof body.case_token !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'El token temporal no es válido.', 400)
  }

  if (!isRecord(body.image)) {
    throw new ApiError('VALIDATION_ERROR', 'La imagen solicitada no es válida.', 400)
  }

  assertNoExtraKeys(body.image, ['mime_type', 'size_bytes', 'capture_source'], 'image')

  if (typeof body.image.mime_type !== 'string' || !ALLOWED_MIME_TYPES.has(body.image.mime_type)) {
    throw new ApiError('VALIDATION_ERROR', 'El tipo MIME de imagen no está permitido.', 400, {
      mime_permitidos: Array.from(ALLOWED_MIME_TYPES)
    })
  }

  if (
    typeof body.image.size_bytes !== 'number' ||
    !Number.isInteger(body.image.size_bytes) ||
    body.image.size_bytes < 1 ||
    body.image.size_bytes > MAX_IMAGE_SIZE_BYTES
  ) {
    throw new ApiError('VALIDATION_ERROR', 'El tamaño de imagen no es válido.', 400, {
      maximo_bytes: MAX_IMAGE_SIZE_BYTES
    })
  }

  if (typeof body.image.capture_source !== 'string' || !ALLOWED_CAPTURE_SOURCES.has(body.image.capture_source)) {
    throw new ApiError('VALIDATION_ERROR', 'El origen de captura no es válido.', 400, {
      origenes_permitidos: Array.from(ALLOWED_CAPTURE_SOURCES)
    })
  }

  return {
    case_code: body.case_code,
    case_token: body.case_token ?? null,
    image: {
      mime_type: body.image.mime_type,
      size_bytes: body.image.size_bytes,
      capture_source: body.image.capture_source
    }
  }
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') {
    return 'png'
  }

  if (mimeType === 'image/webp') {
    return 'webp'
  }

  return 'jpg'
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
  payload: RequestImageUploadPayload
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

  if (!ALLOWED_CASE_STATUSES.has(caseRecord.status)) {
    throw new ApiError('VALIDATION_ERROR', 'El caso no está en un estado válido para solicitar subida de imagen.', 400, {
      estado_actual: caseRecord.status,
      estados_permitidos: Array.from(ALLOWED_CASE_STATUSES)
    })
  }

  if (actorId) {
    return {
      caseId: caseRecord.id,
      actorId,
      accessMode: 'internal_auth',
      currentStatus: caseRecord.status
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
    accessMode: 'case_token',
    currentStatus: caseRecord.status
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
      alcance: 'solicitud_subida_imagen'
    }
  })
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const adminClient = createSupabaseAdminClient()
  let actorId: string | null = null
  let caseId: string | null = null
  let imageId: string | null = null

  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    assertMethod(request, ['POST'])

    const payload = parsePayload(await parseJsonBody(request))
    const access = await resolveCaseAccess(adminClient, request, payload)
    actorId = access.actorId
    caseId = access.caseId

    imageId = crypto.randomUUID()
    const extension = extensionFromMimeType(payload.image.mime_type)
    const objectPath = `${payload.case_code}/${imageId}.${extension}`

    const { error: imageInsertError } = await adminClient
      .from('case_images')
      .insert({
        id: imageId,
        case_id: caseId,
        image_kind: 'original',
        capture_source: payload.image.capture_source,
        bucket_name: BUCKET_NAME,
        object_path: objectPath,
        mime_type: payload.image.mime_type,
        size_bytes: payload.image.size_bytes,
        uploaded_by: actorId
      })

    if (imageInsertError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar la metadata preliminar de imagen.', 500)
    }

    const { data: signedUpload, error: signedUploadError } = await adminClient
      .storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(objectPath)

    if (signedUploadError || !signedUpload?.signedUrl) {
      await adminClient.from('case_images').delete().eq('id', imageId)
      throw new ApiError('INTERNAL_ERROR', 'No se pudo generar la URL firmada de subida.', 500)
    }

    const { error: caseUpdateError } = await adminClient
      .from('cases')
      .update({
        status: 'image_upload_requested'
      })
      .eq('id', caseId)

    if (caseUpdateError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo actualizar el estado del caso.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'IMAGE_UPLOAD_REQUESTED',
      entityType: 'case_images',
      entityId: imageId,
      caseId,
      metadata: {
        case_code: payload.case_code,
        bucket_name: BUCKET_NAME,
        object_path: objectPath,
        mime_type: payload.image.mime_type,
        size_bytes: payload.image.size_bytes,
        capture_source: payload.image.capture_source,
        access_mode: access.accessMode,
        estado_anterior: access.currentStatus,
        signed_upload_url_expires_in_seconds: SIGNED_UPLOAD_EXPIRES_IN_SECONDS
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      image_id: imageId,
      bucket_name: BUCKET_NAME,
      object_path: objectPath,
      upload_url: signedUpload.signedUrl,
      expires_in_seconds: SIGNED_UPLOAD_EXPIRES_IN_SECONDS,
      next_step: 'finalize_image_upload'
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
