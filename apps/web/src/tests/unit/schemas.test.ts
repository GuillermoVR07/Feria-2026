import { describe, expect, it } from "vitest";

import { anonymousCaseDataSchema, consentSchema } from "@/features/cases/schemas";
import { selectedImageSchema } from "@/features/images/schemas";
import { questionnaireSchema } from "@/features/questionnaire/schemas";
import { reviewCaseSchema } from "@/features/review/schemas";

describe("frontend schemas", () => {
  it("requires accepted consent", () => {
    expect(consentSchema.safeParse({ accepted: true, consentVersion: "v1" }).success).toBe(true);
    expect(consentSchema.safeParse({ accepted: false, consentVersion: "v1" }).success).toBe(false);
  });

  it("validates anonymous case bounds", () => {
    expect(
      anonymousCaseDataSchema.safeParse({
        age_years: 35,
        sex: "not_specified",
        city: "La Paz",
        zone: "Centro",
        lesion_site: "tongue",
        lesion_duration_days: 12,
      }).success,
    ).toBe(true);

    expect(
      anonymousCaseDataSchema.safeParse({
        age_years: 130,
        sex: "not_specified",
        lesion_site: "tongue",
        lesion_duration_days: 12,
      }).success,
    ).toBe(false);
  });

  it("keeps questionnaire booleans as booleans", () => {
    const valid = Object.fromEntries(
      [
        "pain",
        "bleeding",
        "growth",
        "white_patch",
        "red_patch",
        "non_healing_ulcer",
        "lump_or_induration",
        "dysphagia",
        "tobacco_use",
        "alcohol_use",
        "coca_chewing",
        "coca_machucada",
        "bicarbonate_or_additives",
        "dental_prosthesis",
        "constant_friction",
      ].map((field) => [field, false]),
    );

    expect(questionnaireSchema.safeParse({ ...valid, pain: true, notes: "" }).success).toBe(true);
    expect(questionnaireSchema.safeParse({ ...valid, pain: "true" }).success).toBe(false);
  });

  it("rejects unsupported image formats and oversized files", () => {
    expect(
      selectedImageSchema.safeParse({
        mime_type: "image/jpeg",
        size_bytes: 1024,
        width_px: 640,
        height_px: 480,
      }).success,
    ).toBe(true);

    expect(
      selectedImageSchema.safeParse({
        mime_type: "application/pdf",
        size_bytes: 1024,
        width_px: 640,
        height_px: 480,
      }).success,
    ).toBe(false);

    expect(
      selectedImageSchema.safeParse({
        mime_type: "image/png",
        size_bytes: 11 * 1024 * 1024,
        width_px: 640,
        height_px: 480,
      }).success,
    ).toBe(false);
  });

  it("requires corrected suspicion level when correcting AI", () => {
    expect(
      reviewCaseSchema.safeParse({
        case_id: "11111111-1111-4111-8111-111111111111",
        decision: "confirm_ai",
        corrected_suspicion_level: null,
        clinical_notes: "Revision preventiva registrada.",
        recommended_action: "",
      }).success,
    ).toBe(true);

    expect(
      reviewCaseSchema.safeParse({
        case_id: "11111111-1111-4111-8111-111111111111",
        decision: "correct_ai",
        corrected_suspicion_level: null,
        clinical_notes: "Revision preventiva registrada.",
        recommended_action: "",
      }).success,
    ).toBe(false);
  });
});
