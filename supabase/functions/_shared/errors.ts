// Errores normalizados para Edge Functions de OralDiagnostic.
// Mantener mensajes preventivos, sin lenguaje diagnóstico médico definitivo.

export type ApiErrorCode =
  | 'METHOD_NOT_ALLOWED'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CASE_TOKEN_INVALID'
  | 'CASE_TOKEN_EXPIRED'
  | 'IMAGE_NOT_FOUND'
  | 'IMAGE_QUALITY_REJECTED'
  | 'AI_SERVICE_UNAVAILABLE'
  | 'AI_INFERENCE_FAILED'
  | 'REPORT_GENERATION_FAILED'
  | 'INTERNAL_ERROR'

export const DEFAULT_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  METHOD_NOT_ALLOWED: 'Método HTTP no permitido.',
  VALIDATION_ERROR: 'Los datos enviados no son válidos.',
  UNAUTHORIZED: 'Falta sesión o token válido.',
  FORBIDDEN: 'El usuario no tiene permiso.',
  NOT_FOUND: 'Recurso inexistente o inaccesible.',
  CASE_TOKEN_INVALID: 'Token temporal inválido.',
  CASE_TOKEN_EXPIRED: 'Token temporal expirado.',
  IMAGE_NOT_FOUND: 'Imagen no encontrada.',
  IMAGE_QUALITY_REJECTED: 'Imagen rechazada por calidad técnica.',
  AI_SERVICE_UNAVAILABLE: 'Servicio IA no disponible.',
  AI_INFERENCE_FAILED: 'Fallo en inferencia de apoyo al triaje.',
  REPORT_GENERATION_FAILED: 'Fallo generando PDF de orientación preventiva.',
  INTERNAL_ERROR: 'Error interno no controlado.'
}

export class ApiError extends Error {
  code: ApiErrorCode
  status: number
  details?: unknown

  constructor(code: ApiErrorCode, message = DEFAULT_ERROR_MESSAGES[code], status = 500, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

export function normalizeUnknownError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error
  }

  return new ApiError('INTERNAL_ERROR')
}
