import { ApiError } from './errors.ts'

// Helpers de autenticación para Edge Functions que requieren usuario interno.

export function getBearerToken(request: Request): string {
  const authorization = request.headers.get('authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)

  if (!match?.[1]) {
    throw new ApiError('UNAUTHORIZED', 'Falta sesión o token válido.', 401)
  }

  return match[1]
}

export async function getAuthenticatedUser(adminClient: ReturnType<typeof import('./supabase-admin.ts').createSupabaseAdminClient>, request: Request) {
  const token = getBearerToken(request)
  const { data, error } = await adminClient.auth.getUser(token)

  if (error || !data.user) {
    throw new ApiError('UNAUTHORIZED', 'Falta sesión o token válido.', 401)
  }

  return data.user
}
