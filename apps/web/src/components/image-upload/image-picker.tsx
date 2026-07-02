"use client"

import { Camera, ImagePlus } from "lucide-react"
import { useRef } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CaptureSource } from "@/features/images/types"

type ImagePickerProps = {
  disabled?: boolean
  onSelect: (file: File, source: CaptureSource) => void
}

export function ImagePicker({ disabled, onSelect }: ImagePickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function handleChange(source: CaptureSource, files: FileList | null) {
    const file = files?.item(0)

    if (file) {
      onSelect(file, source)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selecciona una imagen</CardTitle>
        <CardDescription>
          Usa JPG, PNG o WebP. El peso maximo permitido por el backend es 10 MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <input
          ref={cameraInputRef}
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={disabled}
          onChange={(event) => handleChange("camera", event.currentTarget.files)}
        />
        <input
          ref={galleryInputRef}
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => handleChange("gallery", event.currentTarget.files)}
        />

        <Button type="button" variant="outline" disabled={disabled} onClick={() => cameraInputRef.current?.click()}>
          <Camera className="size-4" aria-hidden="true" />
          Capturar con camara
        </Button>
        <Button type="button" variant="outline" disabled={disabled} onClick={() => galleryInputRef.current?.click()}>
          <ImagePlus className="size-4" aria-hidden="true" />
          Subir desde galeria
        </Button>
      </CardContent>
    </Card>
  )
}
