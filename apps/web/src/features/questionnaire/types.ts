export type QuestionnaireBooleanField =
  | "pain"
  | "bleeding"
  | "growth"
  | "white_patch"
  | "red_patch"
  | "non_healing_ulcer"
  | "lump_or_induration"
  | "dysphagia"
  | "tobacco_use"
  | "alcohol_use"
  | "coca_chewing"
  | "coca_machucada"
  | "bicarbonate_or_additives"
  | "dental_prosthesis"
  | "constant_friction"

export type SubmitQuestionnaireInput = {
  case_code: string
  case_token: string
  questionnaire: Record<QuestionnaireBooleanField, boolean> & {
    notes?: string | null
  }
}

export type SubmitQuestionnaireResult = {
  case_id: string
  status: "questionnaire_completed"
  risk_score: number
  next_step: "image_upload"
}
