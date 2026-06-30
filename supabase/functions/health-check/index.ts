import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest } from '../_shared/audit.ts'
import { assertMethod } from '../_shared/validation.ts'

const FUNCTION_NAME = 'health-check'

async function registrarRequest(
  requestId: string,
  request: Request,
  startedAt: number,
  statusCode: number,
  errorCode: string | null = null
) {
  try {
    const adminClient = createSupabaseAdminClient()

    await logApiRequest(adminClient, {
      requestId,
      functionName: FUNCTION_NAME,
      method: request.method,
      statusCode,
      durationMs: Date.now() - startedAt,
      errorCode,
      metadata: {
        alcance: 'disponibilidad_basica'
      }
    })
  } catch (error) {
    console.error('No se pudo registrar la solicitud de health-check.', error)
  }
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID()
  const startedAt = Date.now()

  if (request.method === 'OPTIONS') {
    return optionsResponse(request)
  }

  try {
    assertMethod(request, ['GET'])

    const data = {
      service: 'oraldiagnostic-backend',
      status: 'ok',
      environment: Deno.env.get('ENVIRONMENT') ?? 'production'
    }

    await registrarRequest(requestId, request, startedAt, 200)

    return successResponse(request, requestId, data)
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await registrarRequest(requestId, request, startedAt, apiError.status, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
