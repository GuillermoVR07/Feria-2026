"use client"

import { useMutation } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getCaseSession, updateCaseSession } from "@/features/cases/store"
import {
  finalizeImageUpload,
  requestImageUpload,
  uploadImageToSignedUrl,
  validateImage,
} from "@/features/images/api"
import { prepareImage, type PreparedImage } from "@/features/images/utils"
import type { CaptureSource, ValidateImageResult } from "@/features/images/types"
import type { AppError } from "@/lib/http/errors"

import { ImagePicker } from "./image-picker"
import { ImagePreview } from "./image-preview"

type UploadStep = "idle" | "preparing" | "requesting" | "uploading" | "finalizing" | "validating" | "done"

const uploadStepLabels: Record<UploadStep, string> = {
  idle: "Selecciona una imagen para continuar.",
  preparing: "Leyendo imagen y metadatos...",
  requesting: "Solicitando URL firmada...",
  uploading: "Subiendo imagen al bucket privado...",
  finalizing: "Confirmando subida...",
  validating: "Validando calidad tecnica...",
  done: "Imagen validada.",
}

const uploadStepProgress: Record<UploadStep, number> = {
  idle: 0,
  preparing: 15,
  requesting: 35,
  uploading: 58,
  finalizing: 78,
  validating: 92,
  done: 100,
}

function humanizeRejectionReason(reason: string) {
  const labels: Record<string, string> = {
    INVALID_FORMAT: "Formato no permitido.",
    LOW_RESOLUTION: "La resolucion es baja. Usa al menos 640 x 480 px.",
    IMAGE_BLURRY: "La imagen parece borrosa o sin detalle suficiente.",
    LOW_LIGHT: "La iluminacion no es suficiente.",
  }

  return labels[reason] ?? reason
}

export function ImageUploadFlow() {
  const router = useRouter()
  const [caseSession] = useState(() => getCaseSession())
  const [preparedImage, setPreparedImage] = useState<PreparedImage | null>(null)
  const [captureSource, setCaptureSource] = useState<CaptureSource>("gallery")
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle")
  const [qualityResult, setQualityResult] = useState<ValidateImageResult | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!caseSession?.caseCode || !caseSession.caseToken) {
      router.replace("/casos/nuevo/consentimiento")
    }
  }, [caseSession, router])

  useEffect(() => {
    return () => {
      if (preparedImage?.previewUrl) {
        URL.revokeObjectURL(preparedImage.previewUrl)
      }
    }
  }, [preparedImage])

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!preparedImage || !caseSession?.caseCode || !caseSession.caseToken) {
        throw new Error("Falta informacion del caso o de la imagen.")
      }

      setUploadStep("requesting")
      const uploadRequest = await requestImageUpload({
        case_code: caseSession.caseCode,
        case_token: caseSession.caseToken,
        image: {
          mime_type: preparedImage.file.type,
          size_bytes: preparedImage.file.size,
          capture_source: captureSource,
        },
      })

      setUploadStep("uploading")
      await uploadImageToSignedUrl(uploadRequest.upload_url, preparedImage.file)

      setUploadStep("finalizing")
      await finalizeImageUpload({
        case_code: caseSession.caseCode,
        case_token: caseSession.caseToken,
        image_id: uploadRequest.image_id,
        metadata: {
          width_px: preparedImage.metadata.width_px,
          height_px: preparedImage.metadata.height_px,
          sha256_hash: preparedImage.metadata.sha256_hash,
        },
      })

      setUploadStep("validating")
      const validation = await validateImage({
        case_code: caseSession.caseCode,
        case_token: caseSession.caseToken,
        image_id: uploadRequest.image_id,
      })

      return {
        imageId: uploadRequest.image_id,
        validation,
      }
    },
    onSuccess: ({ imageId, validation }) => {
      setUploadStep("done")
      setQualityResult(validation)

      if (validation.quality_status === "accepted") {
        updateCaseSession({ imageId, status: "quality_accepted" })
        toast.success("Imagen aceptada para procesamiento.")
        router.push(`/casos/${caseSession?.caseCode}/procesando`)
        return
      }

      updateCaseSession({ imageId, status: "image_rejected" })
      toast.warning("La imagen fue rechazada por calidad tecnica.")
    },
    onError: () => {
      setUploadStep("idle")
    },
  })

  async function handleSelect(file: File, source: CaptureSource) {
    setLocalError(null)
    setQualityResult(null)
    setCaptureSource(source)
    setUploadStep("preparing")

    try {
      const prepared = await prepareImage(file)
      setPreparedImage((current) => {
        if (current?.previewUrl) {
          URL.revokeObjectURL(current.previewUrl)
        }

        return prepared
      })
      setUploadStep("idle")
    } catch (error) {
      setPreparedImage(null)
      setUploadStep("idle")
      setLocalError(error instanceof Error ? error.message : "No se pudo preparar la imagen.")
    }
  }

  function clearImage() {
    setPreparedImage((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl)
      }

      return null
    })
    setQualityResult(null)
    setLocalError(null)
    setUploadStep("idle")
  }

  const uploadError = uploadMutation.error as AppError | Error | null
  const isBusy = uploadMutation.isPending || uploadStep === "preparing"

  if (!caseSession?.caseCode) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Recuperando caso anonimo...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-3 py-4">
          <div className="flex items-center gap-2 text-sm">
            {isBusy ? <Loader2 className="size-4 animate-spin text-primary" /> : <CheckCircle2 className="size-4 text-primary" />}
            <span>{uploadStepLabels[uploadStep]}</span>
          </div>
          <Progress value={uploadStepProgress[uploadStep]} aria-label="Progreso de subida de imagen" />
        </CardContent>
      </Card>

      {localError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>Imagen no valida</AlertTitle>
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      ) : null}

      {uploadError ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>No se pudo completar la subida</AlertTitle>
          <AlertDescription>
            {uploadError.message}
            {"requestId" in uploadError && uploadError.requestId ? ` Solicitud: ${uploadError.requestId}` : ""}
          </AlertDescription>
        </Alert>
      ) : null}

      {qualityResult?.quality_status === "rejected" ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle>Repite la captura</AlertTitle>
          <AlertDescription>
            <span className="block">{qualityResult.message}</span>
            <span className="mt-2 block">
              {qualityResult.rejection_reasons.map(humanizeRejectionReason).join(" ")}
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      <ImagePicker disabled={isBusy} onSelect={handleSelect} />

      {preparedImage ? (
        <ImagePreview
          image={preparedImage}
          disabled={isBusy}
          onClear={clearImage}
          onSubmit={() => uploadMutation.mutate()}
        />
      ) : null}
    </div>
  )
}
