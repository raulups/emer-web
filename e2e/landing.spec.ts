import { expect, type Page, type Route, test } from "@playwright/test";

const skip = (page: Page) => page.getByRole("link", { name: "[ SALTAR ]" });
const loadingFill = (page: Page) =>
  page
    .locator("[data-loading-fill]")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);

/** Retiene `/api/warm` hasta que se llame a la función devuelta (backend lento). */
async function holdWarm(page: Page) {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/warm", async (route: Route) => {
    await held;
    await route.continue();
  });
  return release;
}

test.beforeEach(({ page: _page }, info) => {
  test.skip(
    info.project.name === "mobile",
    "en el móvil, la Landing se prueba en e2e/mobile.spec.ts",
  );
});

test("túnel: los logos de las marcas (repetidos hasta llenarlo) con el contador", async ({
  page,
}) => {
  await holdWarm(page);
  await page.goto("/");
  // Las fixtures traen 4 logos: se repiten hasta el mínimo del túnel.
  await expect(page.locator("[data-tile]")).toHaveCount(18);
  await expect(page.locator("[data-tile] img").first()).not.toHaveAttribute("src", /_next\/image/);
  await expect(page.locator("[data-cnt-number]")).not.toHaveText("00");
  await expect
    .poll(() =>
      page.locator("[data-tile]").evaluateAll((els) => els.some((el) => el.style.opacity === "1")),
    )
    .toBe(true);
  const box = await skip(page).boundingBox();
  expect(box?.y).toBeLessThan(40);
});

test("sin logos (backend dormido): el túnel arranca igual, solo con el contador", async ({
  page,
}) => {
  await holdWarm(page);
  await page.route("**/api/logos", (route) => route.fulfill({ json: { logos: [] } }));
  await page.goto("/");
  await expect(page.locator("[data-cnt-number]")).not.toHaveText("00");
  await expect(page.locator("[data-tile]")).toHaveCount(0);
});

test("con la respuesta ya recibida: la barra se llena rápido y abre el Marketplace", async ({
  page,
}) => {
  await page.goto("/");
  // El túnel dura 6 s; después, la barra (0,6 s) y la cortina.
  await expect(page.locator("main[data-loading]")).toBeAttached({ timeout: 9000 });
  await expect(page.getByRole("status")).toHaveText("CARGANDO MARKETPLACE");
  await page.waitForURL("**/web", { timeout: 4000 });
  await expect(page.getByRole("region", { name: "Productos" })).toBeVisible();
});

test("sin respuesta: la barra espera sin llegar al final y se completa al llegar", async ({
  page,
}) => {
  const release = await holdWarm(page);
  await page.goto("/");
  await skip(page).click();
  await expect(page.locator("main[data-loading]")).toBeAttached();
  await page.waitForTimeout(2500);
  const waiting = await loadingFill(page);
  expect(waiting).toBeGreaterThan(0.05);
  expect(waiting).toBeLessThan(0.85);
  await expect(page).toHaveURL("/");

  release();
  await expect.poll(() => loadingFill(page), { timeout: 3000 }).toBe(1);
  await page.waitForURL("**/web", { timeout: 4000 });
});

test("[ SALTAR ] corta el túnel y abre en cuanto hay datos", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-cnt-number]")).not.toHaveText("00");
  await skip(page).click();
  await expect(page.locator("main[data-loading]")).toBeAttached();
  await page.waitForURL("**/web", { timeout: 4000 });
});

test("sin movimiento: sin túnel, solo la carga, y abre el Marketplace", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-tile]").first()).toBeHidden();
  await page.waitForURL("**/web", { timeout: 6000 });
});
