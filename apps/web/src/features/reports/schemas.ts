import { z } from "zod"

export const generateReportResponseSchema = z.object({
  success: z.literal(true),
  request_id: z.string(),
  data: z.object({
    report_id: z.string(),
    case_code: z.string(),
    download_url: z.string().url(),
    expires_in_seconds: z.number(),
  }),
  message: z.string(),
})
