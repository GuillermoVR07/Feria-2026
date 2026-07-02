import imageCompression from "browser-image-compression"

import { readImageMetadata, sha256File } from "@/lib/utils/image-metadata"

import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  selectedImageSchema,
} from "./schemas"
import type { ImageMetadata } from "./types"

export type PreparedImage = {
  file: File
  originalFile: File
  previewUrl: string
  metadata: ImageMetadata
  wasCompressed: boolean
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function validateImageFile(file: File, width: number, height: number) {
  return selectedImageSchema.safeParse({
    mime_type: file.type,
    size_bytes: file.size,
    width_px: width,
    height_px: height,
  })
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  const initialMetadata = await readImageMetadata(file)
  const initialValidation = validateImageFile(file, initialMetadata.width, initialMetadata.height)

  if (!initialValidation.success) {
    throw new Error(initialValidation.error.issues[0]?.message ?? "La imagen no es valida.")
  }

  let uploadFile = file
  let wasCompressed = false

  if (file.size > 5 * 1024 * 1024 && ALLOWED_IMAGE_MIME_TYPES.includes(file.type as never)) {
    const compressed = await imageCompression(file, {
      maxSizeMB: 4,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: file.type,
      initialQuality: 0.86,
    })

    if (compressed.size > 0 && compressed.size < file.size) {
      uploadFile = new File([compressed], file.name, {
        type: compressed.type || file.type,
        lastModified: Date.now(),
      })
      wasCompressed = true
    }
  }

  const finalMetadata = await readImageMetadata(uploadFile)
  const finalValidation = validateImageFile(uploadFile, finalMetadata.width, finalMetadata.height)

  if (!finalValidation.success) {
    if (uploadFile.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error("La imagen sigue superando 10 MB despues de comprimir.")
    }

    throw new Error(finalValidation.error.issues[0]?.message ?? "La imagen no es valida.")
  }

  return {
    file: uploadFile,
    originalFile: file,
    previewUrl: URL.createObjectURL(uploadFile),
    metadata: {
      width_px: finalMetadata.width,
      height_px: finalMetadata.height,
      sha256_hash: await sha256File(uploadFile),
    },
    wasCompressed,
  }
}
