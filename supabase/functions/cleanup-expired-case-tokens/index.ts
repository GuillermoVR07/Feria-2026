import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest, logAuditEvent } from '../_shared/audit.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { assertMethod } from '../_shared/validation.ts'

const FUNCTION_NAME = 'cleanup-expired-case-tokens'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

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
    throw new ApiError('FORBIDDEN', 'El usuario no tiene permiso para limpiar tokens.', 403)
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
    metadata: { alcance: 'limpieza_tokens_expirados' }
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
    const now = new Date().toISOString()

    const { data: affectedRows, error } = await adminClient
      .from('case_access_tokens')
      .update({ revoked_at: now })
      .lt('expires_at', now)
      .is('used_at', null)
      .is('revoked_at', null)
      .select('id')

    if (error) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudieron revocar los tokens expirados.', 500)
    }

    const revokedCount = affectedRows?.length ?? 0

    await logAuditEvent(adminClient, {
      actorId,
      action: 'TOKEN_CLEANUP_COMPLETED',
      entityType: 'case_access_tokens',
      entityId: null,
      caseId: null,
      metadata: {
        request_id: requestId,
        revoked_count: revokedCount
      }
    })

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId)

    return successResponse(request, requestId, {
      revoked_count: revokedCount
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
