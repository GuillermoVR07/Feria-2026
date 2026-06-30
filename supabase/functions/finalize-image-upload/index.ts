import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, isUuid, parseJsonBody } from '../_shared/validation.ts'

const FUNCTION_NAME = 'finalize-image-upload'
const TOKEN_PURPOSE = 'case_result_access'
const EXPECTED_CASE_STATUS = 'image_upload_requested'
const FINAL_CASE_STATUS = 'image_uploaded'
const NEXT_STEP = 'validate_image'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type FinalizeImageUploadPayload = {
  case_code: string
  case_token?: string | null
  image_id: string
  metadata: {
    width_px?: number | null
    height_px?: number | null
    sha256_hash?: string | null
  }
}

type CaseAccess = {
  caseId: string
  actorId: string | null
  accessMode: 'case_token' | 'internal_auth'
  currentStatus: string
}

type CaseImageRecord = {
  id: string
  case_id: string
  image_kind: string
  bucket_name: string
  object_path: string
  mime_type: string
  size_bytes: number
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

function optionalPositiveInteger(value: unknown, fieldName: string): number | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 50000) {
    throw new ApiError('VALIDATION_ERROR', `El campo ${fieldName} no es válido.`, 400)
  }

  return value
}

function optionalSha256Hash(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new ApiError('VALIDATION_ERROR', 'El hash SHA-256 no es válido.', 400)
  }

  return value.toLowerCase()
}

function parsePayload(body: unknown): FinalizeImageUploadPayload {
  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es válido.', 400)
  }

  assertNoExtraKeys(body, ['case_code', 'case_token', 'image_id', 'metadata'], 'principal')

  if (typeof body.case_code !== 'string' || body.case_code.length < 1 || body.case_code.length > 80) {
    throw new ApiError('VALIDATION_ERROR', 'El código de caso no es válido.', 400)
  }

  if (body.case_token !== undefined && body.case_token !== null && typeof body.case_token !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'El token temporal no es válido.', 400)
  }

  if (!isUuid(body.image_id)) {
    throw new ApiError('VALIDATION_ERROR', 'El identificador de imagen no es válido.', 400)
  }

  if (!isRecord(body.metadata)) {
    throw new ApiError('VALIDATION_ERROR', 'La metadata de imagen no es válida.', 400)
  }

  assertNoExtraKeys(body.metadata, ['width_px', 'height_px', 'sha256_hash'], 'metadata')

  return {
    case_code: body.case_code,
    case_token: body.case_token ?? null,
    image_id: body.image_id,
    metadata: {
      width_px: optionalPositiveInteger(body.metadata.width_px, 'width_px'),
      height_px: optionalPositiveInteger(body.metadata.height_px, 'height_px'),
      sha256_hash: optionalSha256Hash(body.metadata.sha256_hash)
    }
  }
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
  payload: FinalizeImageUploadPayload
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

  if (caseRecord.status !== EXPECTED_CASE_STATUS) {
    throw new ApiError('VALIDATION_ERROR', 'El caso no está en un estado válido para finalizar la subida de imagen.', 400, {
      estado_actual: caseRecord.status,
      estado_requerido: EXPECTED_CASE_STATUS
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

async function getCaseImage(
  adminClient: SupabaseAdminClient,
  caseId: string,
  imageId: string
): Promise<CaseImageRecord> {
  const { data, error } = await adminClient
    .from('case_images')
    .select('id, case_id, image_kind, bucket_name, object_path, mime_type, size_bytes')
    .eq('id', imageId)
    .eq('case_id', caseId)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar la imagen.', 500)
  }

  if (!data) {
    throw new ApiError('IMAGE_NOT_FOUND', 'Imagen no encontrada.', 404)
  }

  if (data.image_kind !== 'original') {
    throw new ApiError('VALIDATION_ERROR', 'Solo se puede finalizar la subida de una imagen original.', 400)
  }

  return data
}

function splitObjectPath(objectPath: string): { folder: string; fileName: string } {
  const lastSlashIndex = objectPath.lastIndexOf('/')

  if (lastSlashIndex < 1 || lastSlashIndex >= objectPath.length - 1) {
    throw new ApiError('INTERNAL_ERROR', 'La ruta interna de imagen no tiene formato esperado.', 500)
  }

  return {
    folder: objectPath.slice(0, lastSlashIndex),
    fileName: objectPath.slice(lastSlashIndex + 1)
  }
}

async function assertStorageObjectExists(adminClient: SupabaseAdminClient, image: CaseImageRecord): Promise<void> {
  const { folder, fileName } = splitObjectPath(image.object_path)
  const { data, error } = await adminClient
    .storage
    .from(image.bucket_name)
    .list(folder, {
      limit: 10,
      search: fileName
    })

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo verificar el objeto en Storage.', 500)
  }

  const objectExists = data?.some((object) => object.name === fileName)

  if (!objectExists) {
    throw new ApiError('IMAGE_NOT_FOUND', 'El archivo de imagen no existe en Storage.', 404)
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
      alcance: 'finalizacion_subida_imagen'
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

    const image = await getCaseImage(adminClient, caseId, payload.image_id)
    await assertStorageObjectExists(adminClient, image)

    const { error: imageUpdateError } = await adminClient
      .from('case_images')
      .update({
        width_px: payload.metadata.width_px,
        height_px: payload.metadata.height_px,
        sha256_hash: payload.metadata.sha256_hash
      })
      .eq('id', image.id)

    if (imageUpdateError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo completar la metadata técnica de imagen.', 500)
    }

    const { error: caseUpdateError } = await adminClient
      .from('cases')
      .update({
        status: FINAL_CASE_STATUS
      })
      .eq('id', caseId)

    if (caseUpdateError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo actualizar el estado del caso.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'IMAGE_UPLOAD_FINALIZED',
      entityType: 'case_images',
      entityId: image.id,
      caseId,
      metadata: {
        case_code: payload.case_code,
        image_id: image.id,
        bucket_name: image.bucket_name,
        object_path: image.object_path,
        mime_type: image.mime_type,
        size_bytes: image.size_bytes,
        width_px: payload.metadata.width_px,
        height_px: payload.metadata.height_px,
        sha256_hash_present: Boolean(payload.metadata.sha256_hash),
        access_mode: access.accessMode,
        estado_anterior: access.currentStatus,
        estado_nuevo: FINAL_CASE_STATUS
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      image_id: image.id,
      status: FINAL_CASE_STATUS,
      next_step: NEXT_STEP
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
