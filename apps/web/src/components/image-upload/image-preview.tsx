"use client"

import { CheckCircle2, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatBytes, type PreparedImage } from "@/features/images/utils"

type ImagePreviewProps = {
  image: PreparedImage
  disabled?: boolean
  onClear: () => void
  onSubmit: () => void
}

export function ImagePreview({ image, disabled, onClear, onSubmit }: ImagePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Vista previa</CardTitle>
            <CardDescription>Confirma que la imagen es nitida antes de subirla.</CardDescription>
          </div>
          {image.wasCompressed ? <Badge variant="secondary">Comprimida</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.previewUrl}
          alt="Vista previa de imagen oral seleccionada"
          className="max-h-[420px] w-full rounded-lg border object-contain"
        />

        <dl className="grid gap-2 rounded-lg bg-muted p-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Formato</dt>
            <dd className="font-medium">{image.file.type}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Tamano</dt>
            <dd className="font-medium">{formatBytes(image.file.size)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Resolucion</dt>
            <dd className="font-medium">
              {image.metadata.width_px} x {image.metadata.height_px}px
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={disabled} onClick={onClear}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Cambiar imagen
          </Button>
          <Button type="button" disabled={disabled} onClick={onSubmit}>
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Subir y validar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
