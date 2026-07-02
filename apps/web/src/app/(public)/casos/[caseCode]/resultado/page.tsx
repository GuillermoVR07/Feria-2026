import { CaseFlowShell } from "@/components/case-flow/case-flow-shell"
import { resultSteps } from "@/components/case-flow/flow-steps"
import { CaseResultView } from "@/components/results/case-result-view"

type ResultPageProps = {
  params: Promise<{ caseCode: string }>
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { caseCode } = await params

  return (
    <CaseFlowShell
      title="Resultado preventivo"
      description="Consulta el resultado preventivo desde backend, muestra assets firmados y mantiene visible el disclaimer."
      current="result"
      steps={resultSteps}
      caseCode={caseCode}
    >
      <CaseResultView caseCode={caseCode} />
    </CaseFlowShell>
  )
}
