import { callEdgeFunction } from "@/lib/supabase/edge-functions"

import { submitQuestionnaireResponseSchema } from "./schemas"
import type { SubmitQuestionnaireInput } from "./types"

export async function submitQuestionnaire(input: SubmitQuestionnaireInput) {
  const result = await callEdgeFunction("submit-questionnaire", {
    method: "POST",
    body: input,
    responseSchema: submitQuestionnaireResponseSchema,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}
