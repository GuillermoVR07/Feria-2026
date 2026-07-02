import { envClient } from "@/config/env.client"
import { callEdgeFunction } from "@/lib/supabase/edge-functions"

import { runInferenceResponseSchema } from "./schemas"
import type { AiHealthResult, RunInferenceInput } from "./types"

export async function runInference(input: RunInferenceInput) {
  const result = await callEdgeFunction("run-inference", {
    method: "POST",
    body: input,
    responseSchema: runInferenceResponseSchema,
    timeoutMs: 60_000,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}

export async function checkAiHealth(): Promise<AiHealthResult> {
  try {
    const response = await fetch(envClient.NEXT_PUBLIC_AI_HEALTH_URL, {
      method: "GET",
      cache: "no-store",
    })

    return {
      ok: response.ok,
      message: response.ok ? "Servicio IA disponible" : "Servicio IA no disponible",
    }
  } catch {
    return {
      ok: false,
      message: "No se pudo consultar el estado tecnico de IA",
    }
  }
}
