import { expect, test } from "@playwright/test";

test("la home carga sin errores de consola", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    // Los fallos de carga de recursos (p. ej. la imagen rota intencionada de los datos de
    // ejemplo) se prueban aparte; aquí solo cuentan los errores de JS.
    if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.locator("main")).toBeVisible();
  expect(errors).toEqual([]);
});

test("respeta prefers-reduced-motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  const reduced = await page.evaluate(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  expect(reduced).toBe(true);
  await context.close();
});
