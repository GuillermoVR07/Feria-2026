export type Sex = "female" | "male" | "other" | "not_specified"

export type LesionSite =
  | "lip"
  | "tongue"
  | "gum"
  | "palate"
  | "floor_of_mouth"
  | "cheek_mucosa"
  | "other"
  | "not_specified"

export type CaseSession = {
  caseId: string
  caseCode: string
  caseToken: string
  status: string
  imageId?: string
  inferenceId?: string
  reportId?: string
}

export type ConsentDraft = {
  accepted: true
  consentVersion: string
}

export type CreateCaseInput = {
  consent: {
    accepted: true
    consent_version: string
  }
  demographics: {
    age_years?: number | null
    sex: Sex
    city?: string | null
    zone?: string | null
  }
  case: {
    lesion_site: LesionSite
    lesion_duration_days: number
  }
}

export type CreateCaseResult = {
  case_id: string
  case_code: string
  case_token: string
  status: string
  next_step: "questionnaire"
}

export type GetCaseResultInput = {
  case_code: string
  case_token: string
}

export type CaseResult = {
  case_code: string
  status: string
  lesion_site: LesionSite
  lesion_duration_days: number
  result: {
    suspicion_level: "low" | "moderate" | "high" | null
    urgency_level: "routine" | "priority" | "urgent" | null
    professional_referral: boolean | null
    message: string
  }
  assets: {
    original_image_url: string | null
    gradcam_image_url: string | null
    report_download_url: string | null
  }
  medical_disclaimer: string
}
