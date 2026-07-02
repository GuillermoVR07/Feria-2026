import { CaseFlowShell } from "@/components/case-flow/case-flow-shell"
import { ConsentForm } from "@/components/case-flow/consent-form"
import { newCaseSteps } from "@/components/case-flow/flow-steps"

export default function ConsentPage() {
  return (
    <CaseFlowShell
      title="Consentimiento"
      description="Antes de crear el caso anonimo, confirma que entiendes el alcance preventivo de esta demo."
      current="consent"
      steps={newCaseSteps}
    >
      <ConsentForm />
    </CaseFlowShell>
  )
}
