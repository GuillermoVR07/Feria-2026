import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CaseResult } from "@/features/cases/types"
import { cn } from "@/lib/utils"

const suspicionLabels = {
  low: "Baja",
  moderate: "Moderada",
  high: "Alta",
} as const

const urgencyLabels = {
  routine: "Rutina",
  priority: "Prioritaria",
  urgent: "Urgente",
} as const

export function RiskSummary({ result }: { result: CaseResult }) {
  const suspicion = result.result.suspicion_level
  const urgency = result.result.urgency_level
  const isHigh = suspicion === "high" || urgency === "urgent"
  const isPriority = suspicion === "moderate" || urgency === "priority"
  const Icon = isHigh ? AlertTriangle : isPriority ? Clock3 : CheckCircle2

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orientacion preventiva</CardTitle>
        <CardDescription>
          Resultado generado por backend para triaje visual. No es diagnostico medico.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-lg",
              isHigh && "bg-destructive/10 text-destructive",
              isPriority && !isHigh && "bg-accent text-accent-foreground",
              !isPriority && !isHigh && "bg-primary/10 text-primary"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap gap-2">
              <Badge variant={isHigh ? "destructive" : "secondary"}>
                Sospecha visual: {suspicion ? suspicionLabels[suspicion] : "No disponible"}
              </Badge>
              <Badge variant="outline">
                Urgencia: {urgency ? urgencyLabels[urgency] : "No disponible"}
              </Badge>
              <Badge variant={result.result.professional_referral ? "secondary" : "outline"}>
                {result.result.professional_referral ? "Requiere revision profesional" : "Seguimiento preventivo"}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{result.result.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
