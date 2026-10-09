import { defineConfig, devices } from "@playwright/test";

/** Puerto propio: los tests nunca reutilizan un `pnpm dev` con el backend real. */
const PORT = 3100;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // Opcional: usar un Chromium ya instalado en vez del descargado por Playwright.
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined },
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `pnpm build && pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    // Los tests usan los datos de ejemplo locales (src/lib/api/fixtures.ts), no el backend real.
    env: { ...process.env, EMER_API_FIXTURES: process.env.EMER_API_FIXTURES ?? "1" } as Record<
      string,
      string
    >,
  },
});
