import { ApiError } from './errors.ts'
import { corsHeaders } from './cors.ts'

// Respuestas estándar para Edge Functions.

export function successResponse(
  request: Request,
  requestId: string,
  data: unknown,
  message = 'Operación completada correctamente.',
  status = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      request_id: requestId,
      data,
      message
    }),
    {
      status,
      headers: {
        ...corsHeaders(request),
        'Content-Type': 'application/json'
      }
    }
  )
}

export function errorResponse(request: Request, requestId: string, error: ApiError): Response {
  return new Response(
    JSON.stringify({
      success: false,
      request_id: requestId,
      error: {
        code: error.code,
        message: error.message,
        details: error.details ?? {}
      }
    }),
    {
      status: error.status,
      headers: {
        ...corsHeaders(request),
        'Content-Type': 'application/json'
      }
    }
  )
}
