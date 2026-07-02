import type { Page, Route } from "playwright/test";

const png1x1Base64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export const demoImageFile = {
  name: "lesion-demo.png",
  mimeType: "image/png",
  buffer: Buffer.from(png1x1Base64, "base64"),
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({
      status: 204,
      headers: corsHeaders,
      body: "",
    });
    return;
  }

  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export async function mockPublicFlow(page: Page, options?: { rejectImage?: boolean; failInference?: boolean }) {
  await page.route("**/health", async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route("**/create-case", async (route) => {
    await fulfillJson(route, {
        success: true,
        request_id: "req_create",
        data: {
          case_id: "11111111-1111-4111-8111-111111111111",
          case_code: "OD-20260702-E2E",
          case_token: "case-token",
          status: "case_created",
          next_step: "questionnaire",
        },
        message: "Caso creado",
    });
  });

  await page.route("**/submit-questionnaire", async (route) => {
    await fulfillJson(route, {
        success: true,
        request_id: "req_questionnaire",
        data: {
          case_id: "11111111-1111-4111-8111-111111111111",
          status: "questionnaire_completed",
          risk_score: 2,
          next_step: "image_upload",
        },
        message: "Cuestionario guardado",
    });
  });

  await page.route("**/request-image-upload", async (route) => {
    await fulfillJson(route, {
        success: true,
        request_id: "req_upload",
        data: {
          image_id: "22222222-2222-4222-8222-222222222222",
          bucket_name: "case-originals",
          object_path: "cases/demo/original.png",
          upload_url: "https://storage.example.test/upload",
          expires_in_seconds: 300,
          next_step: "finalize_image_upload",
        },
        message: "URL firmada",
    });
  });

  await page.route("https://storage.example.test/upload", async (route: Route) => {
    await route.fulfill({ status: 200, headers: corsHeaders, body: "" });
  });

  await page.route("**/finalize-image-upload", async (route) => {
    await fulfillJson(route, {
        success: true,
        request_id: "req_finalize",
        data: {
          image_id: "22222222-2222-4222-8222-222222222222",
          status: "image_uploaded",
          next_step: "validate_image",
        },
        message: "Imagen confirmada",
    });
  });

  await page.route("**/validate-image", async (route) => {
    await fulfillJson(route, {
        success: true,
        request_id: "req_validate",
        data: options?.rejectImage
          ? {
              image_id: "22222222-2222-4222-8222-222222222222",
              quality_status: "rejected",
              rejection_reasons: ["LOW_LIGHT"],
              message: "La imagen no tiene suficiente calidad.",
              next_step: "repeat_capture",
            }
          : {
              image_id: "22222222-2222-4222-8222-222222222222",
              quality_status: "accepted",
              scores: {
                sharpness_score: 0.9,
                brightness_score: 0.8,
                contrast_score: 0.7,
              },
              next_step: "run_inference",
            },
        message: "Validacion lista",
    });
  });

  await page.route("**/run-inference", async (route) => {
    if (options?.failInference) {
      await fulfillJson(
        route,
        {
          error: {
            code: "AI_SERVICE_UNAVAILABLE",
            message: "Servicio IA no disponible.",
            request_id: "req_ai_fail",
          },
        },
        503,
      );
      return;
    }

    await fulfillJson(route, {
        success: true,
        request_id: "req_inference",
        data: {
          inference_id: "33333333-3333-4333-8333-333333333333",
          suspicion_level: "low",
          probability: 0.91,
          recommendation: {
            urgency_level: "routine",
            professional_referral: true,
            message: "Orientacion preventiva de bajo riesgo.",
          },
          next_step: "generate_report",
        },
        message: "Inferencia lista",
    });
  });

  await page.route("**/generate-report", async (route) => {
    await fulfillJson(route, {
        success: true,
        request_id: "req_report",
        data: {
          report_id: "44444444-4444-4444-8444-444444444444",
          download_url: "https://storage.example.test/report.pdf",
          expires_in_seconds: 300,
          status: "reported",
          next_step: "get_case_result",
        },
        message: "Reporte generado",
    });
  });

  await page.route("**/get-case-result", async (route) => {
    await fulfillJson(route, {
        success: true,
        request_id: "req_result",
        data: {
          case_code: "OD-20260702-E2E",
          status: "reported",
          lesion_site: "tongue",
          lesion_duration_days: 7,
          result: {
            suspicion_level: "low",
            urgency_level: "routine",
            professional_referral: true,
            message: "Orientacion preventiva de bajo riesgo.",
          },
          assets: {
            original_image_url: "https://storage.example.test/original.png",
            gradcam_image_url: null,
            report_download_url: "https://storage.example.test/report.pdf",
          },
          medical_disclaimer:
            "Este sistema no emite diagnostico medico. El resultado es una orientacion preventiva de triaje visual y debe ser revisado por un profesional de salud.",
        },
        message: "Resultado listo",
    });
  });
}
