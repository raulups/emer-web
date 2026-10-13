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
    return {
      intro: top("[data-intro]"),
      pop: top("[data-pop]"),
      nv: top("[data-nv]"),
      sp: top("[data-sp]"),
      er: top("[data-er]"),
      lead: top("[data-cat-lead]"),
      pin: top("[data-cat-pin]"),
      vh: window.innerHeight,
    };
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
  await expect(pop.locator("ul a")).toHaveCount(3);
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

for (const size of [
  { width: 1440, height: 900 },
  { width: 924, height: 540 },
]) {
  test(`Populares ${size.width}×${size.height}: las piezas caben sin pisar la descripción`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openExplora(page);
    const g = await geometry(page);
    await page.evaluate((y) => window.scrollTo(0, y), g.pop.top);
    const pop = page.getByRole("region", { name: "Marcas populares" });
    await expect(pop.locator("ul a").first()).toBeVisible();
    const link = await pop.getByRole("link", { name: /Ver marca/ }).boundingBox();
    const list = await pop.locator("ul").boundingBox();
    const lastCard = await pop.locator("ul a").last().boundingBox();
    expect(list?.y ?? 0).toBeGreaterThanOrEqual((link?.y ?? 0) + (link?.height ?? 0));
    // No llegan a la línea central ni se salen de la pantalla.
    expect((lastCard?.x ?? 0) + (lastCard?.width ?? 0)).toBeLessThanOrEqual(size.width / 2);
    expect((list?.y ?? 0) + (list?.height ?? 0)).toBeLessThanOrEqual(size.height);
  });
}

test("Novedades: filas ordenadas por llegada, opacidad por distancia y foto en hover sin animación", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.nv.top + g.vh * 0.6);
  const rows = page.locator("[data-nv-row]");
  await expect(rows.first()).toContainText("Satenier");
  await expect(rows.first()).toContainText("Llegó el 01.09.26");
  // La fila más cercana al centro es la más opaca; las lejanas, más tenues (mínimo .22).
  await expect
    .poll(async () => {
      const opacities = await rows.evaluateAll((els) =>
        els.map((el) => Number(getComputedStyle(el).opacity)),
      );
      return Math.max(...opacities) - Math.min(...opacities);
    })
    .toBeGreaterThan(0.3);

  const preview = page.locator("[data-nv] [data-on]");
  await expect(preview).toHaveCount(0);
  await rows.nth(2).hover();
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveCSS("transition-duration", "0s");
  await page.mouse.move(5, 5);
  await expect(preview).toHaveCount(0);
});

test("transición Novedades → Emergentes: línea que gira, máscara conic y sin saltos al final", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const at = (q: number) => g.sp.top + q * (g.sp.height - g.vh);
  const mask = () => page.locator("[data-stk]").evaluate((el) => getComputedStyle(el).maskImage);
  const line = () =>
    page.locator("[data-sl-line]").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform));

  await page.evaluate((y) => window.scrollTo(0, y), at(0.5));
  await expect.poll(mask, { timeout: 4000 }).toContain("conic-gradient");
  // A q = .5 la línea ha girado ~90°.
  await expect.poll(async () => Math.abs((await line()).b), { timeout: 4000 }).toBeGreaterThan(0.9);
  await expect(page.locator("[data-er]")).toHaveCSS("visibility", "visible");

  await page.evaluate((y) => window.scrollTo(0, y), at(1.05));
  await expect(page.locator("[data-stk]")).toHaveCSS("visibility", "hidden", { timeout: 4000 });
  await expect(page.locator("[data-ediv]")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-sl]")).toHaveCSS("visibility", "hidden");
});

test("Emergentes: dos columnas en sentidos opuestos, marca activa por hover y sin repetidas", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const y = (f: number) => g.er.top + g.vh + f * (g.er.height - 2 * g.vh);
  const column = (selector: string) =>
    page.locator(selector).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).f);

  await page.evaluate((v) => window.scrollTo(0, v), y(0.02));
  await expect(page.locator("[data-er-car]")).toHaveCSS("opacity", "1", { timeout: 4000 });
  const a0 = await column("[data-er-a]");
  const b0 = await column("[data-er-b]");
  await page.evaluate((v) => window.scrollTo(0, v), y(0.95));
  await expect.poll(() => column("[data-er-a]"), { timeout: 4000 }).toBeGreaterThan(a0 + 100);
  await expect.poll(() => column("[data-er-b]"), { timeout: 4000 }).toBeLessThan(b0 - 100);

  const cards = page.locator("[data-er-car] a");
  const names = await cards.evaluateAll((els) =>
    els.map((el) => el.querySelectorAll("span")[2]?.textContent),
  );
  expect(new Set(names).size).toBe(names.length);

  // Hover: la tarjeta bajo el ratón pasa a ser la marca activa.
  await page.evaluate((v) => window.scrollTo(0, v), y(0.5));
  await page.waitForTimeout(1500);
  const point = { x: 180, y: 300 };
  await page.mouse.move(point.x, point.y);
  const under = await page.evaluate(({ x, y }) => {
    const card = document.elementFromPoint(x, y)?.closest("[data-er-car] a");
    return card?.querySelectorAll("span")[2]?.textContent ?? null;
  }, point);
  expect(under).toBeTruthy();
  await expect(page.locator("[data-er-info]")).toContainText(under as string);
});

test("Catálogo: la línea baja, el alto sale del recorrido medido y la pista se desplaza", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const matrix = (selector: string) =>
    page.locator(selector).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform));

  await page.evaluate((y) => window.scrollTo(0, y), g.lead.top + 0.3 * g.lead.height);
  await expect
    .poll(async () => (await matrix("[data-cat-line]")).d, { timeout: 4000 })
    .toBeLessThan(0.9);
  await page.evaluate((y) => window.scrollTo(0, y), g.lead.top + g.lead.height);
  await expect
    .poll(async () => (await matrix("[data-cat-line]")).d, { timeout: 4000 })
    .toBeCloseTo(1, 1);

  // Alto de la sección = alto de pantalla + recorrido horizontal de la pista.
  const travel = await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>("[data-cat-track]");
    const pin = document.querySelector<HTMLElement>("[data-cat-pin]");
    return track && pin ? track.scrollWidth - pin.clientWidth : 0;
  });
  expect(travel).toBeGreaterThan(0);
  expect(Math.abs(g.pin.height - (g.vh + travel))).toBeLessThanOrEqual(1);

  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + g.pin.height - g.vh);
  await expect
    .poll(async () => (await matrix("[data-cat-track]")).e, { timeout: 5000 })
    .toBeCloseTo(-travel, -1);
});

test("Catálogo: hover con zoom, atenuado, miniaturas y «Ver marca ↗» sin cambiar el tamaño de las celdas", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + 0.5 * (g.pin.height - g.vh));
  await page.waitForTimeout(1500);

  const cells = page.locator("[data-cat] [data-cat-g] a");
  const visible = async () => {
    const boxes = await cells.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.textContent,
          x: r.x,
          w: r.width,
          h: r.height,
          inView: r.right > 0 && r.left < innerWidth,
        };
      }),
    );
    return boxes.filter((b) => b.inView);
  };
  const before = await visible();
  expect(before.length).toBeGreaterThan(2);

  const index = await cells.evaluateAll((els) =>
    els.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return r.left > 200 && r.right < innerWidth - 100;
    }),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const cell = cells.nth(index);
  await cell.hover();
  await expect(cell).toHaveAttribute("data-on", "true");
  await expect(cell.getByText("Ver marca ↗", { exact: true })).toHaveCSS("opacity", "1");
  await expect(cell.locator("img").first()).toHaveCSS("transform", /matrix\(1\.05/);
  const other = cells.nth(index === 0 ? 1 : 0);
  await expect(other).toHaveCSS("opacity", "0.3");

  const after = await visible();
  expect(after.map(({ x, w, h }) => [x, w, h])).toEqual(before.map(({ x, w, h }) => [x, w, h]));
  await page.mouse.move(5, 5);
  await expect(cell).not.toHaveAttribute("data-on");
});

test("Catálogo: todas las marcas, sin repetir, y «Catálogo pronto» en las que no tienen piezas", async ({
  page,
}) => {
  await openExplora(page);
  const names = await page
    .locator("[data-cat] [data-cat-g] a")
    .evaluateAll((els) => els.map((el) => el.querySelector("img")?.getAttribute("alt") ?? ""));
  expect(new Set(names).size).toBe(names.length);
  expect(names.length).toBe(10);
  await expect(
    page.locator("[data-cat] [data-cat-g] a", { hasText: "Catálogo pronto" }),
  ).toHaveCount(1);
});
