import { CaseFlowShell } from "@/components/case-flow/case-flow-shell"
import { newCaseSteps } from "@/components/case-flow/flow-steps"
import { ImageUploadFlow } from "@/components/image-upload/image-upload-flow"

export default function ImagePage() {
  return (
    <CaseFlowShell
      title="Imagen"
      description="Captura o selecciona una imagen. Se validara formato, peso y metadata antes de subirla con URL firmada a Storage privado."
      current="image"
      steps={newCaseSteps}
    >
      <ImageUploadFlow />
    </CaseFlowShell>
  )
}
