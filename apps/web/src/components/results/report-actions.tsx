"use client"

import { useMutation } from "@tanstack/react-query"
import { Download, RefreshCw } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { useState } from "react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getCaseSession, updateCaseSession } from "@/features/cases/store"
import { generateReport } from "@/features/reports/api"
import type { AppError } from "@/lib/http/errors"

type ReportActionsProps = {
  initialDownloadUrl?: string | null
}

export function ReportActions({ initialDownloadUrl }: ReportActionsProps) {
  const [downloadUrl, setDownloadUrl] = useState(initialDownloadUrl ?? null)
  const mutation = useMutation({
    mutationFn: async () => {
      const session = getCaseSession()

      if (!session?.caseCode || !session.caseToken) {
        throw new Error("No se encontro la sesion anonima del caso.")
      }

      return generateReport({
        case_code: session.caseCode,
        case_token: session.caseToken,
      })
    },
    onSuccess: (report) => {
      setDownloadUrl(report.download_url)
      updateCaseSession({ reportId: report.report_id, status: "reported" })
    },
  })

  const error = mutation.error as AppError | Error | null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte PDF</CardTitle>
        <CardDescription>El PDF se genera en backend y se descarga con URL firmada temporal.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudo generar el reporte</AlertTitle>
            <AlertDescription>
              {error.message}
              {"requestId" in error && error.requestId ? ` Solicitud: ${error.requestId}` : ""}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {downloadUrl ? "Regenerar URL" : "Generar reporte"}
          </Button>
          {downloadUrl ? (
            <a href={downloadUrl} target="_blank" rel="noreferrer" className={buttonVariants()}>
              <Download className="size-4" aria-hidden="true" />
              Descargar PDF
            </a>
          ) : (
            <Button type="button" disabled>
              <Download className="size-4" aria-hidden="true" />
              Descargar PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
