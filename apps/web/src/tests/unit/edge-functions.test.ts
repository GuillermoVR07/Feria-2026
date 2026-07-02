import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/http/errors";
import { callEdgeFunction } from "@/lib/supabase/edge-functions";

describe("callEdgeFunction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends JSON, apikey and bearer token", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        success: true,
        data: { ok: true },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await callEdgeFunction<{ success: true; data: { ok: boolean } }, { demo: boolean }>(
      "demo-function",
      {
        body: { demo: true },
        bearerToken: "access-token",
      },
    );

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.functions.supabase.co/demo-function",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ demo: true }),
        cache: "no-store",
      }),
    );

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("apikey")).toBe("sb_publishable_test");
    expect(headers.get("Authorization")).toBe("Bearer access-token");
  });

  it("normalizes backend errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "No autorizado para esta operacion.",
              request_id: "req_123",
            },
          },
          { status: 403 },
        ),
      ),
    );

    const result = await callEdgeFunction("private-function");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.status).toBe(403);
      expect(result.error.requestId).toBe("req_123");
    }
  });

  it("reports schema mismatches as validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          success: true,
          data: { unexpected: true },
        }),
      ),
    );

    const result = await callEdgeFunction("demo-function", {
      responseSchema: {
        safeParse: () => ({ success: false }),
      } as never,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
