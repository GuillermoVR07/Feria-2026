export type GenerateReportInput = {
  case_code: string
  case_token: string
}

export type GenerateReportResult = {
  report_id: string
  case_code: string
  download_url: string
  expires_in_seconds: number
}
