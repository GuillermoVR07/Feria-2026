import { callEdgeFunction } from "@/lib/supabase/edge-functions"

import {
  finalizeImageUploadResponseSchema,
  requestImageUploadResponseSchema,
  validateImageResponseSchema,
} from "./schemas"
import type {
  FinalizeImageUploadInput,
  RequestImageUploadInput,
  ValidateImageInput,
} from "./types"

export async function requestImageUpload(input: RequestImageUploadInput) {
  const result = await callEdgeFunction("request-image-upload", {
    method: "POST",
    body: input,
    responseSchema: requestImageUploadResponseSchema,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}

export async function uploadImageToSignedUrl(uploadUrl: string, file: File) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  })

  if (!response.ok) {
    throw new Error("No se pudo subir la imagen a Storage con la URL firmada.")
  }
}

export async function finalizeImageUpload(input: FinalizeImageUploadInput) {
  const result = await callEdgeFunction("finalize-image-upload", {
    method: "POST",
    body: input,
    responseSchema: finalizeImageUploadResponseSchema,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}

export async function validateImage(input: ValidateImageInput) {
  const result = await callEdgeFunction("validate-image", {
    method: "POST",
    body: input,
    responseSchema: validateImageResponseSchema,
  })

  if (!result.ok) {
    throw result.error
  }

  return result.data.data
}
