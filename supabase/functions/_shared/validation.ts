import { ApiError } from './errors.ts'

// Validaciones comunes para solicitudes de Edge Functions.

export async function parseJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError('VALIDATION_ERROR', 'El cuerpo debe enviarse como JSON.', 400)
  }

  try {
    return await request.json()
  } catch (_error) {
    throw new ApiError('VALIDATION_ERROR', 'El JSON enviado no es válido.', 400)
  }
}

export function assertMethod(request: Request, allowedMethods: string[]): void {
  if (!allowedMethods.includes(request.method)) {
    throw new ApiError('METHOD_NOT_ALLOWED', 'Método HTTP no permitido.', 405, {
      metodos_permitidos: allowedMethods
    })
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
