import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, isUuid, parseJsonBody } from '../_shared/validation.ts'
import { parseCaseTokenPayload, resolveCaseAccess } from '../_shared/case-access.ts'

const FUNCTION_NAME = 'create-signed-read-url'
const EXPIRES_IN_SECONDS = 600

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type AssetType = 'original_image' | 'gradcam_image' | 'thumbnail_image' | 'report_pdf'

type Payload = {
  case_code: string
  case_token?: string | null
  asset_type: AssetType
  asset_id: string
}

type AssetRecord = {
  bucket_name: string
  object_path: string
}

function parsePayload(body: unknown): Payload {
  const base = parseCaseTokenPayload(body, ['case_code', 'case_token', 'asset_type', 'asset_id'])
  const record = body as Record<string, unknown>

  if (
    record.asset_type !== 'original_image' &&
    record.asset_type !== 'gradcam_image' &&
    record.asset_type !== 'thumbnail_image' &&
    record.asset_type !== 'report_pdf'
  ) {
    throw new ApiError('VALIDATION_ERROR', 'El tipo de recurso solicitado no es valido.', 400)
  }

  if (!isUuid(record.asset_id)) {
    throw new ApiError('VALIDATION_ERROR', 'El identificador del recurso no es valido.', 400)
  }

  return {
    ...base,
    asset_type: record.asset_type,
    asset_id: record.asset_id
  }
}

function imageKindFromAssetType(assetType: AssetType): string | null {
  if (assetType === 'original_image') return 'original'
  if (assetType === 'gradcam_image') return 'gradcam'
  if (assetType === 'thumbnail_image') return 'thumbnail'
  return null
}

async function findAsset(
  adminClient: SupabaseAdminClient,
  payload: Payload,
  caseId: string
): Promise<AssetRecord> {
  if (payload.asset_type === 'report_pdf') {
    const { data, error } = await adminClient
      .from('pdf_reports')
      .select('bucket_name, object_path')
      .eq('id', payload.asset_id)
      .eq('case_id', caseId)
      .maybeSingle()

    if (error) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el reporte.', 500)
    }

    if (!data) {
      throw new ApiError('NOT_FOUND', 'Recurso inexistente o inaccesible.', 404)
    }

    return data
  }

  const imageKind = imageKindFromAssetType(payload.asset_type)
  const { data, error } = await adminClient
    .from('case_images')
    .select('bucket_name, object_path')
    .eq('id', payload.asset_id)
    .eq('case_id', caseId)
    .eq('image_kind', imageKind)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar la imagen.', 500)
  }

  if (!data) {
    throw new ApiError('NOT_FOUND', 'Recurso inexistente o inaccesible.', 404)
  }

  return data
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
    metadata: { alcance: 'url_firmada_lectura' }
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
      caseToken: payload.case_token
    })
    actorId = access.actorId
    caseId = access.caseId

    const asset = await findAsset(adminClient, payload, caseId)
    const { data, error } = await adminClient
      .storage
      .from(asset.bucket_name)
      .createSignedUrl(asset.object_path, EXPIRES_IN_SECONDS)

    if (error || !data?.signedUrl) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear la URL temporal.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'SIGNED_URL_CREATED',
      entityType: payload.asset_type === 'report_pdf' ? 'pdf_reports' : 'case_images',
      entityId: payload.asset_id,
      caseId,
      metadata: {
        request_id: requestId,
        asset_type: payload.asset_type,
        expires_in_seconds: EXPIRES_IN_SECONDS
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      signed_url: data.signedUrl,
      expires_in_seconds: EXPIRES_IN_SECONDS
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
