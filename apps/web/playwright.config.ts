import { defineConfig, devices } from "playwright/test";

export default defineConfig({
  testDir: "./src/tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3002",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "corepack pnpm exec next dev --webpack -p 3002",
    url: "http://localhost:3002",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
