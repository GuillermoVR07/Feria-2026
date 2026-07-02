"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { anonymousCaseDataSchema, type AnonymousCaseDataFormValues } from "@/features/cases/schemas"
import { createCase } from "@/features/cases/api"
import { clearConsentDraft, getConsentDraft, saveCaseSession } from "@/features/cases/store"
import type { AppError } from "@/lib/http/errors"

const lesionSiteOptions = [
  ["not_specified", "No especificado"],
  ["lip", "Labio"],
  ["tongue", "Lengua"],
  ["gum", "Encia"],
  ["palate", "Paladar"],
  ["floor_of_mouth", "Piso de boca"],
  ["cheek_mucosa", "Mejilla o mucosa bucal"],
  ["other", "Otra zona"],
] as const

const sexOptions = [
  ["not_specified", "Prefiero no indicar"],
  ["female", "Femenino"],
  ["male", "Masculino"],
  ["other", "Otro"],
] as const

export function AnonymousCaseForm() {
  const router = useRouter()
  const [hasConsent] = useState(() => getConsentDraft()?.accepted === true)
  const form = useForm<AnonymousCaseDataFormValues>({
    resolver: zodResolver(anonymousCaseDataSchema),
    defaultValues: {
      sex: "not_specified",
      lesion_site: "not_specified",
      lesion_duration_days: 0,
      city: "",
      zone: "",
    },
  })

  const mutation = useMutation({
    mutationFn: createCase,
    onSuccess: (data) => {
      saveCaseSession({
        caseId: data.case_id,
        caseCode: data.case_code,
        caseToken: data.case_token,
        status: data.status,
      })
      clearConsentDraft()
      router.push("/casos/nuevo/cuestionario")
    },
  })

  useEffect(() => {
    if (!hasConsent) {
      router.replace("/casos/nuevo/consentimiento")
    }
  }, [hasConsent, router])

  function onSubmit(values: AnonymousCaseDataFormValues) {
    const consent = getConsentDraft()

    if (!consent?.accepted) {
      router.replace("/casos/nuevo/consentimiento")
      return
    }

    mutation.mutate({
      consent: {
        accepted: true,
        consent_version: consent.consentVersion,
      },
      demographics: {
        age_years: values.age_years ?? null,
        sex: values.sex,
        city: values.city?.trim() || null,
        zone: values.zone?.trim() || null,
      },
      case: {
        lesion_site: values.lesion_site,
        lesion_duration_days: values.lesion_duration_days,
      },
    })
  }

  const error = mutation.error as AppError | null

  if (!hasConsent) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Verificando consentimiento...
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Datos anonimos minimos</CardTitle>
          <CardDescription>
            Estos campos ayudan a contextualizar el caso sin identificar a la persona.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudo crear el caso</AlertTitle>
              <AlertDescription>
                {error.message}
                {error.requestId ? ` Solicitud: ${error.requestId}` : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="age_years">Edad aproximada</Label>
              <Input
                id="age_years"
                type="number"
                min={0}
                max={120}
                {...form.register("age_years", {
                  setValueAs: (value) => (value === "" ? undefined : Number(value)),
                })}
              />
              {form.formState.errors.age_years ? (
                <p className="text-sm text-destructive">{form.formState.errors.age_years.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sex">Sexo declarado</Label>
              <select
                id="sex"
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...form.register("sex")}
              >
                {sexOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="city">Ciudad o municipio</Label>
              <Input id="city" placeholder="Opcional" {...form.register("city")} />
              {form.formState.errors.city ? (
                <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="zone">Zona general</Label>
              <Input id="zone" placeholder="Ej. zona norte, comunidad, barrio" {...form.register("zone")} />
              {form.formState.errors.zone ? (
                <p className="text-sm text-destructive">{form.formState.errors.zone.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="lesion_site">Zona bucal observada</Label>
              <select
                id="lesion_site"
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                {...form.register("lesion_site")}
              >
                {lesionSiteOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lesion_duration_days">Duracion aproximada en dias</Label>
              <Input
                id="lesion_duration_days"
                type="number"
                min={0}
                max={3650}
                {...form.register("lesion_duration_days", { valueAsNumber: true })}
              />
              {form.formState.errors.lesion_duration_days ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.lesion_duration_days.message}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Creando caso..." : "Crear caso y continuar"}
        </Button>
      </div>
    </form>
  )
}
