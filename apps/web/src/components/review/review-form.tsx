"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getCurrentAccessToken } from "@/features/auth/api";
import { reviewCase } from "@/features/review/api";
import {
  reviewCaseSchema,
  type ReviewCaseFormValues,
} from "@/features/review/schemas";
import type { AppError } from "@/lib/http/errors";

const decisions = [
  { value: "confirm_ai", label: "Confirmar orientacion IA" },
  { value: "correct_ai", label: "Corregir orientacion IA" },
  { value: "needs_clinical_evaluation", label: "Requiere evaluacion clinica" },
  { value: "insufficient_information", label: "Informacion insuficiente" },
] as const;

const suspicionLevels = [
  { value: "invalid_image", label: "Imagen no valida" },
  { value: "low", label: "Baja" },
  { value: "moderate", label: "Moderada" },
  { value: "high", label: "Alta" },
] as const;

export function ReviewForm({ caseId }: { caseId?: string }) {
  const router = useRouter();
  const form = useForm<ReviewCaseFormValues>({
    resolver: zodResolver(reviewCaseSchema),
    defaultValues: {
      case_id: caseId === "manual" ? "" : caseId ?? "",
      decision: "confirm_ai",
      corrected_suspicion_level: null,
      clinical_notes: "",
      recommended_action: "",
    },
  });
  const decision = useWatch({ control: form.control, name: "decision" });
  const correctedSuspicionLevel = useWatch({
    control: form.control,
    name: "corrected_suspicion_level",
  });

  const mutation = useMutation({
    mutationFn: async (values: ReviewCaseFormValues) => {
      const token = await getCurrentAccessToken();

      if (!token) {
        throw new Error("Sesion interna no disponible.");
      }

      return reviewCase(values, token);
    },
    onSuccess: () => {
      router.refresh();
    },
  });

  const error = mutation.error as AppError | null;

  return (
    <form
      className="grid gap-4"
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      <Card>
        <CardHeader>
          <CardTitle>Registrar revision</CardTitle>
          <CardDescription>
            Completa la revision interna con una cuenta autorizada.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>No se pudo registrar la revision</AlertTitle>
              <AlertDescription>
                {error.message}
                {error.requestId ? ` Solicitud: ${error.requestId}` : ""}
              </AlertDescription>
            </Alert>
          ) : null}

          {mutation.data ? (
            <Alert>
              <AlertTitle>Revision registrada</AlertTitle>
              <AlertDescription>
                Caso {mutation.data.case_id} actualizado a {mutation.data.status}.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="case_id">ID del caso</Label>
            <Input
              id="case_id"
              placeholder="UUID del caso"
              {...form.register("case_id")}
            />
            {form.formState.errors.case_id ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.case_id.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Decision</Label>
            <Select
              value={decision}
              onValueChange={(value) => {
                form.setValue("decision", value as ReviewCaseFormValues["decision"], {
                  shouldDirty: true,
                  shouldValidate: true,
                });

                if (value !== "correct_ai") {
                  form.setValue("corrected_suspicion_level", null, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {decisions.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {decision === "correct_ai" ? (
            <div className="grid gap-2">
              <Label>Nivel corregido</Label>
              <Select
                value={correctedSuspicionLevel ?? undefined}
                onValueChange={(value) => {
                  form.setValue(
                    "corrected_suspicion_level",
                    value as ReviewCaseFormValues["corrected_suspicion_level"],
                    {
                      shouldDirty: true,
                      shouldValidate: true,
                    },
                  );
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona nivel" />
                </SelectTrigger>
                <SelectContent>
                  {suspicionLevels.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.corrected_suspicion_level ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.corrected_suspicion_level.message}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="clinical_notes">Notas de revision</Label>
            <Textarea
              id="clinical_notes"
              rows={5}
              placeholder="Registra observaciones tecnicas o clinicas sin datos personales."
              {...form.register("clinical_notes")}
            />
            {form.formState.errors.clinical_notes ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.clinical_notes.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="recommended_action">Accion recomendada</Label>
            <Textarea
              id="recommended_action"
              rows={3}
              placeholder="Opcional. Recomendacion preventiva para seguimiento."
              {...form.register("recommended_action")}
            />
            {form.formState.errors.recommended_action ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.recommended_action.message}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending}>
          <Save className="size-4" aria-hidden="true" />
          {mutation.isPending ? "Guardando..." : "Guardar revision"}
        </Button>
      </div>
    </form>
  );
}
