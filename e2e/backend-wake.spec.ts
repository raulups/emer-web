import { expect, type Page, test } from "@playwright/test";

const aviso = (page: Page) => page.locator("[data-wake]");
const dormido = { status: 502, json: { ok: false, total: null } };

test("Landing: con el backend dormido avisa, reintenta sola y abre al responder", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "en el móvil no hay Landing");
  let awake = false;
  let calls = 0;
  await page.route("**/api/warm", (route) => {
    calls++;
    return awake ? route.continue() : route.fulfill(dormido);
  });
  await page.goto("/");

  await expect(aviso(page)).toBeVisible();
  await expect(aviso(page).getByRole("heading", { name: "ANDAMOS JUSTOS" })).toBeVisible();
  await expect(aviso(page).getByRole("status")).toContainText("se está despertando");
  // El contador corre mientras tanto y las llamadas se repiten sin recargar.
  await expect(page.locator("[data-wake-counter]")).not.toHaveText("00:00");
  await expect.poll(() => calls, { timeout: 10_000 }).toBeGreaterThan(1);
  await expect(page).toHaveURL("/");

  awake = true;
  await expect(aviso(page)).toBeHidden({ timeout: 15_000 });
  await page.waitForURL("**/web", { timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Productos" })).toBeVisible();
});

test("Marketplace: un filtro con el backend dormido avisa y acaba cargando", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "el menú lateral es de escritorio");
  let awake = true;
  await page.route("**/api/products?**", (route) =>
    awake ? route.continue() : route.fulfill({ status: 502, json: { success: false } }),
  );
  await page.goto("/web");
  // Se duerme justo antes del clic: el «cargar más» del grid también enseñaría el aviso.
  const camisetas = page.getByRole("button", { name: /^Camisetas/ }).first();
  await camisetas.waitFor();
  awake = false;
  await camisetas.click();

  await expect(aviso(page)).toBeVisible();
  await expect(page.getByRole("alert").getByText("SIN CONEXIÓN")).toHaveCount(0);

  awake = true;
  await expect(aviso(page)).toBeHidden({ timeout: 15_000 });
  await expect(page.getByRole("region", { name: "Productos" })).toContainText("Camiseta");
});

test("un error que no es de backend dormido no se reintenta", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "el menú lateral es de escritorio");
  await page.route("**/api/products?**", (route) =>
    route.fulfill({ status: 500, json: { success: false, data: null, error: "x" } }),
  );
  await page.goto("/web");
  await page
    .getByRole("button", { name: /^Camisetas/ })
    .first()
    .click();
  await expect(
    page.getByRole("alert").getByRole("heading", { name: "SIN CONEXIÓN" }),
  ).toBeVisible();
  await expect(aviso(page)).toHaveCount(0);
});
