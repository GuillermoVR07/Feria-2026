import { AnonymousCaseForm } from "@/components/case-flow/anonymous-case-form"
import { CaseFlowShell } from "@/components/case-flow/case-flow-shell"
import { newCaseSteps } from "@/components/case-flow/flow-steps"

export default function AnonymousDataPage() {
  return (
    <CaseFlowShell
      title="Datos anonimos"
      description="Registra informacion minima para crear el caso. No se solicitan datos de identificacion personal."
      current="data"
      steps={newCaseSteps}
    >
      <AnonymousCaseForm />
    </CaseFlowShell>
  )
}
