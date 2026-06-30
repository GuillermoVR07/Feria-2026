import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { ApiError, normalizeUnknownError } from '../_shared/errors.ts'
import { optionsResponse } from '../_shared/cors.ts'
import { errorResponse, successResponse } from '../_shared/response.ts'
import { createSupabaseAdminClient } from '../_shared/supabase-admin.ts'
import { logApiRequest } from '../_shared/audit.ts'
import { getAuthenticatedUser } from '../_shared/auth.ts'
import { assertMethod } from '../_shared/validation.ts'

const FUNCTION_NAME = 'dashboard-metrics'

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>

type InternalActor = {
  id: string
  role: string
}

async function resolveDashboardActor(adminClient: SupabaseAdminClient, request: Request): Promise<InternalActor> {
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

  if (data.role !== 'admin' && data.role !== 'specialist' && data.role !== 'researcher') {
    throw new ApiError('FORBIDDEN', 'El usuario no tiene permiso para consultar metricas.', 403)
  }

  return {
    id: data.id,
    role: data.role
  }
}

async function countRows(
  adminClient: SupabaseAdminClient,
  tableName: string,
  buildQuery?: (query: any) => any
): Promise<number> {
  let query: any = adminClient
    .from(tableName)
    .select('id', { count: 'exact', head: true })

  if (buildQuery) {
    query = buildQuery(query)
  }

  const { count, error } = await query

  if (error) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudieron calcular las metricas agregadas.', 500)
  }

  return count ?? 0
}

function countByValue<T extends string>(
  rows: Record<string, unknown>[] | null,
  fieldName: string,
  allowedValues: T[]
): Record<T, number> {
  const result = Object.fromEntries(allowedValues.map((value) => [value, 0])) as Record<T, number>

  for (const row of rows ?? []) {
    const value = row[fieldName]
    if (typeof value === 'string' && allowedValues.includes(value as T)) {
      result[value as T] += 1
    }
  }

  return result
}

function averageLatency(rows: { latency_ms: number | null }[] | null): number | null {
  const values = (rows ?? [])
    .map((row) => row.latency_ms)
    .filter((value): value is number => typeof value === 'number')

  if (values.length === 0) {
    return null
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
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
    metadata: { alcance: 'metricas_agregadas' }
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
    assertMethod(request, ['GET'])

    const actor = await resolveDashboardActor(adminClient, request)
    actorId = actor.id

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [totalCases, casesLast30Days, pendingReview] = await Promise.all([
      countRows(adminClient, 'cases'),
      countRows(adminClient, 'cases', (query) => query.gte('created_at', thirtyDaysAgo)),
      countRows(adminClient, 'cases', (query) => query.in('status', ['recommendation_ready', 'reported', 'under_review']))
    ])

    const [{ data: suspicionRows, error: suspicionError }, { data: qualityRows, error: qualityError }, { data: latencyRows, error: latencyError }] = await Promise.all([
      adminClient
        .from('cases')
        .select('final_suspicion_level')
        .not('final_suspicion_level', 'is', null),
      adminClient
        .from('image_quality_checks')
        .select('status'),
      adminClient
        .from('ai_inferences')
        .select('latency_ms')
        .not('latency_ms', 'is', null)
    ])

    if (suspicionError || qualityError || latencyError) {
      throw new ApiError('INTERNAL_ERROR', 'No se pudieron calcular las metricas agregadas.', 500)
    }

    await logRequest(adminClient, requestId, request, startedAt, 200, actorId)

    return successResponse(request, requestId, {
      cases_last_30_days: casesLast30Days,
      total_cases: totalCases,
      pending_review: pendingReview,
      by_suspicion_level: countByValue(suspicionRows, 'final_suspicion_level', ['low', 'moderate', 'high']),
      image_quality: countByValue(qualityRows, 'status', ['accepted', 'rejected']),
      average_ai_latency_ms: averageLatency(latencyRows)
    })
  } catch (error) {
    const apiError = error instanceof ApiError ? error : normalizeUnknownError(error)

    await logRequest(adminClient, requestId, request, startedAt, apiError.status, actorId, apiError.code)

    return errorResponse(request, requestId, apiError)
  }
})
