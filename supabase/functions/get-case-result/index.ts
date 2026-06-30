import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest } from '../_shared/audit.ts'
import { assertMethod, parseJsonBody } from '../_shared/validation.ts'
import { parseCaseTokenPayload, resolveCaseAccess } from '../_shared/case-access.ts'

const FUNCTION_NAME = 'get-case-result'
const SIGNED_ASSET_EXPIRES_IN_SECONDS = 900
const MEDICAL_DISCLAIMER = 'Este resultado es apoyo al triaje y no constituye diagnóstico médico.'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type GetCaseResultPayload = {
  case_code: string
  case_token?: string | null
}

type AssetRecord = {
  bucket_name: string
  object_path: string
}

function parsePayload(body: unknown): GetCaseResultPayload {
  return parseCaseTokenPayload(body, ['case_code', 'case_token'])
}

async function createSignedAssetUrl(
  adminClient: SupabaseAdminClient,
  asset: AssetRecord | null
): Promise<string | null> {
  if (!asset) {
    return null
  }

  const { data, error } = await adminClient
    .storage
    .from(asset.bucket_name)
    .createSignedUrl(asset.object_path, SIGNED_ASSET_EXPIRES_IN_SECONDS)

  if (error || !data?.signedUrl) {
    return null
  }

  return data.signedUrl
}

async function latestImage(adminClient: SupabaseAdminClient, caseId: string, imageKind: string): Promise<AssetRecord | null> {
  const { data } = await adminClient
    .from('case_images')
    .select('bucket_name, object_path')
    .eq('case_id', caseId)
    .eq('image_kind', imageKind)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

async function latestReport(adminClient: SupabaseAdminClient, caseId: string): Promise<AssetRecord | null> {
  const { data } = await adminClient
    .from('pdf_reports')
    .select('bucket_name, object_path')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
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
    metadata: { alcance: 'consulta_resultado_caso' }
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

    const { data: caseRecord, error: caseError } = await adminClient
      .from('cases')
      .select('case_code, status, lesion_site, lesion_duration_days, final_suspicion_level, final_urgency_level, final_recommendation')
      .eq('id', caseId)
      .single()

    if (caseError || !caseRecord) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el caso.', 500)
    }

    const { data: recommendation } = await adminClient
      .from('recommendations')
      .select('suspicion_level, urgency_level, professional_referral, message')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const [originalAsset, gradcamAsset, reportAsset] = await Promise.all([
      latestImage(adminClient, caseId, 'original'),
      latestImage(adminClient, caseId, 'gradcam'),
      latestReport(adminClient, caseId)
    ])

    const [originalUrl, gradcamUrl, reportUrl] = await Promise.all([
      createSignedAssetUrl(adminClient, originalAsset),
      createSignedAssetUrl(adminClient, gradcamAsset),
      createSignedAssetUrl(adminClient, reportAsset)
    ])

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId, caseId)

    return successResponse(request, requestId, {
      case_code: caseRecord.case_code,
      status: caseRecord.status,
      lesion_site: caseRecord.lesion_site,
      lesion_duration_days: caseRecord.lesion_duration_days,
      result: {
        suspicion_level: recommendation?.suspicion_level ?? caseRecord.final_suspicion_level,
        urgency_level: recommendation?.urgency_level ?? caseRecord.final_urgency_level,
        professional_referral: recommendation?.professional_referral ?? null,
        message: recommendation?.message ?? caseRecord.final_recommendation ?? 'El resultado preventivo aún no está disponible.'
      },
      assets: {
        original_image_url: originalUrl,
        gradcam_image_url: gradcamUrl,
        report_download_url: reportUrl
      },
      medical_disclaimer: MEDICAL_DISCLAIMER
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, caseId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
