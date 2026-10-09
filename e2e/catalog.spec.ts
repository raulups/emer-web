import { expect, type Page, test } from "@playwright/test";

const catalog = (page: Page) => page.locator("#catalogo:not([aria-busy])");

async function toCatalog(page: Page) {
  await page.goto("/");
  await expect(page.locator("#marcas[data-registered]")).toBeAttached();
  // Emergentes fija su altura al hidratar y desplaza el catálogo: esperar a que se estabilice.
  await expect
    .poll(async () => {
      const top = await catalog(page).evaluate((el) => (el as HTMLElement).offsetTop);
      await page.waitForTimeout(250);
      return top === (await catalog(page).evaluate((el) => (el as HTMLElement).offsetTop));
    })
    .toBe(true);
  await catalog(page).evaluate((el) => el.scrollIntoView());
  // Revelado: 1.1s + escalonado de 45ms por celda.
  await page.waitForTimeout(2000);
}

test.describe("05-catalogo", () => {
  test("cabecera y una celda por marca, con enlace a su tienda", async ({ page }) => {
    await toCatalog(page);
    await expect(catalog(page).getByRole("heading", { name: /todas las marcas/i })).toBeVisible();
    const cells = catalog(page).getByRole("link", { name: /se abre en una pestaña nueva/ });
    await expect(cells).toHaveCount(8);
    await expect(cells.first()).toHaveAttribute("href", "https://satenier.example/");
  });

  test("«Saltar el catálogo» lleva a la siguiente sección", async ({ page }) => {
    await toCatalog(page);
    await expect(catalog(page).getByRole("link", { name: "Saltar el catálogo" })).toHaveAttribute(
      "href",
      "#marketplace",
    );
  });

  test("las celdas se revelan al entrar en pantalla", async ({ page }) => {
    await toCatalog(page);
    const reveal = catalog(page).locator("[data-reveal]").nth(3);
    await expect(reveal).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  });

  test("hover: la celda se expande y muestra nombre y VER MARCA", async ({ page, isMobile }) => {
    test.skip(isMobile, "Sin hover en móvil");
    await toCatalog(page);
    const cell = catalog(page).getByRole("link", { name: /^Scuffers/ });
    const before = (await cell.boundingBox())?.width ?? 0;
    await cell.hover();
    await page.waitForTimeout(1200);
    const after = (await cell.boundingBox())?.width ?? 0;
    expect(after).toBeGreaterThan(before * 1.3);
    await expect(cell.getByText("VER MARCA")).toHaveCSS("opacity", "1");
  });

  test("móvil: dos celdas por fila", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Solo móvil");
    await toCatalog(page);
    const width = page.viewportSize()?.width ?? 0;
    const cell = catalog(page).locator("[data-cell]").first();
    const box = await cell.boundingBox();
    expect(box?.width ?? 0).toBeLessThan(width / 2 + 2);
    expect(box?.width ?? 0).toBeGreaterThan(width / 2 - 4);
  });

  test("movimiento reducido: sin expansión en hover", async ({ browser, isMobile }) => {
    test.skip(isMobile, "Crea su propio contexto de escritorio");
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await toCatalog(page);
    const cell = catalog(page).getByRole("link", { name: /^Scuffers/ });
    const before = (await cell.boundingBox())?.width ?? 0;
    await cell.hover();
    await page.waitForTimeout(600);
    expect(Math.abs(((await cell.boundingBox())?.width ?? 0) - before)).toBeLessThan(2);
    await context.close();
  });
});
