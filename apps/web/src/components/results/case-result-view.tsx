"use client"

import { useQuery } from "@tanstack/react-query"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getCaseResult } from "@/features/cases/api"
import { getCaseSession } from "@/features/cases/store"
import type { AppError } from "@/lib/http/errors"

import { AssetViewer } from "./asset-viewer"
import { MedicalDisclaimer } from "./disclaimer"
import { ReportActions } from "./report-actions"
import { RiskSummary } from "./risk-summary"

type CaseResultViewProps = {
  caseCode: string
}

export function CaseResultView({ caseCode }: CaseResultViewProps) {
  const router = useRouter()
  const [session] = useState(() => getCaseSession())
  const query = useQuery({
    queryKey: ["case-result", caseCode],
    queryFn: () => {
      if (!session?.caseCode || !session.caseToken || session.caseCode !== caseCode) {
        throw new Error("No se encontro la sesion anonima del caso.")
      }

      return getCaseResult({
        case_code: session.caseCode,
        case_token: session.caseToken,
      })
    },
    retry: 1,
  })

  useEffect(() => {
    if (!session?.caseCode || session.caseCode !== caseCode) {
      router.replace("/casos/nuevo/consentimiento")
    }
  }, [caseCode, router, session])

  const error = query.error as AppError | Error | null

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Cargando resultado preventivo...</CardContent>
      </Card>
    )
  }

  if (error || !query.data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>No se pudo cargar el resultado</AlertTitle>
        <AlertDescription className="grid gap-3">
          <span>
            {error?.message ?? "Resultado no disponible."}
            {error && "requestId" in error && error.requestId ? ` Solicitud: ${error.requestId}` : ""}
          </span>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="grid gap-4">
      <RiskSummary result={query.data} />
      <AssetViewer
        originalUrl={query.data.assets.original_image_url}
        gradcamUrl={query.data.assets.gradcam_image_url}
      />
      <ReportActions initialDownloadUrl={query.data.assets.report_download_url} />
      <MedicalDisclaimer text={query.data.medical_disclaimer} />
    </div>
  )
}
