import { expect, type Page, test } from "@playwright/test";

const heroHeight = (page: Page) =>
  page.evaluate(() => document.getElementById("marcas")?.offsetHeight ?? 0);

const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

test.describe("00-shell", () => {
  test("quita is-loading y no deja el scroll bloqueado", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/is-loading/);
    await expect(page.locator("main#contenido section[data-section]")).toHaveCount(5);
  });

  test("snap del hero con la rueda (abajo y arriba)", async ({ page, isMobile }) => {
    test.skip(isMobile, "La rueda solo aplica en escritorio");
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/lenis/);
    const h = await heroHeight(page);

    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => scrollY(page), { timeout: 3000 }).toBeGreaterThanOrEqual(h - 2);

    await page.waitForTimeout(700); // enfriamiento del snap
    await page.mouse.wheel(0, -120);
    await expect.poll(() => scrollY(page), { timeout: 3000 }).toBeLessThanOrEqual(2);
  });

  test("una ráfaga de rueda (inercia de trackpad) no se pasa del snap", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "La rueda solo aplica en escritorio");
    await page.goto("/");
    const h = await heroHeight(page);
    await page.mouse.move(700, 400);
    // ~2 s de eventos con delta decreciente, como la inercia de un trackpad
    for (let i = 0; i < 60; i++) {
      await page.mouse.wheel(0, Math.max(2, Math.round(60 * 0.94 ** i)));
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(1500);
    expect(Math.abs((await scrollY(page)) - h)).toBeLessThanOrEqual(2);
  });

  test("AvPág desde el hero hace snap", async ({ page, isMobile }) => {
    test.skip(isMobile, "Teclado de escritorio");
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/lenis/); // hidratado
    const h = await heroHeight(page);
    await page.keyboard.press("PageDown");
    await expect.poll(() => scrollY(page), { timeout: 3000 }).toBeGreaterThanOrEqual(h - 2);
  });

  test("el snap sigue funcionando tras navegar en cliente desde la 404", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "La rueda solo aplica en escritorio");
    await page.goto("/no-existe");
    await page.getByRole("link", { name: /volver al inicio/i }).click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("#marcas")).toBeVisible();
    const h = await heroHeight(page);
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => scrollY(page), { timeout: 3000 }).toBeGreaterThanOrEqual(h - 2);
  });

  test("cursor propio: aparece y cambia a estado hero", async ({ page, isMobile }) => {
    test.skip(isMobile, "Sin puntero fino");
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/has-cursor/);
    await page.mouse.move(400, 300);
    await page.mouse.move(420, 320);
    await expect(page.locator(".cursor")).toHaveCSS("opacity", "1");
    await expect(page.locator(".cursor__label")).toHaveText("ARRASTRA");
  });

  test("sin cursor propio en táctil", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo móvil");
    await page.goto("/");
    await expect(page.locator(".cursor")).toHaveCount(0);
    await expect(page.locator("html")).not.toHaveClass(/has-cursor/);
  });

  test("movimiento reducido: sin Lenis ni cursor", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/is-loading/);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
    await expect(page.locator(".cursor")).toHaveCount(0);
    await context.close();
  });

  test("404 propia", async ({ page }) => {
    const res = await page.goto("/no-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "ESTA PÁGINA NO EXISTE" })).toBeVisible();
  });
});
