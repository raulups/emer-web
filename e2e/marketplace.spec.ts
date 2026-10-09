import { expect, type Page, test } from "@playwright/test";

const section = (page: Page) => page.locator("#marketplace:not([aria-busy])");
const cards = (page: Page) => section(page).locator("a[data-cursor='prod']");
const ring = (page: Page) => section(page).locator("[data-ring='0']");

async function toMarketplace(page: Page) {
  await page.goto("/");
  await expect(page.locator("#marcas[data-registered]")).toBeAttached();
  await section(page).evaluate((el) => el.scrollIntoView());
  await page.waitForTimeout(1200);
}

const ringAngle = (page: Page) =>
  ring(page).evaluate((el) =>
    Number(/rotateY\(([-\d.e]+)deg\)/.exec(el.style.transform)?.[1] ?? 0),
  );

test.describe("06-marketplace", () => {
  test("dos anillos de 18 tarjetas con enlace a la prenda", async ({ page }) => {
    await toMarketplace(page);
    await expect(section(page).getByRole("heading", { level: 2 })).toHaveText(
      /todas las\s*prendas/i,
    );
    await expect(cards(page)).toHaveCount(36);
    await expect(cards(page).first()).toHaveAttribute("href", /\.example\/products\//);
    await expect(cards(page).first()).toHaveAttribute("target", "_blank");
  });

  test("gira solo en reposo; la rueda lo acelera con el escenario centrado", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Rueda de escritorio");
    await toMarketplace(page);
    const a0 = await ringAngle(page);
    await page.waitForTimeout(600);
    expect(await ringAngle(page)).toBeGreaterThan(a0);

    // Sin centrar: la rueda baja la página.
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("sin viewport");
    await page.mouse.move(viewport.width / 2, viewport.height - 40);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(900);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);

    // Al llegar al centro, la rueda deja de bajar la página y pasa a girar el carrusel.
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(900);
    const y1 = await page.evaluate(() => window.scrollY);
    const b0 = await ringAngle(page);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, 200);
    await page.waitForTimeout(500);
    expect((await ringAngle(page)) - b0).toBeGreaterThan(10);
    expect(await page.evaluate(() => window.scrollY)).toBe(y1);
  });

  test("«Pausar giro» detiene el giro automático", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escritorio");
    await toMarketplace(page);
    const pause = section(page).getByRole("button", { name: "Pausar giro" });
    await pause.click();
    await expect(section(page).getByRole("button", { name: "Reanudar giro" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.mouse.move(5, 5);
    await page.waitForTimeout(2500);
    const a0 = await ringAngle(page);
    await page.waitForTimeout(600);
    expect(Math.abs((await ringAngle(page)) - a0)).toBeLessThan(0.05);
  });

  test("hover en una tarjeta abre el popup con marca y categoría", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover de escritorio");
    await toMarketplace(page);
    const box = await ring(page).boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error("sin anillo");
    await page.mouse.move(viewport.width / 2, box.y + 150);
    const open = section(page)
      .locator("[data-open][class*='pop_'], [data-open][class*='pop']")
      .last();
    await expect(open).toBeAttached();
    await expect(open).toContainText("CAMISETAS");
    await expect(open).toContainText("IR A LA TIENDA");
    await page.mouse.move(5, 5);
    await expect(section(page).locator("[data-open]")).toHaveCount(0, { timeout: 3000 });
  });

  test("teclado: la tarjeta enfocada gira hasta quedar de frente", async ({ page, isMobile }) => {
    test.skip(isMobile, "Teclado de escritorio");
    await toMarketplace(page);
    await section(page).getByRole("button", { name: "Girar hacia la derecha" }).focus();
    for (let i = 0; i < 9; i++) await page.keyboard.press("Tab");
    const focused = cards(page).nth(8);
    await expect(focused).toBeFocused();
    await page.waitForTimeout(1500);
    await expect(focused).toHaveCSS("opacity", "1");
    const box = await focused.boundingBox();
    const width = page.viewportSize()?.width ?? 0;
    const center = (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(Math.abs(center - width / 2)).toBeLessThan(width * 0.1);
    await expect(section(page).locator("[data-open]").first()).toBeAttached();
  });

  test("táctil: el primer toque abre el popup sin navegar", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo móvil");
    await toMarketplace(page);
    const box = await ring(page).boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error("sin anillo");
    const url = page.url();
    await page.touchscreen.tap(viewport.width / 2, box.y + 120);
    await expect(section(page).locator("[data-open]").first()).toBeAttached();
    expect(page.url()).toBe(url);
    expect(page.context().pages()).toHaveLength(1);
  });

  test("movimiento reducido: filas planas con scroll horizontal nativo", async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, "Crea su propio contexto de escritorio");
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await toMarketplace(page);
    await expect(section(page)).toHaveAttribute("data-mode", "reduced");
    await expect(ring(page)).toHaveCSS("overflow-x", "auto");
    await expect(ring(page)).toHaveCSS("transform", "none");
    await context.close();
  });
});
