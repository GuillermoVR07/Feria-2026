import type { LucideIcon } from "lucide-react"
import { Camera, ClipboardList, FileText, HeartHandshake, ImageIcon, Loader2 } from "lucide-react"

export type FlowStepId =
  | "consent"
  | "data"
  | "questionnaire"
  | "image"
  | "processing"
  | "result"
  | "report"

export type FlowStep = {
  id: FlowStepId
  title: string
  href: string
  icon: LucideIcon
}

export const newCaseSteps: FlowStep[] = [
  { id: "consent", title: "Consentimiento", href: "/casos/nuevo/consentimiento", icon: HeartHandshake },
  { id: "data", title: "Datos", href: "/casos/nuevo/datos", icon: FileText },
  { id: "questionnaire", title: "Cuestionario", href: "/casos/nuevo/cuestionario", icon: ClipboardList },
  { id: "image", title: "Imagen", href: "/casos/nuevo/imagen", icon: Camera },
]

export const resultSteps: FlowStep[] = [
  { id: "processing", title: "Procesando", href: "#", icon: Loader2 },
  { id: "result", title: "Resultado", href: "#", icon: ImageIcon },
  { id: "report", title: "Reporte", href: "#", icon: FileText },
]
