export type SuspicionLevel = "low" | "moderate" | "high"
export type UrgencyLevel = "routine" | "priority" | "urgent"

export type RunInferenceInput = {
  case_code: string
  case_token: string
  image_id: string
}

export type RunInferenceResult = {
  case_id: string
  image_id: string
  inference_id: string
  model: {
    name: string
    version: string
    architecture: string
  }
  prediction: {
    suspicion_level: SuspicionLevel
    probability: number
    class_probabilities: Record<string, number>
  }
  recommendation: {
    suspicion_level: SuspicionLevel
    urgency_level: UrgencyLevel
    professional_referral: boolean
    reason_codes: string[]
    message: string
  }
  next_step: "generate_report"
}

export type AiHealthResult = {
  ok: boolean
  message: string
}
