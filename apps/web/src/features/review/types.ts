import type { z } from "zod";

import type {
  reviewCaseResponseSchema,
  reviewDecisionSchema,
  reviewSuspicionLevelSchema,
} from "./schemas";

export type ReviewDecision = z.infer<typeof reviewDecisionSchema>;
export type ReviewSuspicionLevel = z.infer<typeof reviewSuspicionLevelSchema>;
export type ReviewCaseResult = z.infer<typeof reviewCaseResponseSchema>["data"];
