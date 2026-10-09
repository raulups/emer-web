import { expect, type Page, test } from "@playwright/test";

/**
 * 03-hero con los datos de ejemplo (src/lib/api/fixtures.ts):
 * Satenier, Scuffers, Nocturna, Imagen Rota (imagen que falla), Bajo Cero (sin productos), Solar Club.
 */

/** El HTML trae primero el hueco de carga (aria-busy) y luego el hero real por streaming. */
const hero = (page: Page) => page.locator("#marcas:not([aria-busy])");
const heroName = (page: Page) => hero(page).locator("[data-hero-name]");
const segments = (page: Page) =>
  hero(page).getByRole("navigation", { name: "Marcas" }).getByRole("button");

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/is-loading/);
  await expect(heroName(page)).toHaveText(/^satenier$/i);
  await expect(hero(page)).toHaveAttribute("data-registered", ""); // hidratado
}

test.describe("03-hero", () => {
  test("pinta la primera marca con sus productos", async ({ page }) => {
    await ready(page);
    await expect(segments(page).first()).toHaveAttribute("aria-current", "true");
    await expect(hero(page).locator("[data-hero-tile-img]")).toHaveCount(3);
    await expect(hero(page).getByRole("link", { name: /VER TODO/ })).toBeVisible();
    await expect(hero(page).getByRole("link", { name: /IR A LA TIENDA/ })).toHaveAttribute(
      "href",
      "https://satenier.example/",
    );
  });

  test("los segmentos y ←/→ cambian de marca", async ({ page, isMobile }) => {
    await ready(page);
    await segments(page).nth(1).click();
    await expect(heroName(page)).toHaveText(/^scuffers$/i);
    await expect(segments(page).nth(1)).toHaveAttribute("aria-current", "true");
    test.skip(isMobile, "Teclado de escritorio");
    await page.keyboard.press("ArrowRight");
    await expect(heroName(page)).toHaveText(/^nocturna$/i);
    await page.keyboard.press("ArrowLeft");
    await expect(heroName(page)).toHaveText(/^scuffers$/i);
  });

  test("descarta la marca cuya imagen falla", async ({ page }) => {
    await ready(page);
    await expect(segments(page)).toHaveCount(6);
    await segments(page).nth(2).click(); // Nocturna: precarga la siguiente (Imagen Rota), que falla
    await expect(segments(page)).toHaveCount(5);
    await expect(hero(page).getByRole("button", { name: "Ir a Imagen Rota" })).toHaveCount(0);
  });

  test("marca sin productos muestra el estado vacío", async ({ page }) => {
    await ready(page);
    await hero(page).getByRole("button", { name: "Ir a Bajo Cero" }).click();
    await expect(heroName(page)).toHaveText(/^bajo cero$/i);
    await expect(hero(page).getByText("Sus prendas aún no están en Emer.")).toBeVisible();
    await expect(hero(page).locator("[data-hero-tile-img]")).toHaveCount(0);
  });

  test("popup del producto al pasar el ratón", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover de escritorio");
    await ready(page);
    await hero(page).locator("[data-hero-tile-img]").first().hover();
    const popup = hero(page).locator('[aria-hidden="true"]', { hasText: "VER EN SU WEB" });
    await expect(popup).toHaveCSS("opacity", "1");
    await expect(popup).toContainText("Camiseta Ascii verde");
    await expect(popup).toContainText("34 €");
  });

  test("Esc cierra el popup", async ({ page, isMobile }) => {
    test.skip(isMobile, "Teclado de escritorio");
    await ready(page);
    await page.mouse.move(10, 10);
    await hero(page).locator("a[data-cursor=prod]").first().focus();
    const popup = hero(page).locator("[data-hero-pop]");
    await expect(popup).toHaveCSS("opacity", "1");
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCSS("opacity", "0");
  });

  test("en táctil, el primer toque abre el popup sin navegar", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo móvil");
    await ready(page);
    const tile = hero(page).locator("a[data-cursor=prod]").first();
    await tile.tap();
    const popup = hero(page).locator('[aria-hidden="true"]', { hasText: "VER EN SU WEB" });
    await expect(popup).toHaveCSS("opacity", "1");
    await expect(page).toHaveURL("/");
  });

  test("arrastrar hacia la izquierda pasa a la siguiente marca", async ({ page, isMobile }) => {
    test.skip(isMobile, "Arrastre con ratón");
    await ready(page);
    await page.mouse.move(700, 300);
    await page.mouse.down();
    await page.mouse.move(600, 305, { steps: 5 });
    await page.mouse.move(500, 310, { steps: 5 });
    await page.mouse.up();
    await expect(heroName(page)).toHaveText(/^scuffers$/i);
  });

  test("autoplay: cambia de marca a los 7 s", async ({ page }) => {
    test.slow();
    await ready(page);
    await expect(heroName(page)).toHaveText(/^scuffers$/i, { timeout: 9_000 });
  });

  test("autoplay en pausa con el ratón encima", async ({ page, isMobile }) => {
    test.skip(isMobile, "Hover de escritorio");
    test.slow();
    await ready(page);
    await page.mouse.move(700, 300);
    await page.waitForTimeout(8_000);
    await expect(heroName(page)).toHaveText(/^satenier$/i);
  });

  test("movimiento reducido: sin autoplay y segmento activo lleno", async ({ browser }) => {
    test.slow();
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await ready(page);
    const fill = segments(page).first().locator("span > span");
    await expect(fill).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await page.waitForTimeout(8_000);
    await expect(heroName(page)).toHaveText(/^satenier$/i);
    await context.close();
  });

  test("BUSCAR emite la apertura del buscador sin errores", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await ready(page);
    await hero(page)
      .getByRole("button", { name: /BUSCAR/ })
      .click();
    expect(errors).toEqual([]);
  });
});
