import { z } from "zod"

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
export const MIN_IMAGE_WIDTH_PX = 640
export const MIN_IMAGE_HEIGHT_PX = 480
export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

export const selectedImageSchema = z.object({
  mime_type: z.enum(ALLOWED_IMAGE_MIME_TYPES, {
    error: "Formato no permitido. Usa JPG, PNG o WebP.",
  }),
  size_bytes: z
    .number()
    .int()
    .min(1, "La imagen esta vacia.")
    .max(MAX_IMAGE_SIZE_BYTES, "La imagen supera 10 MB."),
  width_px: z.number().int().min(1),
  height_px: z.number().int().min(1),
})

export const requestImageUploadResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    image_id: z.string(),
    bucket_name: z.string(),
    object_path: z.string(),
    upload_url: z.string().url(),
    expires_in_seconds: z.number(),
    next_step: z.literal("finalize_image_upload"),
  }),
  message: z.string(),
})

export const finalizeImageUploadResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    image_id: z.string(),
    status: z.literal("image_uploaded"),
    next_step: z.literal("validate_image"),
  }),
  message: z.string(),
})

export const validateImageResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.discriminatedUnion("quality_status", [
    z.object({
      image_id: z.string(),
      quality_status: z.literal("accepted"),
      scores: z.object({
        sharpness_score: z.number(),
        brightness_score: z.number(),
        contrast_score: z.number(),
      }),
      next_step: z.literal("run_inference"),
    }),
    z.object({
      image_id: z.string(),
      quality_status: z.literal("rejected"),
      rejection_reasons: z.array(z.string()),
      message: z.string(),
      next_step: z.literal("repeat_capture"),
    }),
  ]),
  message: z.string(),
})
