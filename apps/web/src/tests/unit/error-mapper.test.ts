import { describe, expect, it } from "vitest";

import { AppError, toAppError } from "@/lib/http/errors";

describe("error mapper", () => {
  it("keeps existing AppError instances", () => {
    const error = new AppError("Ya normalizado", "FORBIDDEN", 403, "req_1");
    expect(toAppError(error)).toBe(error);
  });

  it("maps aborts to timeout", () => {
    const error = toAppError(new DOMException("Aborted", "AbortError"));
    expect(error.code).toBe("TIMEOUT");
  });

  it("maps regular errors to network errors", () => {
    const error = toAppError(new Error("Failed to fetch"));
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toBe("Failed to fetch");
  });
});
