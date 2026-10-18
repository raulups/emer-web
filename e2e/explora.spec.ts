import { expect, type Page, test } from "@playwright/test";

/**
 * Fixtures (`TAGS` en src/lib/api/fixtures.ts). Por posición: 1.ª Destacados (tag «destacada», por
 * nº de piezas), 2.ª Populares («popular»), 3.ª Novedades («novedad») y 4.ª Emergentes
 * («emergente» o sin tags, por año de fundación).
 */
const DESTACADOS = ["Scuffers", "Nocturna", "Solar Club"];
const POPULARES = ["Satenier", "Nocturna", "Ruido"];
const NOVEDADES = [
  "Satenier",
  "Scuffers",
  "Nocturna",
  "Imagen Rota",
  "Bajo Cero",
  "Solar Club",
  "Ruido",
  "Marea",
];
const EMERGENTES = ["Bajo Cero", "Imagen Rota", "Tinta", "Marea", "Calma", "Satenier"];

async function openExplora(page: Page) {
  await page.goto("/web");
  await page.getByRole("button", { name: "Explora" }).click();
  await expect(page.locator("[data-intro]")).toBeVisible();
  // El slide Marketplace → Explora (View Transition) captura el puntero mientras dura.
  await expect(page.locator("html")).not.toHaveAttribute("data-slide");
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
  page.getByRole("region", { name: "Marcas destacadas" }).locator("p[aria-live]");
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

test("Destacados: nombres, descripción, piezas y contador de la marca activa", async ({ page }) => {
  await openExplora(page);
  const g = await geometry(page);
  const at = (p: number) => g.pop.top + p * (g.pop.height - g.vh);

  await page.evaluate((y) => window.scrollTo(0, y), at(0));
  await expect(counter(page)).toContainText(DESTACADOS[0] as string);
  await expect(counter(page)).toContainText("01");
  await expect(counter(page)).toContainText("03");
  // Los nombres de la pista son exactamente las marcas con el tag, en orden.
  expect(await page.locator("[data-nm-base] [data-nm]").allTextContents()).toEqual(DESTACADOS);
  const pop = page.getByRole("region", { name: "Marcas destacadas" });
  // La descripción no enseña los tags de sección.
  await expect(pop.locator("p").first()).not.toContainText(/destacad|popular|novedad|emergente/i);
  await expect(pop.getByRole("link", { name: "Ver marca", exact: true })).toBeVisible();
  await expect(pop.locator("ul a")).toHaveCount(3);
  await expect(pop.locator("ul a").first()).toContainText("€");

  await page.evaluate((y) => window.scrollTo(0, y), at(1));
  await expect(counter(page)).toContainText(DESTACADOS[2] as string, { timeout: 4000 });
  await expect(counter(page)).toContainText("03");
});

test("Destacados: la copia negra de los nombres se recorta a la ventana 50–75 %", async ({
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
  await expect(page.getByRole("region", { name: "Marcas destacadas" })).toBeHidden();
  await expect(page.locator("[data-static]").getByText("Scuffers", { exact: true })).toBeVisible();
});

for (const size of [
  { width: 1440, height: 900 },
  { width: 924, height: 540 },
]) {
  test(`Destacados ${size.width}×${size.height}: las piezas caben sin pisar la descripción`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openExplora(page);
    const g = await geometry(page);
    await page.evaluate((y) => window.scrollTo(0, y), g.pop.top);
    const pop = page.getByRole("region", { name: "Marcas destacadas" });
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

test("Populares (2.ª sección): marcas con el tag, opacidad por distancia y foto en hover sin animación", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.nv.top + g.vh * 0.6);
  const rows = page.locator("[data-nv-row]");
  await expect(page.locator("[data-nv] h2")).toHaveText("POPULARES");
  await expect(rows).toHaveCount(POPULARES.length);
  for (const [i, name] of POPULARES.entries()) await expect(rows.nth(i)).toContainText(name);
  await expect(rows.first()).toContainText("Llegó el 01.09.26");
  // La fila más cercana al centro es la más opaca; las lejanas, más tenues (mínimo .22).
  await expect
    .poll(async () => {
      const opacities = await rows.evaluateAll((els) =>
        els.map((el) => Number(getComputedStyle(el).opacity)),
      );
      return Math.max(...opacities) - Math.min(...opacities);
    })
    .toBeGreaterThan(0.2);

  const preview = page.locator("[data-nv] [data-on]");
  await expect(preview).toHaveCount(0);
  await rows.nth(2).hover();
  await expect(preview).toHaveCount(1);
  await expect(preview).toHaveCSS("transition-duration", "0s");
  await page.mouse.move(5, 5);
  await expect(preview).toHaveCount(0);
});

test("transición Populares → Novedades: línea que gira, máscara conic y sin saltos al final", async ({
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

test("[ SALTAR ]: scroll animado al final de la sección; controles en modo diferencia (sin halos)", async ({
  page,
}) => {
  await openExplora(page);
  const skip = page.getByRole("button", { name: "Saltar al final de Destacados" });
  const nav = page.getByRole("navigation", { name: "Vista" });
  await expect(skip).toBeVisible();
  // Blanco en modo diferencia: se lee sobre blanco, negro o foto sin halo ni sombra.
  for (const control of [nav, skip]) {
    await expect(control).toHaveCSS("mix-blend-mode", "difference");
    await expect(control).toHaveCSS("color", "rgb(255, 255, 255)");
  }
  await expect(nav.locator("span").first()).toHaveCSS("text-shadow", "none");

  const g = await geometry(page);
  await skip.click();
  // No es un salto seco: a mitad del recorrido el scroll aún no ha llegado.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(g.nv.top - 50);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeCloseTo(g.nv.top, -1);

  await expect(page.getByRole("button", { name: "Saltar al final de Populares" })).toBeVisible();
});

test("Novedades (3.ª sección): dos columnas en sentidos opuestos, marca activa por hover y sin repetidas", async ({
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
  expect(names.toSorted()).toEqual(NOVEDADES.toSorted());
  await expect(page.locator("[data-er] h2")).toHaveText("NOVEDADES");

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

test("Catálogo: hover con zoom, atenuado, miniaturas y botones sin cambiar el tamaño de las celdas", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + 0.5 * (g.pin.height - g.vh));
  await page.waitForTimeout(1500);

  const cells = page.locator("[data-cat] [data-cat-cell]");
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
  await expect(cell.locator("[data-tone]")).toHaveCSS("opacity", "1");
  await expect(cell.locator("img").first()).toHaveCSS("transform", /matrix\(1\.05/);
  const other = cells.nth(index === 0 ? 1 : 0);
  await expect(other).toHaveCSS("opacity", "0.3");

  const after = await visible();
  expect(after.map(({ x, w, h }) => [x, w, h])).toEqual(before.map(({ x, w, h }) => [x, w, h]));
  await page.mouse.move(5, 5);
  await expect(cell).not.toHaveAttribute("data-on");
});

test("Emergentes (4.ª sección): tag «emergente» o sin tags, sin repetir, y «Catálogo pronto» sin piezas", async ({
  page,
}) => {
  await openExplora(page);
  const names = await page
    .locator("[data-cat] [data-cat-cell]")
    .evaluateAll((els) => els.map((el) => el.querySelector("img")?.getAttribute("alt") ?? ""));
  expect(names).toEqual(EMERGENTES);
  await expect(page.locator("[data-cat] h2")).toHaveText("EMERGENTES");
  await expect(
    page.locator("[data-cat] [data-cat-cell]", { hasText: "Catálogo pronto" }),
  ).toHaveCount(1);
});

test("imágenes rotas: Catálogo y Emergentes usan la foto del primer producto", async ({ page }) => {
  await openExplora(page);
  for (const scope of ["[data-cat]", "[data-er-car]"]) {
    const image = page.locator(`${scope} img[alt="Imagen Rota"]`).first();
    await expect(image).toHaveAttribute("src", /\/assets\/deco\/.+\.png/, { timeout: 8000 });
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), {
        timeout: 8000,
      })
      .toBe(true);
  }
});

/** Transform Y de un nodo escrito por el bucle (`translateY(calc(-50% + Npx))`). */
const writtenY = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => Number((el as HTMLElement).style.transform.match(/([-\d.]+)px/)?.[1] ?? NaN));

test("Sugerir marca: arranca en blanco y las filas suben sin saltos hasta el slot", async ({
  page,
}) => {
  await openExplora(page);
  const sg = page.locator("#sugerir-marca");
  const { top, height, vh } = await sg.evaluate((el) => ({
    top: el.getBoundingClientRect().top + window.scrollY,
    height: (el as HTMLElement).offsetHeight,
    vh: window.innerHeight,
  }));
  expect(height).toBeCloseTo(vh * 3.8, -1);

  // q ≈ 0.05: espacio en blanco (la lista aún está por debajo de la pantalla).
  await page.evaluate((y) => window.scrollTo(0, y), top - vh + height * 0.05);
  await expect.poll(() => writtenY(page, "[data-slot]")).toBeGreaterThan(vh);
  await expect(page.locator('[data-sr="5"]')).toHaveCSS("opacity", "0");

  // Scroll continuo: el slot baja de forma monótona, sin saltos grandes por frame.
  const ys = await page.evaluate(
    async ({ from, to }) => {
      const slot = document.querySelector<HTMLElement>("[data-slot]");
      // [y del slot, ms desde el frame anterior]
      const out: [number, number][] = [];
      let last = performance.now();
      for (let y = from; y <= to; y += 30) {
        window.scrollTo(0, y);
        await new Promise((r) => requestAnimationFrame(r));
        const now = performance.now();
        out.push([Number(slot?.style.transform.match(/([-\d.]+)px/)?.[1]), now - last]);
        last = now;
      }
      return out;
    },
    { from: top - vh + height * 0.05, to: top - vh + height * 0.6 },
  );
  for (let i = 1; i < ys.length; i++) {
    const [y = 0, ms = 16.7] = ys[i] ?? [];
    const [prev = 0] = ys[i - 1] ?? [];
    expect(y).toBeLessThanOrEqual(prev + 0.5);
    // Sin saltos: menos de 80 px por frame de 60 Hz (normalizado si el navegador pierde frames).
    expect((Math.abs(y - prev) * 16.7) / Math.max(16.7, ms)).toBeLessThan(80);
  }

  // q = 0.9: slot centrado, filas fuera y formulario activo.
  await page.evaluate((y) => window.scrollTo(0, y), top - vh + height * 0.9);
  await expect.poll(() => writtenY(page, "[data-slot]")).toBeLessThan(1);
  await expect(page.locator('input[name="name"]')).toHaveCSS("pointer-events", "auto");
});

test("Sugerir marca: validación, error conservando datos y estado enviado", async ({ page }) => {
  await openExplora(page);
  await page.locator("footer").getByRole("link", { name: "Sugerir marca" }).click();
  const sg = page.locator("#sugerir-marca");
  const name = sg.locator('input[name="name"]');
  const ig = sg.locator('input[name="instagram"]');
  const submit = sg.getByRole("button", { name: "Enviar sugerencia" });
  await expect(name).toHaveCSS("pointer-events", "auto");

  await expect(submit).toHaveAttribute("aria-disabled", "true");
  await ig.fill(" @Mi.Marca ");
  await expect(ig).toHaveValue("Mi.Marca");

  // El nombre «ERROR» fuerza el fallo en las fixtures.
  await name.fill("ERROR");
  await expect(submit).toHaveAttribute("aria-disabled", "false");
  await submit.click();
  await expect(sg.getByRole("alert")).toHaveText("No se pudo enviar. Inténtalo de nuevo.");
  await expect(name).toHaveValue("ERROR");

  await name.fill("Nueva marca");
  await submit.click();
  await expect(sg.getByRole("status")).toHaveText("En revisión · Gracias");
  await expect(sg.locator("[data-sv]").first()).toHaveText("Nueva marca");

  await sg.getByRole("button", { name: "Sugerir otra" }).click();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("");
});

test("Footer: Ofertas abre el Marketplace con el filtro de ofertas", async ({ page }) => {
  await openExplora(page);
  await page.locator("footer").getByRole("link", { name: "Ofertas" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-view", "market");
  await expect(page.locator("button", { hasText: "SOLO OFERTAS" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

const SATENIER_ID = "0208bdca-c705-491b-82fa-76123232670b";

test("botones de marca: «Ver marca» solo con productos, «Ir a la tienda» externo y mismo alto", async ({
  page,
}) => {
  await openExplora(page);
  const cell = (name: string) =>
    page
      .locator("[data-cat] [data-cat-cell]")
      .filter({ has: page.getByAltText(name, { exact: true }) });

  // Con productos: «Ver marca» (principal, interno) + «Ir a la tienda» (secundario, externo).
  const satenier = cell("Satenier");
  const market = satenier.getByRole("link", { name: "Ver marca", exact: true });
  const store = satenier.getByRole("link", { name: /Ir a la tienda/ });
  await expect(market).toHaveAttribute("href", `/marketplace?brand=${SATENIER_ID}`);
  await expect(market).toHaveAttribute("data-primary", "true");
  await expect(store).toHaveAttribute("target", "_blank");
  await expect(store).toHaveAttribute("rel", "noopener noreferrer");
  await expect(store).not.toHaveAttribute("data-primary");

  // Sin productos (Bajo Cero): solo «Ir a la tienda», que pasa a ser el principal.
  const bajoCero = cell("Bajo Cero");
  await expect(bajoCero.getByRole("link", { name: "Ver marca", exact: true })).toHaveCount(0);
  await expect(bajoCero.getByRole("link", { name: /Ir a la tienda/ })).toHaveAttribute(
    "data-primary",
    "true",
  );

  // Mismo alto con uno o dos botones.
  const height = (loc: typeof satenier) =>
    loc.locator("[data-tone]").evaluate((el) => el.getBoundingClientRect().height);
  expect(await height(bajoCero)).toBe(await height(satenier));
});

test("«Ver marca» abre el Marketplace filtrado por la marca", async ({ page }) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.pop.top);
  const pop = page.getByRole("region", { name: "Marcas destacadas" });
  const link = pop.getByRole("link", { name: "Ver marca", exact: true });
  // La marca activa es la del enlace que se pulsa.
  const href = (await link.getAttribute("href")) ?? "";
  const id = new URL(href, "http://x").searchParams.get("brand");
  await link.click();
  await expect(page.locator("main")).toHaveAttribute("data-view", "market");
  await expect
    .poll(() => new URL(page.url()).pathname + new URL(page.url()).search)
    .toBe(`/web?brand=${id}`);
  // Filtro de marca activo en el menú y solo productos de esa marca.
  const selected = page
    .getByRole("complementary", { name: "Menú del catálogo" })
    .locator('button[aria-pressed="true"]');
  await expect(selected).toHaveCount(1);
  const brand = ((await selected.textContent()) ?? "").split(",")[0]?.trim() ?? "";
  const cards = page.getByRole("region", { name: "Productos" }).locator("article");
  await expect
    .poll(async () => {
      const texts = await cards.allTextContents();
      return texts.length > 0 && texts.every((t) => t.includes(brand));
    })
    .toBe(true);
});
