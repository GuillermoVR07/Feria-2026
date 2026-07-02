import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { assertMethod, isUuid, parseJsonBody } from '../_shared/validation.ts'
import { buildPreventiveRecommendation } from '../_shared/recommendation-engine.ts'
import {
  assertNoExtraKeys,
  isRecord,
  parseCaseTokenPayload,
  resolveCaseAccess,
  sha256Hex
} from '../_shared/case-access.ts'

const FUNCTION_NAME = 'run-inference'
const ALLOWED_STATUSES = ['quality_accepted']
const SIGNED_READ_EXPIRES_IN_SECONDS = 300
const AI_ENDPOINT_PATH = '/v1/inference/oral-lesion'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type RunInferencePayload = {
  case_code: string
  case_token?: string | null
  image_id: string
}

type AiModel = {
  id: string
  name: string
  version: string
  architecture: string
}

type OriginalImage = {
  id: string
  case_id: string
  bucket_name: string
  object_path: string
  mime_type: string
  size_bytes: number
}

type AiServiceResponse = {
  service_request_id?: string
  suspicion_level: 'low' | 'moderate' | 'high'
  probability: number
  class_probabilities: Record<string, number>
  model_name?: string
  model_version?: string
  architecture?: string
  gradcam_base64?: string | null
  gradcam_mime_type?: string | null
  latency_ms?: number | null
  warnings?: string[]
}

type RiskQuestionnaire = {
  bleeding: boolean
  growth: boolean
  white_patch: boolean
  red_patch: boolean
  non_healing_ulcer: boolean
  lump_or_induration: boolean
  dysphagia: boolean
}

function parsePayload(body: unknown): RunInferencePayload {
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

async function getOriginalImage(adminClient: SupabaseAdminClient, caseId: string, imageId: string): Promise<OriginalImage> {
  const { data, error } = await adminClient
    .from('case_images')
    .select('id, case_id, bucket_name, object_path, mime_type, size_bytes, image_kind')
    .eq('id', imageId)
    .eq('case_id', caseId)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar la imagen.', 500)
  }

  if (!data || data.image_kind !== 'original') {
    throw new ApiError('IMAGE_NOT_FOUND', 'Imagen original no encontrada.', 404)
  }

  return data
}

async function assertLatestQualityAccepted(adminClient: SupabaseAdminClient, imageId: string): Promise<void> {
  const { data, error } = await adminClient
    .from('image_quality_checks')
    .select('status')
    .eq('image_id', imageId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar la calidad de imagen.', 500)
  }

  if (!data || data.status !== 'accepted') {
    throw new ApiError('IMAGE_QUALITY_REJECTED', 'La imagen no tiene calidad técnica aceptada para inferencia.', 400)
  }
}

async function getActiveModel(adminClient: SupabaseAdminClient): Promise<AiModel> {
  const { data, error } = await adminClient
    .from('ai_models')
    .select('id, name, version, architecture')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el modelo IA activo.', 500)
  }

  if (!data) {
    throw new ApiError('AI_SERVICE_UNAVAILABLE', 'No hay modelo IA activo configurado.', 503)
  }

  return data
}

async function getRiskQuestionnaire(adminClient: SupabaseAdminClient, caseId: string): Promise<RiskQuestionnaire> {
  const { data, error } = await adminClient
    .from('risk_questionnaires')
    .select('bleeding, growth, white_patch, red_patch, non_healing_ulcer, lump_or_induration, dysphagia')
    .eq('case_id', caseId)
    .maybeSingle()

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el cuestionario de riesgo.', 500)
  }

  if (!data) {
    throw new ApiError('VALIDATION_ERROR', 'El caso no tiene cuestionario de riesgo registrado.', 400)
  }

  return data
}

async function getActiveRuleCodes(adminClient: SupabaseAdminClient): Promise<Set<string>> {
  const { data, error } = await adminClient
    .from('triage_rules')
    .select('code')
    .eq('is_active', true)

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudieron consultar reglas preventivas.', 500)
  }

  return new Set((data ?? []).map((rule) => rule.code))
}

function parseAiResponse(value: unknown): AiServiceResponse {
  if (!isRecord(value)) {
    throw new ApiError('AI_INFERENCE_FAILED', 'La respuesta del servicio IA no es válida.', 502)
  }

  const suspicionLevel = value.suspicion_level
  const probability = value.probability
  const classProbabilities = value.class_probabilities
  const requiredClassLabels = ['low', 'moderate', 'high']

  if (
    typeof suspicionLevel !== 'string' ||
    !['low', 'moderate', 'high'].includes(suspicionLevel) ||
    typeof probability !== 'number' ||
    probability < 0 ||
    probability > 1 ||
    !isRecord(classProbabilities)
  ) {
    throw new ApiError('AI_INFERENCE_FAILED', 'La respuesta del servicio IA no tiene el formato esperado.', 502)
  }

  for (const label of requiredClassLabels) {
    if (typeof classProbabilities[label] !== 'number') {
      throw new ApiError('AI_INFERENCE_FAILED', 'La respuesta del servicio IA no contiene todas las clases esperadas.', 502)
    }
  }

  const probabilitySum = requiredClassLabels
    .map((label) => classProbabilities[label] as number)
    .reduce((total, current) => total + current, 0)

  if (probabilitySum < 0.95 || probabilitySum > 1.05) {
    throw new ApiError('AI_INFERENCE_FAILED', 'Las probabilidades del servicio IA no son consistentes.', 502, {
      probability_sum: probabilitySum
    })
  }

  const gradcamBase64 = typeof value.gradcam_base64 === 'string'
    ? value.gradcam_base64
    : typeof value.gradcam_base64_png === 'string'
      ? value.gradcam_base64_png
      : null

  return {
    service_request_id: typeof value.service_request_id === 'string' ? value.service_request_id : undefined,
    model_name: typeof value.model_name === 'string' ? value.model_name : undefined,
    model_version: typeof value.model_version === 'string' ? value.model_version : undefined,
    architecture: typeof value.architecture === 'string' ? value.architecture : undefined,
    suspicion_level: suspicionLevel as AiServiceResponse['suspicion_level'],
    probability,
    class_probabilities: classProbabilities as Record<string, number>,
    gradcam_base64: gradcamBase64,
    gradcam_mime_type: typeof value.gradcam_mime_type === 'string' ? value.gradcam_mime_type : null,
    latency_ms: typeof value.latency_ms === 'number' ? value.latency_ms : null,
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((item) => typeof item === 'string') : []
  }
}

async function callAiService(input: {
  imageSignedUrl: string
  caseCode: string
  imageId: string
  model: AiModel
}): Promise<AiServiceResponse> {
  const serviceUrl = Deno.env.get('AI_SERVICE_URL')
  const serviceToken = Deno.env.get('AI_SERVICE_TOKEN')

  if (!serviceUrl || !serviceToken) {
    throw new ApiError('AI_SERVICE_UNAVAILABLE', 'Servicio IA no configurado.', 503)
  }

  const endpoint = `${serviceUrl.replace(/\/$/, '')}${AI_ENDPOINT_PATH}`
  const startedAt = Date.now()
  let response: Response

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        case_code: input.caseCode,
        image_id: input.imageId,
        image_url: input.imageSignedUrl,
        model: {
          name: input.model.name,
          version: input.model.version,
          architecture: input.model.architecture
        }
      })
    })
  } catch (_error) {
    throw new ApiError('AI_INFERENCE_FAILED', 'Servicio IA no respondio dentro del tiempo esperado.', 502)
  }

  if (!response.ok) {
    throw new ApiError('AI_INFERENCE_FAILED', 'Fallo en inferencia de apoyo al triaje.', 502, {
      status: response.status
    })
  }

  const parsed = parseAiResponse(await response.json())

  if (
    (parsed.model_name && parsed.model_name !== input.model.name) ||
    (parsed.model_version && parsed.model_version !== input.model.version)
  ) {
    throw new ApiError('AI_INFERENCE_FAILED', 'El servicio IA respondio con un modelo distinto al solicitado.', 502, {
      expected_model: {
        name: input.model.name,
        version: input.model.version
      },
      received_model: {
        name: parsed.model_name ?? null,
        version: parsed.model_version ?? null
      }
    })
  }

  parsed.latency_ms = parsed.latency_ms ?? Date.now() - startedAt

  return parsed
}

function buildRecommendation(input: {
  suspicionLevel: 'low' | 'moderate' | 'high'
  lesionDurationDays: number
}) {
  const reasonCodes: string[] = [`AI_${input.suspicionLevel.toUpperCase()}`]
  let urgencyLevel: 'routine' | 'priority' | 'urgent' = 'routine'
  let professionalReferral = false
  let message = 'La orientación preventiva sugiere seguimiento y cuidado de la salud bucal. El sistema no confirma diagnóstico.'

  if (input.lesionDurationDays >= 14) {
    reasonCodes.push('LESION_OVER_14_DAYS')
  }

  if (input.suspicionLevel === 'moderate' || input.lesionDurationDays >= 14) {
    urgencyLevel = 'priority'
    professionalReferral = true
    message = 'La imagen y los datos del caso justifican revisión profesional preventiva. El sistema no confirma cáncer.'
  }

  if (input.suspicionLevel === 'high') {
    urgencyLevel = 'urgent'
    professionalReferral = true
    message = 'La imagen presenta señales visuales que justifican derivación profesional prioritaria. El sistema no confirma cáncer.'
  }

  return {
    urgency_level: urgencyLevel,
    professional_referral: professionalReferral,
    reason_codes: reasonCodes,
    message
  }
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function maybeStoreGradcam(adminClient: SupabaseAdminClient, input: {
  caseCode: string
  caseId: string
  gradcamBase64?: string | null
  gradcamMimeType?: string | null
}): Promise<string | null> {
  if (!input.gradcamBase64) {
    return null
  }

  const mimeType = input.gradcamMimeType ?? 'image/png'
  const extension = mimeType === 'image/webp' ? 'webp' : mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const imageId = crypto.randomUUID()
  const objectPath = `${input.caseCode}/${imageId}.${extension}`
  const bytes = decodeBase64(input.gradcamBase64)
  const hash = await sha256Hex(input.gradcamBase64)

  const { error: uploadError } = await adminClient
    .storage
    .from('case-gradcam')
    .upload(objectPath, bytes, {
      contentType: mimeType,
      upsert: false
    })

  if (uploadError) {
    throw new ApiError('AI_INFERENCE_FAILED', 'No se pudo guardar la imagen Grad-CAM.', 502)
  }

  const { error: imageError } = await adminClient
    .from('case_images')
    .insert({
      id: imageId,
      case_id: input.caseId,
      image_kind: 'gradcam',
      bucket_name: 'case-gradcam',
      object_path: objectPath,
      mime_type: mimeType,
      size_bytes: bytes.length,
      sha256_hash: hash
    })

  if (imageError) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar la imagen Grad-CAM.', 500)
  }

  return imageId
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
    metadata: { alcance: 'inferencia_ia' }
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

    const image = await getOriginalImage(adminClient, caseId, payload.image_id)
    await assertLatestQualityAccepted(adminClient, image.id)
    const model = await getActiveModel(adminClient)

    const { data: signedUrl, error: signedError } = await adminClient
      .storage
      .from(image.bucket_name)
      .createSignedUrl(image.object_path, SIGNED_READ_EXPIRES_IN_SECONDS)

    if (signedError || !signedUrl?.signedUrl) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo crear URL firmada para inferencia.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'AI_INFERENCE_STARTED',
      entityType: 'cases',
      entityId: caseId,
      caseId,
      metadata: {
        case_code: payload.case_code,
        image_id: image.id,
        model_id: model.id
      }
    })

    const aiResponse = await callAiService({
      imageSignedUrl: signedUrl.signedUrl,
      caseCode: payload.case_code,
      imageId: image.id,
      model
    })

    const gradcamImageId = await maybeStoreGradcam(adminClient, {
      caseCode: payload.case_code,
      caseId,
      gradcamBase64: aiResponse.gradcam_base64,
      gradcamMimeType: aiResponse.gradcam_mime_type
    })

    const { data: caseRecord, error: caseError } = await adminClient
      .from('cases')
      .select('lesion_duration_days')
      .eq('id', caseId)
      .single()

    if (caseError || !caseRecord) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar datos del caso.', 500)
    }

    const { data: inference, error: inferenceError } = await adminClient
      .from('ai_inferences')
      .insert({
        case_id: caseId,
        image_id: image.id,
        model_id: model.id,
        suspicion_level: aiResponse.suspicion_level,
        probability: aiResponse.probability,
        class_probabilities: aiResponse.class_probabilities,
        gradcam_image_id: gradcamImageId,
        latency_ms: aiResponse.latency_ms,
        service_request_id: aiResponse.service_request_id ?? null,
        metadata: {
          signed_url_ttl_seconds: SIGNED_READ_EXPIRES_IN_SECONDS,
          ai_service_warnings: aiResponse.warnings ?? [],
          ai_service_model: {
            name: aiResponse.model_name ?? model.name,
            version: aiResponse.model_version ?? model.version,
            architecture: aiResponse.architecture ?? model.architecture
          }
        }
      })
      .select('id')
      .single()

    if (inferenceError || !inference) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar la inferencia IA.', 500)
    }

    const questionnaire = await getRiskQuestionnaire(adminClient, caseId)
    const activeRuleCodes = await getActiveRuleCodes(adminClient)
    const recommendation = buildPreventiveRecommendation({
      imageQualityStatus: 'accepted',
      aiLevel: aiResponse.suspicion_level,
      probability: aiResponse.probability,
      lesionDurationDays: caseRecord.lesion_duration_days,
      symptoms: {
        bleeding: questionnaire.bleeding,
        growth: questionnaire.growth,
        whitePatch: questionnaire.white_patch,
        redPatch: questionnaire.red_patch,
        nonHealingUlcer: questionnaire.non_healing_ulcer,
        lumpOrInduration: questionnaire.lump_or_induration,
        dysphagia: questionnaire.dysphagia
      },
      activeRuleCodes
    })

    const { data: recommendationRecord, error: recommendationError } = await adminClient
      .from('recommendations')
      .insert({
        case_id: caseId,
        inference_id: inference.id,
        suspicion_level: recommendation.suspicion_level,
        urgency_level: recommendation.urgency_level,
        professional_referral: recommendation.professional_referral,
        reason_codes: recommendation.reason_codes,
        message: recommendation.message
      })
      .select('id')
      .single()

    if (recommendationError || !recommendationRecord) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar la recomendación preventiva.', 500)
    }

    const nextStatus = recommendation.urgency_level === 'priority' || recommendation.urgency_level === 'urgent'
      ? 'under_review'
      : 'recommendation_ready'

    const { error: caseUpdateError } = await adminClient
      .from('cases')
      .update({
        final_suspicion_level: recommendation.suspicion_level,
        final_urgency_level: recommendation.urgency_level,
        final_recommendation: recommendation.message,
        status: nextStatus
      })
      .eq('id', caseId)

    if (caseUpdateError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo actualizar el resultado del caso.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'AI_INFERENCE_COMPLETED',
      entityType: 'ai_inferences',
      entityId: inference.id,
      caseId,
      metadata: {
        case_code: payload.case_code,
        image_id: image.id,
        model_id: model.id,
        suspicion_level: recommendation.suspicion_level,
        urgency_level: recommendation.urgency_level,
        estado_nuevo: nextStatus
      }
    })

    await logAuditEvent(adminClient, {
      actorId,
      action: 'RECOMMENDATION_CREATED',
      entityType: 'recommendations',
      entityId: recommendationRecord.id,
      caseId,
      metadata: {
        case_code: payload.case_code,
        inference_id: inference.id,
        suspicion_level: recommendation.suspicion_level,
        urgency_level: recommendation.urgency_level,
        professional_referral: recommendation.professional_referral,
        reason_codes: recommendation.reason_codes,
        estado_nuevo: nextStatus
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      case_id: caseId,
      image_id: image.id,
      inference_id: inference.id,
      model: {
        name: model.name,
        version: model.version,
        architecture: model.architecture
      },
      prediction: {
        suspicion_level: aiResponse.suspicion_level,
        probability: aiResponse.probability,
        class_probabilities: aiResponse.class_probabilities
      },
      recommendation: recommendation,
      next_step: 'generate_report'
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    if (caseId && apiError.code === 'AI_INFERENCE_FAILED') {
      await adminClient.from('cases').update({ status: 'ai_failed' }).eq('id', caseId)
      await logAuditEvent(adminClient, {
        actorId,
        action: 'AI_INFERENCE_FAILED',
        entityType: 'cases',
        entityId: caseId,
        caseId,
        metadata: {
          request_id: requestId,
          error_code: apiError.code,
          status: 'ai_failed'
        }
      })
    }

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
