import { z } from "zod"

export const questionnaireSchema = z.object({
  pain: z.boolean(),
  bleeding: z.boolean(),
  growth: z.boolean(),
  white_patch: z.boolean(),
  red_patch: z.boolean(),
  non_healing_ulcer: z.boolean(),
  lump_or_induration: z.boolean(),
  dysphagia: z.boolean(),
  tobacco_use: z.boolean(),
  alcohol_use: z.boolean(),
  coca_chewing: z.boolean(),
  coca_machucada: z.boolean(),
  bicarbonate_or_additives: z.boolean(),
  dental_prosthesis: z.boolean(),
  constant_friction: z.boolean(),
  notes: z.string().max(1000, "Las notas no pueden superar 1000 caracteres.").optional(),
})

export const submitQuestionnaireResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    case_id: z.string(),
    status: z.literal("questionnaire_completed"),
    risk_score: z.number(),
    next_step: z.literal("image_upload"),
  }),
  message: z.string(),
})

export type QuestionnaireFormValues = z.infer<typeof questionnaireSchema>
