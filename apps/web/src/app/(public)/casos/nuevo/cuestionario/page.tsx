import { CaseFlowShell } from "@/components/case-flow/case-flow-shell"
import { newCaseSteps } from "@/components/case-flow/flow-steps"
import { QuestionnaireForm } from "@/components/case-flow/questionnaire-form"

export default function QuestionnairePage() {
  return (
    <CaseFlowShell
      title="Cuestionario"
      description="Completa los factores de riesgo y sintomas observados. La informacion se asociara solo al caso anonimo."
      current="questionnaire"
      steps={newCaseSteps}
    >
      <QuestionnaireForm />
    </CaseFlowShell>
  )
}
