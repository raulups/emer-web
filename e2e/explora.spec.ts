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

/**
 * Abre Explora (Destacados, arriba del todo) con el foco neutro: el carrusel atiende al teclado.
 * Salvo `{ deal: true }`, espera a que acabe la entrada en baraja (cada test es una sesión nueva).
 */
async function openExplora(page: Page, { deal = false } = {}) {
  await page.goto("/web");
  await page.getByRole("button", { name: "Explora" }).click();
  await expect(page.locator("[data-pop]")).toBeVisible();
  if (!deal)
    await expect(page.locator("[data-pop]")).toHaveAttribute("data-ready", "true", {
      timeout: 8000,
    });
  // El slide Marketplace → Explora (View Transition) captura el puntero mientras dura.
  await expect(page.locator("html")).not.toHaveAttribute("data-slide");
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
}

const geometry = (page: Page) =>
  page.evaluate(() => {
    const top = (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) throw new Error(selector);
      return { top: el.getBoundingClientRect().top + window.scrollY, height: el.offsetHeight };
    };
    return {
      pop: top("[data-pop]"),
      nv: top("[data-nv]"),
      sp: top("[data-sp]"),
      er: top("[data-er]"),
      pin: top("[data-cat-pin]"),
      vh: window.innerHeight,
    };
  });

const counter = (page: Page) =>
  page.getByRole("region", { name: "Marcas destacadas" }).locator("p[aria-live]");

test.beforeEach(({ page: _page }, info) => {
  test.skip(info.project.name === "mobile", "el diseño de Explora es de escritorio");
});

const cardBox = (page: Page, index: number) => page.locator("[data-card]").nth(index).boundingBox();

test("Destacados: carrusel sin título; ficha y contador de la marca activa", async ({ page }) => {
  await openExplora(page);
  const pop = page.getByRole("region", { name: "Marcas destacadas" });
  await expect(page.locator("[data-marcas], [data-intro-name]")).toHaveCount(0);
  await expect(pop.locator("[data-card]")).toHaveCount(DESTACADOS.length);
  await expect(pop.getByRole("heading", { level: 2 })).toHaveText(DESTACADOS[0] as string);
  await expect(counter(page)).toHaveText(`${DESTACADOS[0]} · 01 / 03`);
  await expect(pop.getByRole("link", { name: "Ver marca", exact: true })).toBeVisible();
  // Bajo el título, entre dos rayas, hasta 3 artículos en fila con nombre y precio.
  const products = pop.locator("ul a");
  await expect(products).toHaveCount(3);
  await expect(products.first()).toContainText("€");
  const [p0, p2] = [await products.first().boundingBox(), await products.last().boundingBox()];
  expect(Math.abs((p0?.y ?? 0) - (p2?.y ?? 99))).toBeLessThan(1);

  // La activa, en el centro; la siguiente, arriba a la derecha y más grande.
  const vw = page.viewportSize()?.width ?? 0;
  const first = await cardBox(page, 0);
  const second = await cardBox(page, 1);
  expect(Math.abs((first?.x ?? 0) + (first?.width ?? 0) / 2 - vw * 0.53)).toBeLessThan(vw * 0.05);
  expect(second?.x ?? 0).toBeGreaterThan((first?.x ?? 0) + (first?.width ?? 0) / 2);
  expect(second?.y ?? 0).toBeLessThan(first?.y ?? 0);
  expect(second?.width ?? 0).toBeGreaterThan(first?.width ?? 0);
});

test("Destacados: entrada en baraja la primera vez; mientras, no se mueve", async ({ page }) => {
  await page.goto("/web");
  // Primer frame con la baraja ya visible: centros de las dos primeras fotos y opacidad de la ficha.
  const deck = page.evaluate(
    () =>
      new Promise<{ spread: number; info: number }>((resolve) => {
        const look = () => {
          const cards = [...document.querySelectorAll<HTMLElement>("[data-card]")];
          const [a, b] = cards.map((card) => card.getBoundingClientRect());
          const visible = cards[1] && Number(getComputedStyle(cards[1]).opacity) > 0.5;
          if (!a || !b || !visible) return requestAnimationFrame(look);
          const info = document.querySelector("[data-pop] h2")?.parentElement;
          resolve({
            spread: Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)),
            info: Number(info ? getComputedStyle(info).opacity : 1),
          });
        };
        look();
      }),
  );
  await page.getByRole("button", { name: "Explora" }).click();
  const vw = page.viewportSize()?.width ?? 0;
  const first = await deck;
  // Apiladas en el centro (donde queda la activa), con la ficha aún oculta.
  expect(first.spread).toBeLessThan(vw * 0.05);
  expect(first.info).toBeLessThan(0.1);

  const pop = page.locator("[data-pop]");
  await expect(pop).toHaveAttribute("data-ready", "false");
  // La rueda no avanza ni mueve la página durante la entrada.
  await page.mouse.move(400, 400);
  await page.mouse.wheel(0, 120);
  await expect(pop).toHaveAttribute("data-ready", "true", { timeout: 8000 });
  await expect(counter(page)).toContainText("01 / 03");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  // Ya repartidas: la siguiente, arriba a la derecha.
  const mid = (b: { x: number; width: number } | null) => (b?.x ?? 0) + (b?.width ?? 0) / 2;
  expect(mid(await cardBox(page, 1))).toBeGreaterThan(mid(await cardBox(page, 0)) + vw * 0.1);

  // Volver a abrir Explora en la misma sesión: sin baraja.
  await page.getByRole("button", { name: "Marketplace" }).click();
  await page.getByRole("button", { name: "Explora" }).click();
  await expect(pop).toHaveAttribute("data-ready", "true");
});

test("Destacados: rueda y flechas pasan de marca sin mover la página; al final, baja", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.mouse.move(g.vh / 2, g.vh / 2);
  await page.mouse.wheel(0, 120);
  await expect(counter(page)).toHaveText(`${DESTACADOS[1]} · 02 / 03`);
  // Un gesto es un paso: la inercia que sigue no avanza más.
  await page.mouse.wheel(0, 40);
  await page.waitForTimeout(100);
  await expect(counter(page)).toContainText("02 / 03");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  await page.waitForTimeout(250);
  await page.keyboard.press("ArrowDown");
  await expect(counter(page)).toHaveText(`${DESTACADOS[2]} · 03 / 03`);
  await page.keyboard.press("ArrowUp");
  await expect(counter(page)).toContainText("02 / 03");
  await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toContainText("03 / 03");
  await expect(page.locator("[data-pop]")).toHaveAttribute("data-last", "true");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // Pasada la última, scroll animado hasta la siguiente sección.
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(g.nv.top - 20);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeCloseTo(g.nv.top, -1);
});

test("Destacados: el título mide siempre dos líneas y nunca pasa de ahí", async ({ page }) => {
  await openExplora(page);
  const title = page.getByRole("region", { name: "Marcas destacadas" }).getByRole("heading");
  const lines = () =>
    title.evaluate(
      (el) =>
        el.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(el).lineHeight),
    );
  expect(await lines()).toBeCloseTo(2, 1);
  // Con un nombre largo sigue igual de alto (se corta a dos líneas).
  await title.evaluate((el) => {
    (el.firstChild as HTMLElement).textContent =
      "Un nombre de marca larguísimo que no cabe en dos líneas";
  });
  expect(await lines()).toBeCloseTo(2, 1);
});

test("Destacados: con el ratón encima la foto se endereza y sigue al cursor", async ({ page }) => {
  await openExplora(page);
  const card = page.locator("[data-card]").first();
  const angles = () =>
    card.evaluate((el) => {
      const t = el.style.transform;
      const deg = (axis: string) =>
        Number(new RegExp(`rotate${axis}\\((-?[\\d.]+)deg`).exec(t)?.[1]);
      return { x: deg("X"), y: deg("Y") };
    });
  const rest = await angles();
  const box = await card.boundingBox();
  const cx = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const cy = (box?.y ?? 0) + (box?.height ?? 0) / 2;
  await page.mouse.move(cx, cy);
  await expect.poll(async () => Math.abs((await angles()).x)).toBeLessThan(Math.abs(rest.x) / 3);
  // Hacia la derecha gira hacia la derecha; hacia la izquierda, al revés.
  await page.mouse.move(cx + 80, cy);
  await page.waitForTimeout(800);
  const right = (await angles()).y;
  await page.mouse.move(cx - 80, cy);
  await page.waitForTimeout(800);
  expect(right - (await angles()).y).toBeGreaterThan(5);
  // Al salir vuelve a su inclinación.
  await page.mouse.move(5, 5);
  await expect.poll(angles).toEqual(rest);
});

test("Destacados: entrar con el ratón en la siguiente o la anterior navega a ella (una vez)", async ({
  page,
}) => {
  await openExplora(page);
  const center = async (i: number) => {
    const box = await cardBox(page, i);
    return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
  };
  const next = await center(1);
  await page.mouse.move(5, 5);
  await page.mouse.move(next.x, next.y, { steps: 4 });
  await expect(counter(page)).toContainText("02 / 03");
  // Con el cursor quieto, la foto que se desliza debajo no encadena otro salto.
  await page.waitForTimeout(1500);
  await expect(counter(page)).toContainText("02 / 03");

  // La anterior, medida ya en su sitio; se entra por la izquierda, sin cruzar las demás.
  const prev = await center(0);
  await page.mouse.move(2, prev.y);
  await page.mouse.move(prev.x, prev.y, { steps: 4 });
  await expect(counter(page)).toContainText("01 / 03");
});

test("Destacados: pulsar una foto la trae al centro", async ({ page }) => {
  await openExplora(page);
  await page.locator("[data-card]").nth(1).click();
  await expect(counter(page)).toContainText(DESTACADOS[1] as string);
  await expect(page.locator("[data-card]").nth(1)).toHaveAttribute("aria-current", "true");
});

test("[ BAJAR ]: abajo al centro, animado, lleva a la siguiente sección", async ({ page }) => {
  await openExplora(page);
  const down = page.getByRole("button", { name: "Bajar a la siguiente sección" });
  await expect(down).toBeVisible();
  await expect(down).toHaveCSS("mix-blend-mode", "difference");
  await expect(down.locator("span span").last()).not.toHaveCSS("animation-name", "none");
  const box = await down.boundingBox();
  const vw = page.viewportSize()?.width ?? 0;
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - vw / 2)).toBeLessThan(2);
  // En Destacados no hay [ SALTAR ]: lo hace este botón.
  await expect(page.locator("[data-skip]")).not.toHaveAttribute("data-on");

  const g = await geometry(page);
  await down.click();
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeCloseTo(g.nv.top, -1);
});

test("sin movimiento: lista estática en lugar del carrusel", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/web");
  await page.getByRole("button", { name: "Explora" }).click();
  await expect(page.getByRole("region", { name: "Marcas destacadas" })).toBeHidden();
  await expect(page.locator("[data-static]").getByText("Scuffers", { exact: true })).toBeVisible();
});

test("Populares (2.ª sección): marcas con el tag, opacidad por distancia y foto en hover sin animación", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.nv.top + g.vh * 0.6);
  const rows = page.locator("[data-nv-row]");
  await expect(page.locator("[data-nv] h2")).toHaveText("LAS MÁS POPULARES");
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
  const g = await geometry(page);
  // En Destacados lo hace [ BAJAR ]; aparece desde Populares.
  await page.evaluate((y) => window.scrollTo(0, y), g.nv.top);
  const skip = page.getByRole("button", { name: "Saltar al final de Populares" });
  const nav = page.getByRole("navigation", { name: "Vista" });
  await expect(skip).toBeVisible();
  // Blanco en modo diferencia: se lee sobre blanco, negro o foto sin halo ni sombra.
  for (const control of [nav, skip]) {
    await expect(control).toHaveCSS("mix-blend-mode", "difference");
    await expect(control).toHaveCSS("color", "rgb(255, 255, 255)");
  }
  await expect(nav.locator("span").first()).toHaveCSS("text-shadow", "none");

  const end = g.sp.top + g.sp.height - g.vh;
  await skip.click();
  // No es un salto seco: a mitad del recorrido el scroll aún no ha llegado.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(g.nv.top + 100);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(end - 50);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeCloseTo(end, -1);

  await expect(page.getByRole("button", { name: "Saltar al final de Novedades" })).toBeVisible();
});

test("índice: discreto en reposo, marca la sección actual y lleva a cada una", async ({ page }) => {
  await openExplora(page);
  const index = page.getByRole("navigation", { name: "Secciones de Explora" });
  await expect(index).toHaveCSS("opacity", "0.32");
  await expect(index).toHaveCSS("mix-blend-mode", "difference");
  await expect(index.getByRole("button")).toHaveText([
    /Destacados/,
    /Populares/,
    /Novedades/,
    /Emergentes/,
    /Sugerir marca/,
  ]);
  await expect(index.getByRole("button", { name: /Destacados/ })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await index.hover();
  await expect(index).toHaveCSS("opacity", "1");
  const g = await geometry(page);
  await index.getByRole("button", { name: /Populares/ }).click();
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeCloseTo(g.nv.top, -1);
  await expect(index.getByRole("button", { name: /Populares/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
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

  const cards = page.locator("[data-er-car] button");
  const names = await cards.evaluateAll((els) =>
    els.map((el) => el.querySelectorAll("span")[2]?.textContent),
  );
  expect(new Set(names).size).toBe(names.length);
  expect(names.toSorted()).toEqual(NOVEDADES.toSorted());
  await expect(page.locator("[data-er] h2")).toHaveText("LO NUEVO EN EMER");

  // Hover: la tarjeta bajo el ratón pasa a ser la marca activa.
  await page.evaluate((v) => window.scrollTo(0, v), y(0.5));
  await page.waitForTimeout(1500);
  const point = { x: 180, y: 300 };
  await page.mouse.move(point.x, point.y);
  const under = await page.evaluate(({ x, y }) => {
    const card = document.elementFromPoint(x, y)?.closest("[data-er-car] button");
    // El nombre del pie se baraja con el hover: se lee el de la foto.
    return card?.querySelector("img")?.alt ?? null;
  }, point);
  expect(under).toBeTruthy();
  await expect(page.locator("[data-er-info]")).toContainText(under as string);
});

test("Novedades → Emergentes: sin fundido, Novedades sube con el scroll sobre Emergentes ya fija", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const opacity = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => Number(getComputedStyle(el).opacity));

  // Emergentes empieza fija justo cuando el carrusel de Novedades ha terminado (se solapan).
  expect(Math.abs(g.pin.top - (g.er.top + g.er.height - 2 * g.vh))).toBeLessThanOrEqual(2);

  // A mitad del paso: sin fundido, Novedades sube con el scroll y Emergentes asoma por debajo.
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + 0.4 * g.vh);
  const stageTop = () =>
    page.locator("[data-er-stage]").evaluate((el) => el.getBoundingClientRect().top);
  await expect.poll(stageTop, { timeout: 4000 }).toBeLessThan(-0.3 * g.vh);
  await expect.poll(stageTop, { timeout: 4000 }).toBeGreaterThan(-0.5 * g.vh);
  expect(await opacity("[data-er-stage]")).toBe(1);
  expect(await opacity("[data-cat-g]")).toBeGreaterThan(0);

  // Al acabar, Novedades se oculta (no tapa el hover) y Emergentes está entera.
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + g.vh);
  await expect(page.locator("[data-er]")).toHaveCSS("visibility", "hidden", { timeout: 4000 });
  await expect.poll(() => opacity("[data-cat] h2"), { timeout: 4000 }).toBe(1);
});

test("Catálogo: el alto sale del recorrido medido y la pista llega justo al final", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const trackX = () =>
    page
      .locator("[data-cat-track]")
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);

  // Alto = fundido (vh) + pantalla (vh) + recorrido horizontal de la pista.
  const travel = await page.evaluate(() => {
    const track = document.querySelector<HTMLElement>("[data-cat-track]");
    const pin = document.querySelector<HTMLElement>("[data-cat-pin]");
    return track && pin ? track.scrollWidth - pin.clientWidth : 0;
  });
  expect(travel).toBeGreaterThan(0);
  expect(Math.abs(g.pin.height - (2 * g.vh + travel))).toBeLessThanOrEqual(1);

  // Quieta durante el fundido; a mitad del recorrido, a mitad de la pista.
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + 0.5 * g.vh);
  await expect.poll(trackX, { timeout: 4000 }).toBeCloseTo(0, 0);
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + g.vh + travel / 2);
  await expect.poll(trackX, { timeout: 4000 }).toBeCloseTo(-travel / 2, -1);
  // Justo cuando se suelta la escena, la pista está en su final (ni antes ni después).
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + g.pin.height - g.vh);
  await expect.poll(trackX, { timeout: 5000 }).toBeCloseTo(-travel, -1);
});

test("cursor: logo de la marca sobre ella, punto sobre sus botones y al salir", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "el cursor propio solo va con pointer fine");
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + 0.5 * (g.pin.height - g.vh));
  await page.waitForTimeout(1500);

  const dot = page.locator("[data-cursor]");
  const badge = page.locator("[data-cursor] + div");
  const cells = page.locator("[data-cat] [data-cat-cell][data-cursor-logo]");
  const index = await cells.evaluateAll((els) =>
    els.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.width > 40;
    }),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  const cell = cells.nth(index);
  // Imagen vertical en cualquier pantalla: sin <picture>.
  expect(
    await cell
      .locator("img")
      .first()
      .evaluate((img) => img.parentElement?.tagName),
  ).not.toBe("PICTURE");

  await cell.hover({ position: { x: 12, y: 12 } });
  await expect(dot).toHaveAttribute("data-off", "");
  await expect(badge).toHaveAttribute("data-on", "");
  await expect(badge.locator("img")).toBeVisible();
  await expect(badge.locator("img")).toHaveCSS("opacity", "1");

  await cell.locator("a, button").first().hover();
  await expect(dot).not.toHaveAttribute("data-off");
  await expect(badge).not.toHaveAttribute("data-on");

  await cell.hover({ position: { x: 12, y: 12 } });
  await expect(dot).toHaveAttribute("data-off", "");

  await page.mouse.move(5, 5);
  await expect(dot).not.toHaveAttribute("data-off");
  await expect(badge).not.toHaveAttribute("data-on");
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

test("Emergentes (4.ª sección): tag «emergente» o sin tags, sin repetir, y aviso sin piezas", async ({
  page,
}) => {
  await openExplora(page);
  const names = await page
    .locator("[data-cat] [data-cat-cell]")
    .evaluateAll((els) => els.map((el) => el.querySelector("img")?.getAttribute("alt") ?? ""));
  expect(names).toEqual(EMERGENTES);
  await expect(page.locator("[data-cat] h2")).toHaveText("LA NUEVA OLA");
  await expect(
    page.locator("[data-cat] [data-cat-cell]", { hasText: "Inventario en camino" }),
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
