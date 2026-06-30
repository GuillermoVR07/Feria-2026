// Utilidades CORS para Edge Functions.
// ALLOWED_ORIGINS admite orígenes separados por coma. Usar "*" solo en local.

const DEFAULT_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
const DEFAULT_ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type'

export function getAllowedOrigin(request: Request): string {
  const origin = request.headers.get('origin') ?? ''
  const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (allowedOrigins.includes('*')) {
    return '*'
  }

  if (origin && allowedOrigins.includes(origin)) {
    return origin
  }

  return allowedOrigins[0] ?? (origin || '*')
}

export function corsHeaders(request: Request): HeadersInit {
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(request),
    'Access-Control-Allow-Methods': DEFAULT_ALLOWED_METHODS,
    'Access-Control-Allow-Headers': DEFAULT_ALLOWED_HEADERS,
    'Vary': 'Origin'
  }
}

export function optionsResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request)
  })
}
