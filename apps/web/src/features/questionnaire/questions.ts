import type { QuestionnaireBooleanField } from "./types"

export type QuestionnaireQuestion = {
  field: QuestionnaireBooleanField
  label: string
  help?: string
}

export const questionnaireQuestions: QuestionnaireQuestion[] = [
  { field: "pain", label: "Dolor persistente" },
  { field: "bleeding", label: "Sangrado sin causa clara" },
  { field: "growth", label: "Aumento de volumen o crecimiento" },
  { field: "white_patch", label: "Placa blanca" },
  { field: "red_patch", label: "Placa roja" },
  { field: "non_healing_ulcer", label: "Ulcera que no cicatriza" },
  { field: "lump_or_induration", label: "Bulto o zona endurecida" },
  { field: "dysphagia", label: "Dificultad al tragar" },
  { field: "tobacco_use", label: "Consumo de tabaco" },
  { field: "alcohol_use", label: "Consumo frecuente de alcohol" },
  { field: "coca_chewing", label: "Acullico o masticado de coca" },
  { field: "coca_machucada", label: "Uso de coca machucada" },
  { field: "bicarbonate_or_additives", label: "Uso de bicarbonato u otros aditivos" },
  { field: "dental_prosthesis", label: "Uso de protesis dental" },
  { field: "constant_friction", label: "Rozamiento o trauma constante" },
]
