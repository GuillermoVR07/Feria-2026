"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { CONSENT_VERSION, consentSchema, type ConsentFormValues } from "@/features/cases/schemas"
import { saveConsentDraft } from "@/features/cases/store"

export function ConsentForm() {
  const router = useRouter()
  const form = useForm<ConsentFormValues>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      accepted: undefined as unknown as true,
      consentVersion: CONSENT_VERSION,
    },
  })

  const accepted = useWatch({ control: form.control, name: "accepted" })

  function onSubmit(values: ConsentFormValues) {
    saveConsentDraft({
      accepted: values.accepted,
      consentVersion: values.consentVersion,
    })

    router.push("/casos/nuevo/datos")
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Consentimiento informado</CardTitle>
          <CardDescription>
            El caso se registra sin nombre, cedula, telefono ni direccion exacta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>
              La informacion se usara para una demostracion de software de triaje visual
              preventivo. La imagen y las respuestas seran procesadas por funciones
              backend para orientar una revision profesional.
            </p>
            <p>
              Puedes detener el flujo antes de enviar el caso. Si pierdes el token temporal,
              deberas iniciar un nuevo caso anonimo.
            </p>
          </div>

          <Alert>
            <AlertTitle>Importante</AlertTitle>
            <AlertDescription>
              El resultado no reemplaza una consulta odontologica o medica.
            </AlertDescription>
          </Alert>

          <Label className="flex items-start gap-3 rounded-lg border bg-card p-3">
            <Checkbox
              checked={accepted === true}
              onCheckedChange={(checked) => {
                form.setValue("accepted", checked === true ? true : (undefined as unknown as true), {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
              aria-invalid={Boolean(form.formState.errors.accepted)}
            />
            <span className="grid gap-1">
              <span>Acepto participar en esta demo anonima.</span>
              <span className="text-xs font-normal leading-5 text-muted-foreground">
                Version de consentimiento: {CONSENT_VERSION}
              </span>
            </span>
          </Label>

          {form.formState.errors.accepted ? (
            <p className="text-sm text-destructive">{form.formState.errors.accepted.message}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit">Continuar</Button>
      </div>
    </form>
  )
}
