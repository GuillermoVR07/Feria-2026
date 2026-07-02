import { callEdgeFunction } from "@/lib/supabase/edge-functions";

import { reviewCaseResponseSchema, type ReviewCaseFormValues } from "./schemas";

export async function reviewCase(input: ReviewCaseFormValues, accessToken: string) {
  const result = await callEdgeFunction("review-case", {
    method: "POST",
    bearerToken: accessToken,
    body: {
      case_id: input.case_id,
      decision: input.decision,
      corrected_suspicion_level: input.corrected_suspicion_level,
      clinical_notes: input.clinical_notes.trim(),
      recommended_action: input.recommended_action?.trim() || null,
    },
    responseSchema: reviewCaseResponseSchema,
  });

  if (!result.ok) {
    throw result.error;
  }

  return result.data.data;
}
