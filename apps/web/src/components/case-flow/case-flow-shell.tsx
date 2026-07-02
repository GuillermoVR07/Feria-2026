import Link from "next/link"
import { Stethoscope } from "lucide-react"
import type { ReactNode } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { MEDICAL_DISCLAIMER } from "@/config/constants"

import { CaseStepper } from "./case-stepper"
import type { FlowStep, FlowStepId } from "./flow-steps"

type CaseFlowShellProps = {
  title: string
  description: string
  current: FlowStepId
  steps: FlowStep[]
  children: ReactNode
  caseCode?: string
}

export function CaseFlowShell({
  title,
  description,
  current,
  steps,
  children,
  caseCode,
}: CaseFlowShellProps) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-medium">OralDiagnostic</span>
              <span className="block text-xs text-muted-foreground">MVP demo</span>
            </span>
          </Link>
          <Badge variant="outline">Caso anonimo</Badge>
        </header>

        <CaseStepper steps={steps} current={current} caseCode={caseCode} />

        <section className="grid gap-2">
          <h1 className="text-3xl font-semibold tracking-normal text-balance">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
        </section>

        {children}

        <Alert>
          <AlertDescription>{MEDICAL_DISCLAIMER}</AlertDescription>
        </Alert>
      </section>
    </main>
  )
}
