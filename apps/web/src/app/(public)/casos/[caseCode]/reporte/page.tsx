import { CaseFlowShell } from "@/components/case-flow/case-flow-shell"
import { resultSteps } from "@/components/case-flow/flow-steps"
import { ReportPageContent } from "@/components/results/report-page-content"

type ReportPageProps = {
  params: Promise<{ caseCode: string }>
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { caseCode } = await params

  return (
    <CaseFlowShell
      title="Reporte PDF"
      description="Genera o descarga el PDF real desde Supabase usando URL firmada temporal."
      current="report"
      steps={resultSteps}
      caseCode={caseCode}
    >
      <ReportPageContent caseCode={caseCode} />
    </CaseFlowShell>
  )
}
