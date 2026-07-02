import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearCaseSession,
  clearConsentDraft,
  getCaseSession,
  getConsentDraft,
  saveCaseSession,
  saveConsentDraft,
  updateCaseSession,
} from "@/features/cases/store";

function createSessionStorage() {
  const storage = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      storage.delete(key);
    }),
  };
}

describe("case session store", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      sessionStorage: createSessionStorage(),
    });
  });

  it("stores consent and case session only in sessionStorage", () => {
    saveConsentDraft({ accepted: true, consentVersion: "v1" });
    saveCaseSession({
      caseId: "case-id",
      caseCode: "OD-20260702-TEST",
      caseToken: "secret-token",
      status: "case_created",
    });

    expect(getConsentDraft()).toEqual({ accepted: true, consentVersion: "v1" });
    expect(getCaseSession()?.caseToken).toBe("secret-token");
  });

  it("updates and clears the current case session", () => {
    saveCaseSession({
      caseId: "case-id",
      caseCode: "OD-20260702-TEST",
      caseToken: "secret-token",
      status: "case_created",
    });

    expect(updateCaseSession({ imageId: "image-id", status: "quality_accepted" })).toMatchObject({
      imageId: "image-id",
      status: "quality_accepted",
    });

    clearCaseSession();
    clearConsentDraft();

    expect(getCaseSession()).toBeNull();
    expect(getConsentDraft()).toBeNull();
  });

  it("removes invalid JSON drafts", () => {
    const storage = createSessionStorage();
    storage.setItem("oraldiagnostic.case_session", "{not-json");
    vi.stubGlobal("window", { sessionStorage: storage });

    expect(getCaseSession()).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith("oraldiagnostic.case_session");
  });
});
