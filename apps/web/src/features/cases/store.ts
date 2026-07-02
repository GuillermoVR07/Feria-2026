"use client"

import type { CaseSession, ConsentDraft } from "./types"

const CASE_SESSION_KEY = "oraldiagnostic.case_session"
const CONSENT_DRAFT_KEY = "oraldiagnostic.consent_draft"

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.sessionStorage.getItem(key)

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    window.sessionStorage.removeItem(key)
    return null
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return
  }

  window.sessionStorage.setItem(key, JSON.stringify(value))
}

export function saveConsentDraft(value: ConsentDraft) {
  writeJson(CONSENT_DRAFT_KEY, value)
}

export function getConsentDraft() {
  return readJson<ConsentDraft>(CONSENT_DRAFT_KEY)
}

export function clearConsentDraft() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(CONSENT_DRAFT_KEY)
  }
}

export function saveCaseSession(value: CaseSession) {
  writeJson(CASE_SESSION_KEY, value)
}

export function getCaseSession() {
  return readJson<CaseSession>(CASE_SESSION_KEY)
}

export function updateCaseSession(update: Partial<CaseSession>) {
  const current = getCaseSession()

  if (!current) {
    return null
  }

  const next = { ...current, ...update }
  saveCaseSession(next)
  return next
}

export function clearCaseSession() {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(CASE_SESSION_KEY)
  }
}
