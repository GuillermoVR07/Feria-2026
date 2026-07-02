export type CaptureSource = "camera" | "gallery"

export type ImageMetadata = {
  width_px: number
  height_px: number
  sha256_hash: string
}

export type RequestImageUploadInput = {
  case_code: string
  case_token: string
  image: {
    mime_type: string
    size_bytes: number
    capture_source: CaptureSource
  }
}

export type RequestImageUploadResult = {
  image_id: string
  bucket_name: string
  object_path: string
  upload_url: string
  expires_in_seconds: number
  next_step: "finalize_image_upload"
}

export type FinalizeImageUploadInput = {
  case_code: string
  case_token: string
  image_id: string
  metadata: {
    width_px: number | null
    height_px: number | null
    sha256_hash: string | null
  }
}

export type FinalizeImageUploadResult = {
  image_id: string
  status: "image_uploaded"
  next_step: "validate_image"
}

export type ValidateImageInput = {
  case_code: string
  case_token: string
  image_id: string
}

export type ValidateImageResult =
  | {
      image_id: string
      quality_status: "accepted"
      scores: {
        sharpness_score: number
        brightness_score: number
        contrast_score: number
      }
      next_step: "run_inference"
    }
  | {
      image_id: string
      quality_status: "rejected"
      rejection_reasons: string[]
      message: string
      next_step: "repeat_capture"
    }
