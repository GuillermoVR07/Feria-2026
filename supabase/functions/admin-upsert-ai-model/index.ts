import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { assertMethod, parseJsonBody } from '../_shared/validation.ts'
import { assertNoExtraKeys, isRecord } from '../_shared/case-access.ts'

const FUNCTION_NAME = 'admin-upsert-ai-model'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type Payload = {
  name: string
  version: string
  architecture: string
  storage_path: string | null
  input_shape: number[]
  class_labels: string[]
  threshold_config: Record<string, unknown>
  metrics: Record<string, unknown>
  is_active: boolean
}

function assertText(value: unknown, fieldName: string, maxLength: number, required = true): string | null {
  if (value === null || value === undefined) {
    if (required) throw new ApiError('VALIDATION_ERROR', `El campo ${fieldName} es obligatorio.`, 400)
    return null
  }

  if (typeof value !== 'string' || value.trim().length < 1 || value.length > maxLength) {
    throw new ApiError('VALIDATION_ERROR', `El campo ${fieldName} no es valido.`, 400)
  }

  return value.trim()
}

function parsePayload(body: unknown): Payload {
  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es valido.', 400)
  }

  assertNoExtraKeys(body, [
    'name',
    'version',
    'architecture',
    'storage_path',
    'input_shape',
    'class_labels',
    'threshold_config',
    'metrics',
    'is_active'
  ], 'principal')

  const inputShape = body.input_shape
  if (
    !Array.isArray(inputShape) ||
    inputShape.length !== 3 ||
    inputShape.some((value) => !Number.isInteger(value) || value <= 0 || value > 10000)
  ) {
    throw new ApiError('VALIDATION_ERROR', 'La forma de entrada del modelo no es valida.', 400)
  }

  const classLabels = body.class_labels
  if (
    !Array.isArray(classLabels) ||
    classLabels.length < 1 ||
    classLabels.some((value) => typeof value !== 'string' || value.trim().length < 1 || value.length > 80)
  ) {
    throw new ApiError('VALIDATION_ERROR', 'Las etiquetas de clases no son validas.', 400)
  }

  if (!isRecord(body.threshold_config)) {
    throw new ApiError('VALIDATION_ERROR', 'La configuracion de umbrales no es valida.', 400)
  }

  if (body.metrics !== undefined && !isRecord(body.metrics)) {
    throw new ApiError('VALIDATION_ERROR', 'Las metricas del modelo no son validas.', 400)
  }

  if (typeof body.is_active !== 'boolean') {
    throw new ApiError('VALIDATION_ERROR', 'El estado activo del modelo no es valido.', 400)
  }

  return {
    name: assertText(body.name, 'name', 120) as string,
    version: assertText(body.version, 'version', 40) as string,
    architecture: assertText(body.architecture, 'architecture', 120) as string,
    storage_path: assertText(body.storage_path, 'storage_path', 500, false),
    input_shape: inputShape,
    class_labels: classLabels.map((value) => value.trim()),
    threshold_config: body.threshold_config,
    metrics: isRecord(body.metrics) ? body.metrics : {},
    is_active: body.is_active
  }
}

async function resolveAdmin(adminClient: SupabaseAdminClient, request: Request): Promise<string> {
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

  if (data.role !== 'admin') {
    throw new ApiError('FORBIDDEN', 'El usuario no tiene permiso para administrar modelos IA.', 403)
  }

  return data.id
}

async function logRequest(
  adminClient: SupabaseAdminClient,
  requestId: string,
  request: Request,
  startedAt: number,
  statusCode: number,
  actorId: string | null,
  errorCode: string | null = null
): Promise<void> {
  await logApiRequest(adminClient, {
    requestId,
    functionName: FUNCTION_NAME,
    method: request.method,
    statusCode,
    actorId,
    caseId: null,
    durationMs: Date.now() - startedAt,
    errorCode,
    metadata: { alcance: 'administracion_modelo_ia' }
  })
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()
  const adminClient = createSupabaseAdminClient()
  let actorId: string | null = null

  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    assertMethod(request, ['POST'])

    actorId = await resolveAdmin(adminClient, request)
    const payload = parsePayload(await parseJsonBody(request))

    if (payload.is_active) {
      const { error: deactivateError } = await adminClient
        .from('ai_models')
        .update({ is_active: false })
        .eq('name', payload.name)
        .eq('is_active', true)

      if (deactivateError) {
        throw new ApiError('INTERNAL_ERROR', 'No se pudieron desactivar modelos anteriores.', 500)
      }
    }

    const { data: model, error: upsertError } = await adminClient
      .from('ai_models')
      .upsert({
        name: payload.name,
        version: payload.version,
        architecture: payload.architecture,
        storage_path: payload.storage_path,
        input_shape: payload.input_shape,
        class_labels: payload.class_labels,
        threshold_config: payload.threshold_config,
        metrics: payload.metrics,
        is_active: payload.is_active
      }, { onConflict: 'name,version' })
      .select('id, name, version, is_active, created_at')
      .single()

    if (upsertError || !model) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudo registrar o actualizar el modelo IA.', 500)
    }

    await logAuditEvent(adminClient, {
      actorId,
      action: 'AI_MODEL_UPSERTED',
      entityType: 'ai_models',
      entityId: model.id,
      caseId: null,
      metadata: {
        request_id: requestId,
        name: model.name,
        version: model.version,
        is_active: model.is_active
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId)

    return successResponse(request, requestId, {
      model_id: model.id,
      name: model.name,
      version: model.version,
      is_active: model.is_active,
      created_at: model.created_at
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
