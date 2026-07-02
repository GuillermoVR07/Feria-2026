import { z } from "zod";

export const dashboardMetricsResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    cases_last_30_days: z.number(),
    total_cases: z.number(),
    pending_review: z.number(),
    by_suspicion_level: z.object({
      low: z.number(),
      moderate: z.number(),
      high: z.number(),
    }),
    image_quality: z.object({
      accepted: z.number(),
      rejected: z.number(),
    }),
    average_ai_latency_ms: z.number().nullable(),
  }),
  message: z.string(),
});
