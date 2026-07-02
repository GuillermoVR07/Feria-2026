import { callEdgeFunction } from "@/lib/supabase/edge-functions"

import { generateReportResponseSchema } from "./schemas"
import type { GenerateReportInput } from "./types"

export async function generateReport(input: GenerateReportInput) {
  const result = await callEdgeFunction("generate-report", {
    method: "POST",
    body: input,
    responseSchema: generateReportResponseSchema,
    timeoutMs: 30_000,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}
