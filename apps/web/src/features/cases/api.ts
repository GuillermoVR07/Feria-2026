import type { CreateCaseInput } from "./types"
import type { GetCaseResultInput } from "./types"
import { createCaseResponseSchema, getCaseResultResponseSchema } from "./schemas"
import { callEdgeFunction } from "@/lib/supabase/edge-functions"

export async function createCase(input: CreateCaseInput) {
  const result = await callEdgeFunction("create-case", {
    method: "POST",
    body: input,
    responseSchema: createCaseResponseSchema,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}

export async function getCaseResult(input: GetCaseResultInput) {
  const result = await callEdgeFunction("get-case-result", {
    method: "POST",
    body: input,
    responseSchema: getCaseResultResponseSchema,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}
