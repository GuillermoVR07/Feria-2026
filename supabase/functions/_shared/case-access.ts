import { ApiError } from './errors.ts'
import { getAuthenticatedUser } from './auth.ts'

type SupabaseAdminClient = ReturnType<typeof import('./supabase-admin.ts').createSupabaseAdminClient>

export type CaseAccess = {
  caseId: string
  actorId: string | null
  accessMode: 'case_token' | 'internal_auth'
  currentStatus: string
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashCaseToken(token: string): Promise<string> {
  const secret = Deno.env.get('CASE_TOKEN_SECRET')

  if (!secret) {
    throw new ApiError('INTERNAL_ERROR', 'Variable de entorno CASE_TOKEN_SECRET no configurada.', 500)
  }

  return sha256Hex(`${secret}:${token}`)
}

export async function resolveInternalActor(adminClient: SupabaseAdminClient, request: Request): Promise<string | null> {
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

export async function resolveCaseAccess(
  adminClient: SupabaseAdminClient,
  request: Request,
  input: {
    caseCode: string
    caseToken?: string | null
    allowedStatuses?: string[]
  }
): Promise<CaseAccess> {
  const actorId = await resolveInternalActor(adminClient, request)
  const { data: caseRecord, error: caseError } = await adminClient
    .from('cases')
    .select('id, status')
    .eq('case_code', input.caseCode)
    .maybeSingle()

  if (caseError) {
    throw new ApiError('INTERNAL_ERROR', 'No se pudo consultar el caso.', 500)
  }

  if (!caseRecord) {
    throw new ApiError('NOT_FOUND', 'Caso inexistente o inaccesible.', 404)
  }

  if (input.allowedStatuses && !input.allowedStatuses.includes(caseRecord.status)) {
    throw new ApiError('VALIDATION_ERROR', 'El caso no está en un estado válido para esta operación.', 400, {
      estado_actual: caseRecord.status,
      estados_permitidos: input.allowedStatuses
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

  if (!input.caseToken) {
    throw new ApiError('UNAUTHORIZED', 'Falta token temporal válido.', 401)
  }

  const tokenHash = await hashCaseToken(input.caseToken)
  const { data: tokenRecord, error: tokenError } = await adminClient
    .from('case_access_tokens')
    .select('id, expires_at, revoked_at')
    .eq('case_id', caseRecord.id)
    .eq('token_hash', tokenHash)
    .eq('purpose', 'case_result_access')
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function assertNoExtraKeys(value: Record<string, unknown>, allowedKeys: string[], fieldName: string): void {
  const extras = Object.keys(value).filter((key) => !allowedKeys.includes(key))

  if (extras.length > 0) {
    throw new ApiError('VALIDATION_ERROR', `El objeto ${fieldName} contiene campos no permitidos.`, 400, {
      campos_no_permitidos: extras
    })
  }
}

export function parseCaseTokenPayload(body: unknown, allowedKeys: string[]): {
  case_code: string
  case_token?: string | null
} {
  if (!isRecord(body)) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo enviado no es válido.', 400)
  }

  assertNoExtraKeys(body, allowedKeys, 'principal')

  if (typeof body.case_code !== 'string' || body.case_code.length < 1 || body.case_code.length > 80) {
    throw new ApiError('VALIDATION_ERROR', 'El código de caso no es válido.', 400)
  }

  if (body.case_token !== undefined && body.case_token !== null && typeof body.case_token !== 'string') {
    throw new ApiError('VALIDATION_ERROR', 'El token temporal no es válido.', 400)
  }

  return {
    case_code: body.case_code,
    case_token: body.case_token ?? null
  }
}
