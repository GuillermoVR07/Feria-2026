export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "CONSENT_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CASE_NOT_FOUND"
  | "IMAGE_NOT_FOUND"
  | "IMAGE_QUALITY_REJECTED"
  | "AI_SERVICE_UNAVAILABLE"
  | "REPORT_GENERATION_FAILED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT"

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode = "INTERNAL_ERROR",
    public readonly status?: number,
    public readonly requestId?: string
  ) {
    super(message)
    this.name = "AppError"
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new AppError("La solicitud tardo demasiado. Intenta nuevamente.", "TIMEOUT")
  }

  if (error instanceof Error) {
    return new AppError(error.message, "NETWORK_ERROR")
  }

  return new AppError("Ocurrio un error inesperado.", "INTERNAL_ERROR")
}
