import { expect, test } from "playwright/test";

import { demoImageFile, mockPublicFlow } from "./helpers";

test("consent cannot advance without acceptance", async ({ page }) => {
  await page.goto("/casos/nuevo/consentimiento");
  await page.getByRole("button", { name: /continuar/i }).click();
  await expect(page.getByText(/debes aceptar/i)).toBeVisible();
});

test("missing anonymous token redirects protected public steps", async ({ page }) => {
  await page.goto("/casos/nuevo/cuestionario");
  await expect(page).toHaveURL(/\/casos\/nuevo\/consentimiento/);
});

test("rejected image stays on capture step with reason", async ({ page }) => {
  await mockPublicFlow(page, { rejectImage: true });

  await page.goto("/casos/nuevo/consentimiento");
  await page.waitForTimeout(1000);
  const rejectedConsentCheckbox = page.getByRole("checkbox", { name: /acepto participar/i });
  await rejectedConsentCheckbox.click();
  await expect(rejectedConsentCheckbox).toBeChecked();
  await page.getByRole("button", { name: /continuar/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/datos/);
  await page.getByLabel(/duracion aproximada/i).fill("7");
  await page.getByRole("button", { name: /crear caso/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/cuestionario/);
  await page.getByRole("button", { name: /guardar cuestionario/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/imagen/);
  await page.locator('input[type="file"]').nth(1).setInputFiles(demoImageFile);
  await expect(page.getByText(/vista previa/i)).toBeVisible();
  await page.getByRole("button", { name: /subir y validar/i }).click();

  await expect(page).toHaveURL(/\/casos\/nuevo\/imagen/);
  await expect(page.getByText(/repite la captura/i)).toBeVisible();
  await expect(page.getByText(/iluminacion/i)).toBeVisible();
});

test("AI unavailable shows retryable technical error", async ({ page }) => {
  await mockPublicFlow(page, { failInference: true });

  await page.goto("/casos/nuevo/consentimiento");
  await page.waitForTimeout(1000);
  const aiConsentCheckbox = page.getByRole("checkbox", { name: /acepto participar/i });
  await aiConsentCheckbox.click();
  await expect(aiConsentCheckbox).toBeChecked();
  await page.getByRole("button", { name: /continuar/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/datos/);
  await page.getByLabel(/duracion aproximada/i).fill("7");
  await page.getByRole("button", { name: /crear caso/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/cuestionario/);
  await page.getByRole("button", { name: /guardar cuestionario/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/imagen/);
  await page.locator('input[type="file"]').nth(1).setInputFiles(demoImageFile);
  await expect(page.getByText(/vista previa/i)).toBeVisible();
  await page.getByRole("button", { name: /subir y validar/i }).click();

  await expect(page).toHaveURL(/\/casos\/OD-20260702-E2E\/procesando/);
  await expect(page.getByText(/servicio ia no disponible/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /reintentar/i })).toBeVisible();
});
