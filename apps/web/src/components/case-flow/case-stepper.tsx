import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

import type { FlowStep, FlowStepId } from "./flow-steps"

type CaseStepperProps = {
  steps: FlowStep[]
  current: FlowStepId
  caseCode?: string
}

export function CaseStepper({ steps, current, caseCode }: CaseStepperProps) {
  const currentIndex = steps.findIndex((step) => step.id === current)

  return (
    <nav aria-label="Progreso del caso" className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Flujo guiado</p>
        {caseCode ? (
          <Badge variant="secondary" className="font-mono">
            {caseCode}
          </Badge>
        ) : null}
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon
          const isCurrent = step.id === current
          const isDone = index < currentIndex
          const content = (
            <span
              className={cn(
                "flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                isCurrent && "border-primary bg-primary text-primary-foreground",
                isDone && "border-primary/30 bg-primary/10 text-foreground",
                !isCurrent && !isDone && "bg-card text-muted-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", step.id === "processing" && isCurrent && "animate-spin")} />
              <span className="truncate">{step.title}</span>
            </span>
          )

          if (step.href === "#") {
            return <li key={step.id}>{content}</li>
          }

          return (
            <li key={step.id}>
              <Link href={step.href}>{content}</Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
