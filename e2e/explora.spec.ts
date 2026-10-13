import { expect, type Page, test } from "@playwright/test";

/** Fixtures: las 6 marcas con más piezas, de más a menos. */
const POPULAR = ["Satenier", "Scuffers", "Nocturna", "Solar Club", "Ruido", "Calma"];

async function openExplora(page: Page) {
  await page.goto("/web");
  await page.getByRole("button", { name: "Explora" }).click();
  await expect(page.locator("[data-intro]")).toBeVisible();
}

const geometry = (page: Page) =>
  page.evaluate(() => {
    const top = (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(selector);
      return { top: el.getBoundingClientRect().top + window.scrollY, height: el.offsetHeight };
    };
    return { intro: top("[data-intro]"), pop: top("[data-pop]"), vh: window.innerHeight };
  });

const counter = (page: Page) =>
  page.getByRole("region", { name: "Marcas populares" }).locator("p[aria-live]");
const wordX = (page: Page, index: number) =>
  page
    .locator("[data-pw]")
    .nth(index)
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);

test.beforeEach(({ page: _page }, info) => {
  test.skip(info.project.name === "mobile", "el diseño de Explora es de escritorio");
});

test("intro: las palabras suben en escalera y se alinean al cruzar el centro", async ({ page }) => {
  await openExplora(page);
  // Empiezan bajo el pliegue y desplazadas a la derecha.
  await expect.poll(() => wordX(page, 0)).toBeGreaterThan(100);

  const g = await geometry(page);
  // RES termina a la altura de MARCAS (centrada): ahí todas las palabras tienen translateX 0.
  await page.evaluate((y) => window.scrollTo(0, y), g.intro.top + g.intro.height - g.vh / 2 - 60);
  await expect.poll(() => wordX(page, 0), { timeout: 4000 }).toBeLessThan(2);
  await expect.poll(() => wordX(page, 3), { timeout: 4000 }).toBeLessThan(2);
});

test("Populares: nombres, descripción, 2 piezas y contador de la marca activa", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const at = (p: number) => g.pop.top + p * (g.pop.height - g.vh);

  await page.evaluate((y) => window.scrollTo(0, y), at(0));
  await expect(counter(page)).toContainText(POPULAR[0] as string);
  await expect(counter(page)).toContainText("01");
  await expect(counter(page)).toContainText("06");
  const pop = page.getByRole("region", { name: "Marcas populares" });
  await expect(pop.getByRole("link", { name: /Ver marca · 12 piezas/ })).toBeVisible();
  await expect(pop.locator("ul a")).toHaveCount(2);
  await expect(pop.locator("ul a").first()).toContainText("€");

  await page.evaluate((y) => window.scrollTo(0, y), at(1));
  await expect(counter(page)).toContainText(POPULAR[5] as string, { timeout: 4000 });
  await expect(counter(page)).toContainText("06");
});

test("Populares: la copia negra de los nombres se recorta a la ventana 50–75 %", async ({
  page,
}) => {
  await openExplora(page);
  const clip = page.locator("[data-nm-top]").locator("xpath=..");
  await expect(clip).toHaveCSS("clip-path", /inset\(0px 25% 0px 50%\)|inset\(0px 25% 0px 50%\)/);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.pop.top + 0.4 * (g.pop.height - g.vh));
  // La pista de imágenes avanza a la vez que los nombres.
  await expect
    .poll(
      () =>
        page
          .locator("[data-im-track]")
          .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
      { timeout: 4000 },
    )
    .toBeLessThan(-100);
});

test("sin movimiento: lista estática en lugar del recorrido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openExplora(page);
  await expect(page.getByRole("region", { name: "Marcas populares" })).toBeHidden();
  await expect(page.locator("[data-static]").getByText("Satenier")).toBeVisible();
});
