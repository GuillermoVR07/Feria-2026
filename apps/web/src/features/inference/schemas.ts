import { z } from "zod"

export const suspicionLevelSchema = z.enum(["low", "moderate", "high"])
export const urgencyLevelSchema = z.enum(["routine", "priority", "urgent"])

export const runInferenceResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    case_id: z.string(),
    image_id: z.string(),
    inference_id: z.string(),
    model: z.object({
      name: z.string(),
      version: z.string(),
      architecture: z.string(),
    }),
    prediction: z.object({
      suspicion_level: suspicionLevelSchema,
      probability: z.number(),
      class_probabilities: z.record(z.string(), z.number()),
    }),
    recommendation: z.object({
      suspicion_level: suspicionLevelSchema,
      urgency_level: urgencyLevelSchema,
      professional_referral: z.boolean(),
      reason_codes: z.array(z.string()).default([]),
      message: z.string(),
    }),
    next_step: z.literal("generate_report"),
  }),
  message: z.string(),
})
