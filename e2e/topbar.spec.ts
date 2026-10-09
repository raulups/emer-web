import { expect, type Page, test } from "@playwright/test";

const header = (page: Page) => page.locator("header.topbar");
const hint = (page: Page) => page.locator('div[aria-hidden="true"].fixed', { hasText: "MENÚ" });

/** Posición vertical del header: 0 = visible, ≈ -61 = oculto. */
const headerTop = (page: Page) =>
  header(page).evaluate((el) => Math.round(el.getBoundingClientRect().top));

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("#marcas[data-registered]")).toBeAttached();
  await expect(page.locator("html")).toHaveClass(/lenis|^(?!.*is-loading)/);
}

async function pastHero(page: Page) {
  await page.mouse.move(700, 400);
  await page.mouse.wheel(0, 120);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 })
    .toBeGreaterThan(800);
  await page.waitForTimeout(800);
}

test.describe("02-topbar", () => {
  test("en el hero: header oculto y sin línea de progreso", async ({ page }) => {
    await ready(page);
    expect(await headerTop(page)).toBeLessThan(-50);
    await expect(hint(page)).toHaveCSS("opacity", "0");
  });

  test("pasado el hero: aparece la línea con la sección actual", async ({ page, isMobile }) => {
    test.skip(isMobile, "Rueda de escritorio");
    await ready(page);
    await pastHero(page);
    await expect(hint(page)).toHaveCSS("opacity", "1");
    await expect(hint(page)).toContainText("EMERGENTES");
    expect(await headerTop(page)).toBeLessThan(-50);
  });

  test("el cursor arriba revela el header y abajo lo oculta", async ({ page, isMobile }) => {
    test.skip(isMobile, "Puntero fino");
    await ready(page);
    await pastHero(page);
    await page.mouse.move(700, 20);
    await expect.poll(() => headerTop(page)).toBe(0);
    await expect(hint(page)).toHaveCSS("opacity", "0");
    await page.mouse.move(700, 70); // histéresis: entre 56 y 96 sigue abierto
    await page.waitForTimeout(300);
    expect(await headerTop(page)).toBe(0);
    await page.mouse.move(700, 400);
    await expect.poll(() => headerTop(page)).toBeLessThan(-50);
  });

  test("tras hacer clic en la nav, el header se cierra al bajar el cursor", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "La nav solo existe desde 860px");
    await ready(page);
    await pastHero(page);
    await page.mouse.move(700, 20);
    await expect.poll(() => headerTop(page)).toBe(0);
    await header(page)
      .getByRole("link", { name: /MARKETPLACE/ })
      .click();
    await page.waitForTimeout(1500);
    await page.mouse.move(700, 500);
    await expect.poll(() => headerTop(page)).toBeLessThan(-50);
  });

  test("dentro del hero el header no aparece", async ({ page, isMobile }) => {
    test.skip(isMobile, "Puntero fino");
    await ready(page);
    await page.mouse.move(700, 20);
    await page.waitForTimeout(700);
    expect(await headerTop(page)).toBeLessThan(-50);
  });

  test("la nav lleva a la sección y la marca como activa", async ({ page, isMobile }) => {
    test.skip(isMobile, "La nav solo existe desde 860px");
    await ready(page);
    await pastHero(page);
    await page.mouse.move(700, 20);
    await expect.poll(() => headerTop(page)).toBe(0);
    await header(page)
      .getByRole("link", { name: /CATÁLOGO/ })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => document.getElementById("catalogo")?.getBoundingClientRect().top),
      )
      .toBeLessThan(100);
    await expect(header(page).getByRole("link", { name: /CATÁLOGO/ })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  test("tabular dentro del header lo abre (nunca foco invisible)", async ({ page, isMobile }) => {
    test.skip(isMobile, "Teclado de escritorio");
    await ready(page);
    await page.keyboard.press("Tab"); // Saltar al contenido
    await page.keyboard.press("Tab"); // logo
    await expect(header(page).getByRole("link", { name: /volver arriba/ })).toBeFocused();
    await expect.poll(() => headerTop(page)).toBe(0);
  });

  test("táctil: el scroll hacia arriba revela el header", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo móvil");
    await ready(page);
    await page.evaluate(() => window.scrollTo(0, 2600));
    await page.waitForTimeout(500);
    expect(await headerTop(page)).toBeLessThan(-50);
    await page.evaluate(() => window.scrollTo(0, 2000));
    await expect.poll(() => headerTop(page)).toBe(0);
  });

  test("movimiento reducido: el header aparece solo con opacidad", async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, "Crea su propio contexto de escritorio: se cubre en el proyecto desktop");
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await ready(page);
    await page.evaluate(() => window.scrollTo(0, 1200));
    await page.mouse.move(700, 20);
    await expect(header(page)).toHaveCSS("opacity", "1");
    expect(await headerTop(page)).toBe(0);
    await page.mouse.move(700, 400);
    await expect(header(page)).toHaveCSS("opacity", "0");
    await context.close();
  });
});
