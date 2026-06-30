import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, isUuid, parseJsonBody } from '../_shared/validation.ts'
import {
  assertNoExtraKeys,
  isRecord,
  parseCaseTokenPayload,
  resolveCaseAccess
} from '../_shared/case-access.ts'

const FUNCTION_NAME = 'validate-image'
const ALLOWED_STATUSES = ['image_uploaded']
const MIN_WIDTH_PX = 640
const MIN_HEIGHT_PX = 480
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type ValidateImagePayload = {
  case_code: string
  case_token?: string | null
  image_id: string
}

type CaseImage = {
  id: string
  case_id: string
  image_kind: string
  mime_type: string
  size_bytes: number
  width_px: number | null
  height_px: number | null
  bucket_name: string
  object_path: string
}

function parsePayload(body: unknown): ValidateImagePayload {
  const base = parseCaseTokenPayload(body, ['case_code', 'case_token', 'image_id'])

  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es válido.', 400)
  }

  assertNoExtraKeys(body, ['case_code', 'case_token', 'image_id'], 'principal')

  if (!isUuid(body.image_id)) {
    throw new ApiError('VALIDATION_ERROR', 'El identificador de imagen no es válido.', 400)
  }

  return {
    ...base,
    image_id: body.image_id
  }
}

async function getCaseImage(adminClient: SupabaseAdminClient, caseId: string, imageId: string): Promise<CaseImage> {
  const { data, error } = await adminClient
    .from('case_images')
    .select('id, case_id, image_kind, mime_type, size_bytes, width_px, height_px, bucket_name, object_path')
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
    throw new ApiError('VALIDATION_ERROR', 'Solo se puede validar una imagen original.', 400)
  }

  return data
}

function calculateScores(image: CaseImage) {
  const width = image.width_px ?? 0
  const height = image.height_px ?? 0
  const megapixels = (width * height) / 1_000_000
  const sharpnessScore = Number(Math.min(220, Math.max(0, megapixels * 120)).toFixed(2))
  const brightnessScore = 128
  const contrastScore = Number(Math.min(120, Math.max(0, image.size_bytes / 1024)).toFixed(2))

  return {
    sharpness_score: sharpnessScore,
    brightness_score: brightnessScore,
    contrast_score: contrastScore
  }
}

function evaluateImage(image: CaseImage) {
  const rejectionReasons: string[] = []
  const resolutionOk = (image.width_px ?? 0) >= MIN_WIDTH_PX && (image.height_px ?? 0) >= MIN_HEIGHT_PX
  const formatOk = ALLOWED_MIME_TYPES.has(image.mime_type)
  const focusOk = resolutionOk
  const illuminationOk = image.size_bytes > 0

  if (!formatOk) {
    rejectionReasons.push('INVALID_FORMAT')
  }

  if (!resolutionOk) {
    rejectionReasons.push('LOW_RESOLUTION')
  }

  if (!focusOk) {
    rejectionReasons.push('IMAGE_BLURRY')
  }

  if (!illuminationOk) {
    rejectionReasons.push('LOW_LIGHT')
  }

  return {
    status: rejectionReasons.length === 0 ? 'accepted' : 'rejected',
    resolutionOk,
    focusOk,
    illuminationOk,
    rejectionReasons,
    scores: calculateScores(image)
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
      alcance: 'validacion_calidad_imagen'
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
    const access = await resolveCaseAccess(adminClient, request, {
      caseCode: payload.case_code,
      caseToken: payload.case_token,
      allowedStatuses: ALLOWED_STATUSES
    })
    actorId = access.actorId
    caseId = access.caseId

    const image = await getCaseImage(adminClient, caseId, payload.image_id)
    const evaluation = evaluateImage(image)
    const nextCaseStatus = evaluation.status === 'accepted' ? 'quality_accepted' : 'image_rejected'

    const { error: qualityError } = await adminClient
      .from('image_quality_checks')
      .insert({
        image_id: image.id,
        status: evaluation.status,
        sharpness_score: evaluation.scores.sharpness_score,
        brightness_score: evaluation.scores.brightness_score,
        contrast_score: evaluation.scores.contrast_score,
        resolution_ok: evaluation.resolutionOk,
        focus_ok: evaluation.focusOk,
        illumination_ok: evaluation.illuminationOk,
        rejection_reasons: evaluation.rejectionReasons,
        metadata: {
          metodo: 'validacion_tecnica_mvp',
          width_px: image.width_px,
          height_px: image.height_px,
          mime_type: image.mime_type,
          size_bytes: image.size_bytes
        }
      })

    if (qualityError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar la validación técnica de imagen.', 500)
    }

    const { error: caseUpdateError } = await adminClient
      .from('cases')
      .update({ status: nextCaseStatus })
      .eq('id', caseId)

    if (caseUpdateError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo actualizar el estado del caso.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'IMAGE_QUALITY_CHECKED',
      entityType: 'image_quality_checks',
      entityId: image.id,
      caseId,
      metadata: {
        case_code: payload.case_code,
        image_id: image.id,
        quality_status: evaluation.status,
        rejection_reasons: evaluation.rejectionReasons,
        estado_anterior: access.currentStatus,
        estado_nuevo: nextCaseStatus
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    if (evaluation.status === 'accepted') {
      return successResponse(request, requestId, {
        image_id: image.id,
        quality_status: 'accepted',
        scores: evaluation.scores,
        next_step: 'run_inference'
      })
    }

    return successResponse(request, requestId, {
      image_id: image.id,
      quality_status: 'rejected',
      rejection_reasons: evaluation.rejectionReasons,
      message: 'La imagen no tiene calidad técnica suficiente. Repita la captura con buena iluminación y enfoque.',
      next_step: 'repeat_capture'
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
