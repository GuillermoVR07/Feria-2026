import { expect, test } from "playwright/test";

import { demoImageFile, mockPublicFlow } from "./helpers";

test("public demo flow reaches preventive result and PDF action", async ({ page }) => {
  await mockPublicFlow(page);

  await page.goto("/");
  await expect(page.getByRole("link", { name: /iniciar caso/i })).toBeVisible();
  await page.goto("/casos/nuevo/consentimiento");
  await page.waitForTimeout(1000);

  const consentCheckbox = page.getByRole("checkbox", { name: /acepto participar/i });
  await consentCheckbox.click();
  await expect(consentCheckbox).toBeChecked();
  await page.getByRole("button", { name: /continuar/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/datos/);

  await page.getByLabel(/edad aproximada/i).fill("35");
  await page.getByLabel(/ciudad/i).fill("La Paz");
  await page.getByLabel(/duracion aproximada/i).fill("7");
  await page.getByRole("button", { name: /crear caso/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/cuestionario/);

  await page.getByRole("checkbox", { name: /dolor persistente/i }).click();
  await page.getByLabel(/notas anonimas/i).fill("Sin datos personales.");
  await page.getByRole("button", { name: /guardar cuestionario/i }).click();
  await expect(page).toHaveURL(/\/casos\/nuevo\/imagen/);

  await page.locator('input[type="file"]').nth(1).setInputFiles(demoImageFile);
  await expect(page.getByText(/vista previa/i)).toBeVisible();
  await page.getByRole("button", { name: /subir y validar/i }).click();

  await expect(page).toHaveURL(/\/casos\/OD-20260702-E2E\/procesando/);
  await expect(page).toHaveURL(/\/casos\/OD-20260702-E2E\/resultado/);
  await expect(page.getByText(/orientacion preventiva de bajo riesgo/i)).toBeVisible();
  await expect(page.getByText(/grad-cam no disponible/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /descargar reporte/i })).toHaveAttribute(
    "href",
    "https://storage.example.test/report.pdf",
  );
});
