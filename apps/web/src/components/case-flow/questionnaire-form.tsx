"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getCaseSession, updateCaseSession } from "@/features/cases/store"
import { submitQuestionnaire } from "@/features/questionnaire/api"
import { questionnaireQuestions } from "@/features/questionnaire/questions"
import { questionnaireSchema, type QuestionnaireFormValues } from "@/features/questionnaire/schemas"
import type { QuestionnaireBooleanField } from "@/features/questionnaire/types"
import type { AppError } from "@/lib/http/errors"

export function QuestionnaireForm() {
  const router = useRouter()
  const [caseCode] = useState(() => getCaseSession()?.caseCode ?? null)
  const defaultValues = useMemo(() => {
    return {
      ...Object.fromEntries(questionnaireQuestions.map((question) => [question.field, false])),
      notes: "",
    } as QuestionnaireFormValues
  }, [])

  const form = useForm<QuestionnaireFormValues>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues,
  })
  const watchedValues = useWatch({ control: form.control })

  const mutation = useMutation({
    mutationFn: submitQuestionnaire,
    onSuccess: () => {
      updateCaseSession({ status: "questionnaire_completed" })
      router.push("/casos/nuevo/imagen")
    },
  })

  useEffect(() => {
    if (!caseCode || !getCaseSession()?.caseToken) {
      router.replace("/casos/nuevo/consentimiento")
    }
  }, [caseCode, router])

  function onSubmit(values: QuestionnaireFormValues) {
    const session = getCaseSession()

    if (!session?.caseCode || !session.caseToken) {
      router.replace("/casos/nuevo/consentimiento")
      return
    }

    const questionnaire = Object.fromEntries(
      questionnaireQuestions.map((question) => [question.field, Boolean(values[question.field])])
    ) as Record<QuestionnaireBooleanField, boolean>

    mutation.mutate({
      case_code: session.caseCode,
      case_token: session.caseToken,
      questionnaire: {
        ...questionnaire,
        notes: values.notes?.trim() || null,
      },
    })
  }

  const error = mutation.error as AppError | null

  if (!caseCode) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Recuperando caso anonimo...
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cuestionario de riesgo</CardTitle>
          <CardDescription>
            Marca solo los sintomas o factores presentes. Los campos se envian como booleanos reales.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudo guardar el cuestionario</AlertTitle>
              <AlertDescription>
                {error.message}
                {error.requestId ? ` Solicitud: ${error.requestId}` : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {questionnaireQuestions.map((question) => {
              const value = Boolean(watchedValues[question.field])

              return (
                <Label key={question.field} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                  <Checkbox
                    checked={value}
                    onCheckedChange={(checked) => {
                      form.setValue(question.field, checked === true, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  />
                  <span>{question.label}</span>
                </Label>
              )
            })}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notas anonimas</Label>
            <Textarea
              id="notes"
              placeholder="Opcional. No incluyas nombre, telefono, cedula ni direccion exacta."
              rows={4}
              {...form.register("notes")}
            />
            {form.formState.errors.notes ? (
              <p className="text-sm text-destructive">{form.formState.errors.notes.message}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando..." : "Guardar cuestionario"}
        </Button>
      </div>
    </form>
  )
}
