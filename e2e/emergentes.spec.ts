import { expect, type Page, test } from "@playwright/test";

/** Emergentes en los datos de ejemplo: Satenier, Nocturna, Bajo Cero (sin productos), Ruido. */
const section = (page: Page) => page.locator("#emergentes");
const popup = (page: Page) => section(page).locator("#em-pop");

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("#marcas[data-registered]")).toBeAttached();
  await expect(section(page)).toBeAttached();
}

/** Desplaza a una fracción del recorrido (0 = inicio fijado, 1 = final). */
async function scrollTrack(page: Page, fraction: number) {
  await page.evaluate((f) => {
    const el = document.getElementById("emergentes");
    if (!el) return;
    const vh = window.innerHeight;
    window.scrollTo(0, el.offsetTop + f * Math.max(0, el.offsetHeight - vh));
  }, fraction);
  await page.waitForTimeout(1400);
}

test.describe("04-emergentes", () => {
  test("paneles con nombre y fecha de alta", async ({ page }) => {
    await ready(page);
    await expect(section(page).getByRole("heading", { level: 3 })).toHaveCount(4);
    await expect(section(page).getByRole("heading", { level: 3 }).first()).toHaveText("Satenier");
    await expect(section(page).locator("time").first()).toHaveText("01.09.26");
  });

  test("el scroll vertical mueve el recorrido y el contador", async ({ page, isMobile }) => {
    test.skip(isMobile, "Recorrido de escritorio");
    await ready(page);
    await scrollTrack(page, 0);
    await expect(section(page).getByText("01 / 04")).toBeVisible();
    await scrollTrack(page, 0.95);
    await expect(section(page).getByText("04 / 04")).toBeVisible();
    const x = await section(page)
      .locator("article")
      .first()
      .evaluate((el) => el.getBoundingClientRect().left);
    expect(x).toBeLessThan(0);
  });

  test("hover en un panel abre el popup con sus prendas", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover de escritorio");
    await ready(page);
    await scrollTrack(page, 0.35);
    const panel = section(page).locator("article").nth(1);
    await panel.hover();
    await expect(popup(page)).toHaveCSS("opacity", "1");
    await expect(popup(page)).toContainText("Chaqueta acolchada");
    await expect(popup(page)).toContainText("149 €");
    await page.mouse.move(5, 5);
    await expect(popup(page)).toHaveCSS("opacity", "0", { timeout: 3000 });
  });

  test("marca sin prendas: mensaje de catálogo pendiente", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover de escritorio");
    await ready(page);
    await scrollTrack(page, 0.6);
    await section(page)
      .getByRole("button", { name: /Bajo Cero/ })
      .focus();
    await expect(popup(page)).toContainText("Su catálogo llega pronto");
  });

  test("teclado: Enter lleva al CTA del popup y Esc vuelve al panel", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Teclado de escritorio");
    await ready(page);
    await scrollTrack(page, 0);
    const hit = section(page).getByRole("button", { name: /Satenier/ });
    await hit.focus();
    await hit.press("Enter");
    await expect(popup(page).getByRole("link", { name: /IR A LA TIENDA/ })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(hit).toBeFocused();
    await expect(hit).toHaveAttribute("aria-expanded", "false");
  });

  test("teclado: Tab desde el popup pasa al siguiente panel, que entra en pantalla", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "Teclado de escritorio");
    await ready(page);
    await scrollTrack(page, 0);
    const hit = section(page).getByRole("button", { name: /Satenier/ });
    await hit.focus();
    await hit.press("Enter");
    await page.keyboard.press("Tab");
    const next = section(page).getByRole("button", { name: /Nocturna/ });
    await expect(next).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const last = section(page).getByRole("button", { name: /Ruido/ });
    await expect(last).toBeFocused();
    await page.waitForTimeout(1400);
    const box = await last.boundingBox();
    const width = page.viewportSize()?.width ?? 0;
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
  });

  test("Esc cierra el popup abierto con hover", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover de escritorio");
    await ready(page);
    await scrollTrack(page, 0.35);
    await section(page).locator("article").nth(1).hover();
    await expect(popup(page)).toHaveCSS("opacity", "1");
    await page.keyboard.press("Escape");
    await expect(popup(page)).toHaveCSS("opacity", "0", { timeout: 3000 });
  });

  test("táctil: un toque abre el popup y otro fuera lo cierra", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo móvil");
    await ready(page);
    await scrollTrack(page, 0.2);
    const hit = section(page)
      .getByRole("button", { name: /ver sus prendas/ })
      .first();
    await hit.tap();
    await expect(hit).toHaveAttribute("aria-expanded", "true");
    await page.touchscreen.tap(30, 120); // fuera de paneles y popup
    await expect(hit).toHaveAttribute("aria-expanded", "false");
  });

  test("movimiento reducido: fila con scroll horizontal nativo", async ({ browser, isMobile }) => {
    test.skip(isMobile, "Crea su propio contexto de escritorio");
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await ready(page);
    await expect(section(page)).toHaveAttribute("data-mode", "reduced");
    const overflow = await section(page)
      .locator("article")
      .first()
      .evaluate((el) => getComputedStyle(el.parentElement as Element).overflowX);
    expect(overflow).toBe("auto");
    await context.close();
  });
});
