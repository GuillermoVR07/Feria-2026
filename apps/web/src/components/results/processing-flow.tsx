"use client"

import Link from "next/link"
import { useMutation, useQuery } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Loader2, Server } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getCaseSession, updateCaseSession } from "@/features/cases/store"
import { checkAiHealth, runInference } from "@/features/inference/api"
import { generateReport } from "@/features/reports/api"
import type { AppError } from "@/lib/http/errors"

type ProcessingFlowProps = {
  caseCode: string
}

type ProcessStep = "idle" | "checking" | "running" | "reporting" | "done" | "failed"

const stepProgress: Record<ProcessStep, number> = {
  idle: 5,
  checking: 18,
  running: 58,
  reporting: 86,
  done: 100,
  failed: 100,
}

export function ProcessingFlow({ caseCode }: ProcessingFlowProps) {
  const router = useRouter()
  const [session] = useState(() => getCaseSession())
  const [step, setStep] = useState<ProcessStep>("idle")
  const healthQuery = useQuery({
    queryKey: ["ai-health"],
    queryFn: checkAiHealth,
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!session?.caseCode || !session.caseToken || !session.imageId) {
        throw new Error("Falta informacion del caso o de la imagen validada.")
      }

      setStep("checking")
      await checkAiHealth()

      setStep("running")
      const inference = await runInference({
        case_code: session.caseCode,
        case_token: session.caseToken,
        image_id: session.imageId,
      })

      updateCaseSession({
        inferenceId: inference.inference_id,
        status: inference.recommendation.urgency_level === "routine" ? "recommendation_ready" : "under_review",
      })

      setStep("reporting")
      const report = await generateReport({
        case_code: session.caseCode,
        case_token: session.caseToken,
      })

      updateCaseSession({
        reportId: report.report_id,
        status: "reported",
      })

      return { inference, report }
    },
    onSuccess: () => {
      setStep("done")
      router.push(`/casos/${caseCode}/resultado`)
    },
    onError: () => {
      setStep("failed")
    },
  })

  useEffect(() => {
    if (!session?.caseCode || !session.caseToken || !session.imageId || session.caseCode !== caseCode) {
      router.replace("/casos/nuevo/consentimiento")
      return
    }

    if (mutation.status === "idle") {
      mutation.mutate()
    }
  }, [caseCode, mutation, router, session])

  const error = mutation.error as AppError | Error | null

  if (!session?.caseCode || session.caseCode !== caseCode) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Recuperando caso anonimo...</CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Procesamiento del caso</CardTitle>
          <CardDescription>
            La inferencia se ejecuta mediante Supabase Edge Functions. Hugging Face puede tardar al despertar.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-2 text-sm">
            {step === "failed" ? (
              <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
            ) : step === "done" ? (
              <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
            ) : (
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
            )}
            <span>
              {step === "checking" && "Verificando estado tecnico del servicio IA..."}
              {step === "running" && "Ejecutando inferencia desde Supabase..."}
              {step === "reporting" && "Generando reporte PDF firmado..."}
              {step === "done" && "Resultado listo."}
              {step === "failed" && "No se pudo completar el procesamiento."}
              {step === "idle" && "Preparando procesamiento..."}
            </span>
          </div>
          <Progress value={stepProgress[step]} aria-label="Progreso de procesamiento" />

          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <Server className="size-4" aria-hidden="true" />
            <span>{healthQuery.data?.message ?? "Consultando estado tecnico de IA..."}</span>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error de procesamiento</AlertTitle>
          <AlertDescription>
            {error.message}
            {"requestId" in error && error.requestId ? ` Solicitud: ${error.requestId}` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      {step === "failed" ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className={buttonVariants()} type="button" onClick={() => mutation.mutate()}>
            Reintentar
          </button>
          <Link href={`/casos/${caseCode}/resultado`} className={buttonVariants({ variant: "outline" })}>
            Ver estado del resultado
          </Link>
        </div>
      ) : null}
    </div>
  )
}
