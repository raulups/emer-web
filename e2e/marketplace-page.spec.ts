import { expect, type Page, test } from "@playwright/test";

/**
 * 10-marketplace (página /marketplace) con los datos de ejemplo (src/lib/api/fixtures.ts):
 * 68 piezas, 24 por página, 8 marcas (Satenier con logo, Scuffers con logo roto, Bajo Cero sin piezas),
 * categorías Camisetas, Sudaderas, Pantalones, Zapatillas, Botas (0) y Gorras.
 */

const FAIL_BRAND = "00000000-0000-4000-8000-0000000000ee";

const cards = (page: Page) => page.getByTestId("mk-card");
const count = (page: Page) => page.getByTestId("mk-count");
const detail = (page: Page) => page.getByTestId("mk-detail");
const cats = (page: Page) => page.getByTestId("mk-cats");

async function ready(page: Page, url = "/marketplace") {
  await page.goto(url);
  await expect(page.locator("html")).not.toHaveClass(/is-loading/);
  await expect(page.locator("[data-loading]")).toHaveCount(0); // ya no queda el hueco de carga
  await expect(count(page)).toHaveText(/\d+ PIEZAS?/);
}

const perRow = (page: Page) =>
  cards(page).evaluateAll((els) => {
    // offsetTop ignora el translateY de la entrada escalonada.
    const tops = els.map((e) => (e.parentElement as HTMLElement).offsetTop);
    return tops.filter((t) => t === tops[0]).length;
  });

const prices = (page: Page) =>
  cards(page).evaluateAll((els) =>
    els.flatMap((e) => {
      const text = e.querySelector("b")?.textContent ?? "";
      const m = /[\d.,]+/.exec(text);
      return m ? [Number.parseFloat(m[0].replace(",", "."))] : [];
    }),
  );

test.describe("10-marketplace", () => {
  test("pinta la primera página y carga más al llegar al final", async ({ page }) => {
    await ready(page);
    await expect(count(page)).toHaveText("68 PIEZAS");
    await expect(cards(page)).toHaveCount(24);
    await expect(page.getByRole("heading", { level: 1, name: "Marketplace" })).toHaveCount(1);
    await expect
      .poll(
        async () => {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          return cards(page).count();
        },
        { timeout: 20_000 },
      )
      .toBe(68);
  });

  test("las cards son visibles aunque la pestaña esté en segundo plano", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    });
    await ready(page);
    await page.waitForTimeout(1400);
    const opacities = await cards(page).evaluateAll((els) =>
      els.slice(0, 24).map((e) => getComputedStyle(e.parentElement as Element).opacity),
    );
    expect(opacities.every((o) => o === "1")).toBe(true);
  });

  test("VISTA cambia las columnas (solo CSS) y queda en la URL", async ({ page, isMobile }) => {
    test.skip(isMobile, "VISTA no se muestra en móvil");
    await page.setViewportSize({ width: 1440, height: 900 });
    await ready(page);
    expect(await perRow(page)).toBe(4);
    await page.getByTestId("mk-view-6").click();
    await expect.poll(() => perRow(page)).toBe(6);
    expect(page.url()).toContain("vista=6");
    await page.getByTestId("mk-view-2").click();
    await expect.poll(() => perRow(page)).toBe(2);
  });

  test("anchos: 924 px → 4 columnas, 375 px → 2", async ({ page, isMobile }) => {
    test.skip(isMobile, "Se fija el ancho a mano");
    await page.setViewportSize({ width: 924, height: 900 });
    await ready(page);
    expect(await perRow(page)).toBe(4);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(() => perRow(page)).toBe(2);
  });

  test("una subcategoría filtra, cuenta y queda en la URL; Botas está deshabilitada", async ({
    page,
  }) => {
    await ready(page);
    await expect(cats(page).getByRole("button", { name: /BOTAS/ })).toBeDisabled();
    const camisetas = cats(page).getByRole("button", { name: /CAMISETAS/ });
    await camisetas.click();
    await expect(camisetas).toHaveAttribute("aria-pressed", "true");
    await expect(count(page)).toHaveText("15 PIEZAS");
    expect(page.url()).toContain("cat=");
    await expect(page.getByTestId("mk-chips")).toContainText("CAMISETAS");
    await page
      .getByTestId("mk-chips")
      .getByRole("button", { name: /BORRAR TODO/ })
      .click();
    await expect(count(page)).toHaveText("68 PIEZAS");
    expect(page.url()).not.toContain("cat=");
  });

  test("hover en categoría: negrita sin salto de ancho", async ({ page, isMobile }) => {
    test.skip(isMobile, "Sin hover");
    await ready(page);
    const btn = cats(page).getByRole("button", { name: /SUDADERAS/ });
    const w0 = (await btn.boundingBox())?.width ?? 0;
    await btn.hover();
    await page.waitForTimeout(500);
    const weight = await btn
      .locator("span")
      .nth(1)
      .evaluate((e) => getComputedStyle(e).fontWeight);
    expect(Number(weight)).toBeGreaterThanOrEqual(600);
    expect(Math.abs(((await btn.boundingBox())?.width ?? 0) - w0)).toBeLessThan(0.6);
  });

  test("OFERTAS deja solo piezas con etiqueta de descuento", async ({ page }) => {
    await ready(page);
    await page.getByTestId("mk-sale").click();
    await expect(page.getByTestId("mk-chips")).toContainText("EN OFERTA");
    await expect(page.getByTestId("mk-sale")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => count(page).innerText()).not.toBe("68 PIEZAS");
    const all = await cards(page).evaluateAll((els) =>
      els.every((e) => /−\d+%/.test(e.textContent ?? "")),
    );
    expect(all).toBe(true);
  });

  test("FILTROS: marcas y precio; solo hay un panel abierto", async ({ page }) => {
    await ready(page);
    await page.getByTestId("mk-sort-toggle").click();
    await page.getByTestId("mk-filters-toggle").click();
    await expect(page.getByTestId("mk-filters-toggle")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("mk-sort-toggle")).toHaveAttribute("aria-expanded", "false");
    const brands = page.getByTestId("mk-brand");
    await expect(brands).toHaveCount(8);
    await brands.nth(0).click();
    await brands.nth(1).click();
    await expect(page.getByTestId("mk-filters")).toContainText("02 ELEGIDAS");
    await expect(page.getByTestId("mk-filters-toggle")).toContainText("FILTROS (2)");
    await expect(count(page)).toHaveText(/^\d+ PIEZAS$/);
    expect(page.url()).toContain("marcas=");
    await page.getByRole("checkbox", { name: /30–60/ }).click();
    await expect
      .poll(async () => {
        const list = await prices(page);
        return list.length > 0 && list.every((n) => n > 30 && n <= 60);
      })
      .toBe(true);
    await page.getByTestId("mk-filters-apply").click();
    await expect(page.getByTestId("mk-filters-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  test("el logo roto cae al nombre y el que carga se ve", async ({ page }) => {
    await ready(page);
    await page.getByTestId("mk-filters-toggle").click();
    const brands = page.getByTestId("mk-brand");
    await expect(brands.nth(0).locator("img")).toBeVisible(); // Satenier
    await expect(brands.nth(1).locator("img")).toHaveCount(0); // Scuffers: logo roto
    await expect(brands.nth(1)).toContainText("SCUFFERS");
  });

  test("ORDENAR por precio ascendente y descendente", async ({ page }) => {
    await ready(page);
    await page.getByTestId("mk-sort-toggle").click();
    await page.getByRole("radio", { name: /MENOR A MAYOR/ }).click();
    await expect(page.getByTestId("mk-sort-toggle")).toContainText("↑ PRECIO");
    await expect.poll(async () => (await prices(page))[0]).toBeLessThan(20);
    const asc = await prices(page);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    await page.getByTestId("mk-sort-toggle").click();
    await page.getByRole("radio", { name: /MAYOR A MENOR/ }).click();
    await expect.poll(async () => (await prices(page))[0]).toBeGreaterThan(100);
    const desc = await prices(page);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  test("ORDENAR por marca A–Z agrupa por marca en orden alfabético", async ({ page }) => {
    await ready(page, "/marketplace?orden=az");
    const brandNames = await cards(page).evaluateAll((els) =>
      els.map((e) => e.querySelector("p")?.textContent ?? ""),
    );
    expect(brandNames.length).toBeGreaterThan(10);
    expect(brandNames).toEqual([...brandNames].sort((a, b) => a.localeCompare(b, "es")));
  });

  test("galería: hover cambia de foto y las flechas no abren la ficha", async ({
    page,
    isMobile,
  }) => {
    await ready(page);
    const card = cards(page).first();
    if (!isMobile) {
      await card.hover();
      await page.waitForTimeout(700);
      await expect(card.locator("img").nth(1)).toHaveCSS("opacity", "1");
    }
    await card.getByTestId("mk-card-next").click({ force: true });
    await expect(detail(page)).toBeHidden();
    expect(page.url()).not.toContain("pieza=");
  });

  test("ficha: abrir, ←/→, MÁS DE…, ESC y devolver el foco", async ({ page, isMobile }) => {
    await ready(page);
    const first = cards(page).first().getByRole("link");
    await first.click();
    await expect(detail(page)).toBeVisible();
    expect(page.url()).toContain("pieza=");
    await expect(detail(page)).toHaveAttribute("aria-modal", "true");
    await expect(detail(page).getByRole("heading", { level: 2 })).toHaveText("SATENIER");
    await expect(detail(page)).toContainText("001 / 068");
    await expect(detail(page).getByRole("link", { name: /COMPRAR EN SU WEB/ })).toHaveAttribute(
      "href",
      /\.example\/products\//,
    );
    await expect(page.locator("html")).toHaveAttribute("data-scroll-locked", "");
    if (!isMobile) {
      await page.keyboard.press("ArrowRight");
      await expect(detail(page)).toContainText("002 / 068");
    }
    await page.keyboard.press("Escape");
    await expect(detail(page)).toBeHidden();
    expect(page.url()).not.toContain("pieza=");
    await expect(page.locator("html")).not.toHaveAttribute("data-scroll-locked", "");
    await expect(first).toBeFocused();
  });

  test("ficha: «TODO DE …» filtra por esa marca", async ({ page }) => {
    await ready(page);
    await cards(page).first().getByRole("link").click();
    await detail(page)
      .getByRole("button", { name: /TODO DE SATENIER/ })
      .click();
    await expect(detail(page)).toBeHidden();
    await expect(page.getByTestId("mk-chips")).toContainText("MARCA · SATENIER");
    expect(page.url()).toContain("marcas=");
  });

  test("el estado llega desde la URL y una pieza se abre por enlace directo", async ({ page }) => {
    await ready(page, "/marketplace?orden=asc&vista=2&oferta=1");
    await expect(page.getByTestId("mk-sale")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("mk-sort-toggle")).toContainText("↑ PRECIO");
    await ready(page);
    const href = await cards(page).first().getByRole("link").getAttribute("href");
    await ready(page, href ?? "/marketplace");
    await expect(detail(page)).toBeVisible();
    await expect(detail(page).getByRole("heading", { level: 2 })).toHaveText("SATENIER");
  });

  test("sin resultados: «NADA POR AQUÍ» y BORRAR FILTROS lo restablece", async ({ page }) => {
    // Bajo Cero no tiene piezas.
    await ready(page);
    await page.getByTestId("mk-filters-toggle").click();
    await page.getByTestId("mk-brand").nth(4).click();
    await expect(page.getByTestId("mk-empty")).toContainText("NADA POR AQUÍ");
    await expect(page.getByTestId("mk-empty")).toContainText(
      "Ninguna prenda cumple estos filtros.",
    );
    await expect(count(page)).toHaveText("0 PIEZAS");
    await page
      .getByTestId("mk-empty")
      .getByRole("button", { name: /BORRAR FILTROS/i })
      .click();
    await expect(count(page)).toHaveText("68 PIEZAS");
  });

  test("error del backend: aviso con REINTENTAR", async ({ page }) => {
    await page.goto(`/marketplace?marcas=${FAIL_BRAND}`);
    await expect(page.getByTestId("mk-empty")).toContainText("No hemos podido cargar las prendas.");
    await expect(
      page.getByTestId("mk-empty").getByRole("button", { name: /REINTENTAR/i }),
    ).toBeVisible();
  });

  test("BUSCAR abre el buscador y ← INICIO vuelve a la home", async ({ page }) => {
    await ready(page);
    await page.getByTestId("mk-search").click();
    await expect(page.getByRole("dialog", { name: "Buscar marcas" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Buscar marcas" })).toHaveCount(0, {
      timeout: 3000,
    });
    await page.getByRole("link", { name: /INICIO/ }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("movimiento reducido: cards visibles, sin transformaciones", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await ready(page);
    const tr = await cards(page)
      .first()
      .evaluate((e) => getComputedStyle(e.parentElement as Element).transform);
    expect(tr === "none" || tr === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
    await cards(page).first().getByRole("link").click();
    await expect(detail(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(detail(page)).toBeHidden();
  });
});
