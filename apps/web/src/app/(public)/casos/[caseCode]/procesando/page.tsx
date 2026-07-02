import { CaseFlowShell } from "@/components/case-flow/case-flow-shell"
import { resultSteps } from "@/components/case-flow/flow-steps"
import { ProcessingFlow } from "@/components/results/processing-flow"

type ProcessingPageProps = {
  params: Promise<{ caseCode: string }>
}

export default async function ProcessingPage({ params }: ProcessingPageProps) {
  const { caseCode } = await params

  return (
    <CaseFlowShell
      title="Procesando"
      description="Ejecuta la inferencia mediante Supabase Edge Function, genera el reporte y prepara el resultado preventivo."
      current="processing"
      steps={resultSteps}
      caseCode={caseCode}
    >
      <ProcessingFlow caseCode={caseCode} />
    </CaseFlowShell>
  )
}
