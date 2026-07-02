import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MEDICAL_DISCLAIMER } from "@/config/constants"

export function MedicalDisclaimer({ text }: { text?: string }) {
  return (
    <Alert>
      <AlertTitle>Aviso preventivo</AlertTitle>
      <AlertDescription>{text || MEDICAL_DISCLAIMER}</AlertDescription>
    </Alert>
  )
}
