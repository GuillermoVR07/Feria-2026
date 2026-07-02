import { z } from "zod"

import { envClient, hasConfiguredSupabasePublishableKey } from "@/config/env.client"
import { AppError, toAppError } from "@/lib/http/errors"
import { err, ok, type Result } from "@/lib/http/result"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type CallEdgeFunctionOptions<TBody, TResponse> = {
  method?: HttpMethod
  body?: TBody
  responseSchema?: z.ZodType<TResponse>
  timeoutMs?: number
  headers?: HeadersInit
  bearerToken?: string
}

const errorPayloadSchema = z.object({
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().optional(),
      request_id: z.string().optional(),
    })
    .optional(),
  code: z.string().optional(),
  message: z.string().optional(),
  request_id: z.string().optional(),
})

export async function callEdgeFunction<TResponse, TBody = unknown>(
  functionName: string,
  options: CallEdgeFunctionOptions<TBody, TResponse> = {}
): Promise<Result<TResponse, AppError>> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000)
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")

  if (hasConfiguredSupabasePublishableKey()) {
    headers.set("apikey", envClient.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  }

  if (options.bearerToken) {
    headers.set("Authorization", `Bearer ${options.bearerToken}`)
  }

  try {
    const response = await fetch(`${envClient.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/${functionName}`, {
      method: options.method ?? "POST",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: "no-store",
    })

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
      const parsed = errorPayloadSchema.safeParse(payload)
      const details = parsed.success ? parsed.data : undefined
      const message =
        details?.error?.message ?? details?.message ?? `La funcion ${functionName} respondio con error.`
      const code = details?.error?.code ?? details?.code ?? "INTERNAL_ERROR"
      const requestId = details?.error?.request_id ?? details?.request_id

      return err(new AppError(message, code as AppError["code"], response.status, requestId))
    }

    if (!options.responseSchema) {
      return ok(payload as TResponse)
    }

    const parsed = options.responseSchema.safeParse(payload)

    if (!parsed.success) {
      return err(new AppError("La respuesta del backend no tiene el formato esperado.", "VALIDATION_ERROR"))
    }

    return ok(parsed.data)
  } catch (error) {
    return err(toAppError(error))
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export const healthCheckResponseSchema = z.record(z.string(), z.unknown())

export function checkBackendHealth() {
  return callEdgeFunction("health-check", {
    method: "GET",
    responseSchema: healthCheckResponseSchema,
    timeoutMs: 10_000,
  })
}
