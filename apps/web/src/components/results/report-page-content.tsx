"use client"

import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { getCaseResult } from "@/features/cases/api"
import { getCaseSession } from "@/features/cases/store"

import { MedicalDisclaimer } from "./disclaimer"
import { ReportActions } from "./report-actions"

export function ReportPageContent({ caseCode }: { caseCode: string }) {
  const router = useRouter()
  const [session] = useState(() => getCaseSession())
  const query = useQuery({
    queryKey: ["case-report", caseCode],
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

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">Buscando reporte disponible...</CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <ReportActions initialDownloadUrl={query.data?.assets.report_download_url ?? null} />
      <MedicalDisclaimer text={query.data?.medical_disclaimer} />
    </div>
  )
}
