import { z } from "zod";

export const reviewDecisionSchema = z.enum([
  "confirm_ai",
  "correct_ai",
  "needs_clinical_evaluation",
  "insufficient_information",
]);

export const reviewSuspicionLevelSchema = z.enum([
  "invalid_image",
  "low",
  "moderate",
  "high",
]);

export const reviewCaseSchema = z
  .object({
    case_id: z.string().uuid("Ingresa un identificador de caso valido."),
    decision: reviewDecisionSchema,
    corrected_suspicion_level: reviewSuspicionLevelSchema.nullable(),
    clinical_notes: z
      .string()
      .trim()
      .min(1, "Las notas clinicas son obligatorias.")
      .max(5000, "Las notas no deben superar 5000 caracteres."),
    recommended_action: z
      .string()
      .trim()
      .max(2000, "La accion recomendada no debe superar 2000 caracteres.")
      .optional(),
  })
  .superRefine((values, ctx) => {
    if (values.decision === "correct_ai" && !values.corrected_suspicion_level) {
      ctx.addIssue({
        code: "custom",
        path: ["corrected_suspicion_level"],
        message: "El nivel corregido es obligatorio cuando corriges la IA.",
      });
    }
  });

export const reviewCaseResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    review_id: z.string(),
    case_id: z.string(),
    status: z.literal("reviewed"),
    created_at: z.string(),
  }),
  message: z.string(),
});

export type ReviewCaseFormValues = z.infer<typeof reviewCaseSchema>;
