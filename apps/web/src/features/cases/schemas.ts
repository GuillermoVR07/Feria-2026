import { z } from "zod"

export const CONSENT_VERSION = "oraldiagnostic-demo-2026-07-02"

export const sexSchema = z.enum(["female", "male", "other", "not_specified"])

export const lesionSiteSchema = z.enum([
  "lip",
  "tongue",
  "gum",
  "palate",
  "floor_of_mouth",
  "cheek_mucosa",
  "other",
  "not_specified",
])

export const consentSchema = z.object({
  accepted: z.literal(true, {
    error: "Debes aceptar el consentimiento para continuar.",
  }),
  consentVersion: z.string().min(1),
})

export const anonymousCaseDataSchema = z.object({
  age_years: z
    .number({ error: "Ingresa una edad valida." })
    .int("La edad debe ser un numero entero.")
    .min(0, "La edad no puede ser negativa.")
    .max(120, "La edad no puede superar 120 anos.")
    .optional(),
  sex: sexSchema,
  city: z.string().max(120, "La ciudad es demasiado larga.").optional(),
  zone: z.string().max(120, "La zona es demasiado larga.").optional(),
  lesion_site: lesionSiteSchema,
  lesion_duration_days: z
    .number({ error: "Ingresa la duracion en dias." })
    .int("La duracion debe ser un numero entero.")
    .min(0, "La duracion no puede ser negativa.")
    .max(3650, "La duracion no puede superar 3650 dias."),
})

export const createCaseResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    case_id: z.string(),
    case_code: z.string(),
    case_token: z.string(),
    status: z.string(),
    next_step: z.literal("questionnaire"),
  }),
  message: z.string(),
})

export const getCaseResultResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    case_code: z.string(),
    status: z.string(),
    lesion_site: lesionSiteSchema,
    lesion_duration_days: z.number(),
    result: z.object({
      suspicion_level: z.enum(["low", "moderate", "high"]).nullable(),
      urgency_level: z.enum(["routine", "priority", "urgent"]).nullable(),
      professional_referral: z.boolean().nullable(),
      message: z.string(),
    }),
    assets: z.object({
      original_image_url: z.string().url().nullable(),
      gradcam_image_url: z.string().url().nullable(),
      report_download_url: z.string().url().nullable(),
    }),
    medical_disclaimer: z.string(),
  }),
  message: z.string(),
})

export type ConsentFormValues = z.infer<typeof consentSchema>
export type AnonymousCaseDataFormValues = z.infer<typeof anonymousCaseDataSchema>
