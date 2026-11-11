import { expect, type Page, test } from "@playwright/test";

/**
 * Fixtures (`TAGS` en src/lib/api/fixtures.ts). Por posición: 1.ª Destacados (tag «destacada», por
 * nº de piezas), 2.ª Populares («popular»), 3.ª Emergentes («emergente», por año de fundación),
 * 4.ª Novedades («novedad», de la última en llegar a la primera) y 5.ª Catálogo (todas, A–Z).
 */
const DESTACADOS = ["Scuffers", "Nocturna", "Solar Club"];
const POPULARES = ["Satenier", "Nocturna", "Ruido"];
const EMERGENTES = ["Bajo Cero", "Imagen Rota", "Marea", "Satenier"];
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
const TODAS = [
  "Bajo Cero",
  "Calma",
  "Imagen Rota",
  "Marea",
  "Nocturna",
  "Ruido",
  "Satenier",
  "Scuffers",
  "Solar Club",
  "Tinta",
];

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
      er: top("[data-er]"),
      pin: top("[data-cat-pin]"),
      vh: window.innerHeight,
    };
  });

const SATENIER_ID = "0208bdca-c705-491b-82fa-76123232670b";

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

test("Destacados: el título ocupa siempre una línea, también con un nombre largo", async ({
  page,
}) => {
  await openExplora(page);
  const title = page.getByRole("region", { name: "Marcas destacadas" }).getByRole("heading");
  const height = () => title.evaluate((el) => el.getBoundingClientRect().height);
  const before = await height();
  await expect(title).toHaveCSS("white-space", "nowrap");
  await title.evaluate((el) => {
    (el.firstChild as HTMLElement).textContent =
      "Un nombre de marca larguísimo que no cabe en una línea";
  });
  expect(await height()).toBe(before);
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
  // Novedades: sin baraja ni controles, todas las cartas a la vista en un grid.
  const nw = page.getByRole("region", { name: "Novedades" });
  await expect(nw.getByRole("link")).toHaveCount(NOVEDADES.length);
  await expect(page.locator("[data-hint]")).toBeHidden();
  await expect(nw.locator("[data-nw-card]").nth(1)).toHaveCSS("transform", "none");
  // El Catálogo no depende del movimiento: sigue ahí, con todas las marcas.
  await expect(
    page.getByRole("region", { name: "Catálogo" }).locator("[data-cat-row]"),
  ).toHaveCount(TODAS.length);
});

test("Populares (2.ª sección): lista de marcas con imagen siempre en su centro al pasar por encima", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.nv.top + 2);
  const rows = page.locator("[data-nv-row]");
  await expect(page.locator("[data-nv] h2")).toHaveText("LAS MÁS POPULARES");
  await expect(rows).toHaveCount(POPULARES.length);
  for (const [i, name] of POPULARES.entries()) await expect(rows.nth(i)).toContainText(name);
  // Solo el titular a la izquierda; a la derecha, la web de la marca (se abre en otra pestaña).
  await expect(page.locator("[data-stk] p")).toHaveCount(0);
  await expect(rows.first()).toContainText("satenier.example");
  await expect(rows.first()).not.toContainText("piezas");
  await expect(rows.first()).toHaveAttribute("href", /^https:\/\/satenier\.example\/?$/);
  await expect(rows.first()).toHaveAttribute("target", "_blank");

  const stage = page.locator("[data-nv-stage]");
  const center = async (selector: string) => {
    const box = await page.locator(selector).boundingBox();
    return { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + (box?.height ?? 0) / 2 };
  };
  await expect(stage).not.toHaveAttribute("data-on");

  await rows.first().hover();
  await expect(stage).toHaveAttribute("data-on");
  const list = await center("[data-nv-rows]");
  const first = await center("[data-nv-stage]");
  expect(Math.abs(first.x - list.x)).toBeLessThan(2);
  expect(Math.abs(first.y - list.y)).toBeLessThan(40);

  // Otra fila: la imagen no se mueve y entra una capa nueva por encima, que acaba tapando la anterior.
  await rows.last().hover();
  expect(await center("[data-nv-stage]")).toEqual(first);
  await expect(stage.locator("> div")).toHaveCount(1, { timeout: 2000 });

  // Cursor: el logo de la marca sobre su fila (si tiene), el punto sobre las demás y al salir.
  const badge = page.locator("[data-cursor] + div");
  const withLogo = page.locator("[data-nv-row][data-cursor-logo]").first();
  await withLogo.hover();
  await expect(badge).toHaveAttribute("data-on", "");
  await expect(badge.locator("img")).toHaveAttribute(
    "src",
    (await withLogo.getAttribute("data-cursor-logo")) ?? "",
  );

  await page.mouse.move(5, 5);
  await expect(badge).not.toHaveAttribute("data-on");
  await expect(stage).not.toHaveAttribute("data-on");
  await expect(stage.locator("> div")).toHaveCount(0);
});

test("Populares → Emergentes: todo el fondo pasa de negro a blanco mientras Emergentes sube", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const dark = () =>
    page.locator("[data-cat-dark]").evaluate((el) => Number(getComputedStyle(el).opacity));
  const top = (selector: string) =>
    page.locator(selector).evaluate((el) => el.getBoundingClientRect().top);
  const firstTile = () =>
    page
      .locator("[data-cat-cell]")
      .first()
      .evaluate((el) => Number(getComputedStyle(el).opacity));
  const scrollTo = (y: number) => page.evaluate((v) => window.scrollTo(0, v), y);
  const cat = page.locator("[data-cat]");
  const travel = g.pin.height - g.vh;

  // Emergentes va justo después de Populares, sin solaparse.
  expect(Math.abs(g.pin.top - (g.nv.top + g.nv.height))).toBeLessThanOrEqual(2);
  await expect(page.locator("[data-cat] h2")).toHaveText("LAS EMERGENTES");

  // Populares no retiene el scroll: su lista se mueve desde el primer píxel.
  await scrollTo(g.nv.top);
  await expect.poll(() => top("[data-nv]"), { timeout: 4000 }).toBeCloseTo(0, -1);
  const listTop = await top("[data-nv-rows]");
  await scrollTo(g.nv.top + 120);
  await expect.poll(() => top("[data-nv-rows]"), { timeout: 4000 }).toBeCloseTo(listTop - 120, -1);

  // Al empezar a entrar, Emergentes sigue con el mismo negro que Populares.
  await scrollTo(g.pin.top - g.vh * 0.9);
  await expect.poll(dark, { timeout: 4000 }).toBe(1);
  await expect(cat).not.toHaveAttribute("data-light");

  // A media entrada: las dos secciones se mueven, el fondo va por la mitad y las piezas aparecen.
  await scrollTo(g.pin.top - g.vh / 2);
  await expect.poll(() => top("[data-cat]"), { timeout: 4000 }).toBeCloseTo(g.vh / 2, -1);
  expect(await top("[data-nv-rows]")).toBeLessThan(g.vh / 2);
  await expect.poll(dark, { timeout: 4000 }).toBeCloseTo(0.5, 1);
  await expect.poll(firstTile, { timeout: 4000 }).toBeGreaterThan(0);
  // Populares se aclara a la vez (sus dos capas): ninguna franja negra encima de Emergentes.
  const nvLight = () =>
    page
      .locator("[data-nv-light]")
      .evaluateAll((els) => els.map((el) => Number(getComputedStyle(el).opacity)));
  for (const value of await nvLight()) expect(value + (await dark())).toBeCloseTo(1, 2);

  // Arriba del todo ya es blanca, con sus piezas enteras y el texto en oscuro para leerse.
  await scrollTo(g.pin.top);
  await expect.poll(firstTile, { timeout: 4000 }).toBe(1);
  await expect.poll(dark, { timeout: 4000 }).toBe(0);
  expect(await nvLight()).toEqual([1, 1]);
  await expect(cat).toHaveAttribute("data-light", "");

  // Y sigue en blanco mientras recorre la pista.
  await scrollTo(g.pin.top + travel / 2);
  await expect.poll(dark, { timeout: 4000 }).toBe(0);
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

  const end = g.pin.top;
  await skip.click();
  // No es un salto seco: a mitad del recorrido el scroll aún no ha llegado.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(g.nv.top + 100);
  expect(await page.evaluate(() => window.scrollY)).toBeLessThan(end - 50);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeCloseTo(end, -1);

  await expect(page.getByRole("button", { name: "Saltar al final de Emergentes" })).toBeVisible();
});

test("índice: discreto en reposo, marca la sección actual y lleva a cada una", async ({ page }) => {
  await openExplora(page);
  const index = page.getByRole("navigation", { name: "Secciones de Explora" });
  await expect(index).toHaveCSS("opacity", "0.32");
  await expect(index).toHaveCSS("mix-blend-mode", "difference");
  await expect(index.getByRole("button")).toHaveText([
    /Destacados/,
    /Populares/,
    /Emergentes/,
    /Novedades/,
    /Catálogo/,
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

test("Novedades (4.ª sección): tag «novedad», baraja que retiene el scroll; solo la línea de avance y las flechas", async ({
  page,
}) => {
  await openExplora(page);
  const section = page.getByRole("region", { name: "Novedades" });
  await expect(section.locator("h2")).toHaveText("LAS NOVEDADES");

  // Las marcas con tag «novedad», de la última en llegar a la primera, una carta por marca.
  const cards = section.locator("[data-nw-card]");
  const names = await cards.evaluateAll((els) =>
    els.map((el) => (el.getAttribute("data-nw-label") ?? "").replace(/, \d+ de .*$/, "")),
  );
  expect(names).toEqual(NOVEDADES);
  // Sin textos abajo ni controles: solo la línea de avance común.
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect(section.getByText(/en llegar/i)).toHaveCount(0);

  // Retiene el scroll: una pantalla fija más medio scroll por carta (y un poco más al final).
  const g = await geometry(page);
  const box = await section.evaluate((el) => ({
    top: el.getBoundingClientRect().top + window.scrollY,
    height: (el as HTMLElement).offsetHeight,
  }));
  const step = g.vh * 0.5;
  expect(box.height).toBeGreaterThan(g.vh + step * (NOVEDADES.length - 1));
  await page.evaluate((y) => window.scrollTo(0, y), box.top);

  // Solo la carta a la vista es un enlace accesible; las demás esperan debajo.
  const current = () => section.getByRole("link");
  await expect(current()).toHaveCount(1);
  await expect(current()).toHaveAttribute("aria-label", new RegExp(`^${NOVEDADES[0]}:`));
  await expect(cards.nth(1)).not.toBeInViewport();

  // Un paso de scroll: la segunda carta se coloca encima y sus piezas sustituyen a las de la primera.
  await page.evaluate((y) => window.scrollTo(0, y), box.top + step);
  await expect(current()).toHaveAttribute("aria-label", new RegExp(`^${NOVEDADES[1]}:`));
  await expect(cards.nth(1)).toHaveCSS("transform", "none");
  await expect(cards.nth(1)).toBeInViewport();
  await expect(section.locator("h2")).toBeInViewport();
  const pieces = section.locator("[data-nw-piece][data-on]");
  await expect(pieces.first()).toHaveCSS("transform", "none");
  expect(
    await pieces.evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.nwPiece)),
  ).toEqual(expect.arrayContaining(["1"]));
  expect(
    await pieces.evaluateAll((els) =>
      els.every((el) => (el as HTMLElement).dataset.nwPiece === "1"),
    ),
  ).toBe(true);

  // Flechas con el foco en la carta: llevan el scroll a la vecina.
  await current().focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeCloseTo(box.top + step * 2, -1);
  await expect(current()).toHaveAttribute("aria-label", new RegExp(`^${NOVEDADES[2]}:`));
  await page.keyboard.press("ArrowLeft");
  await expect(current()).toHaveAttribute("aria-label", new RegExp(`^${NOVEDADES[1]}:`));

  // Colocada la última carta, la sección suelta: el Catálogo entra por abajo. (El salto se
  // repite por si Lenis aún remataba el anterior.)
  const end = box.top + box.height - g.vh + 2;
  await expect
    .poll(
      async () => {
        await page.evaluate((y) => window.scrollTo(0, y), end);
        return current().getAttribute("aria-label");
      },
      { timeout: 8000 },
    )
    .toMatch(new RegExp(`^${NOVEDADES.at(-1)}:`));
  await expect(page.getByRole("region", { name: "Catálogo" })).toBeInViewport();
});

test("línea de avance: aparece en cada sección, se llena con ella y se va entre secciones", async ({
  page,
}) => {
  await openExplora(page);
  const line = page.locator("[data-hint]");
  const fill = page.locator("[data-hint-fill]");
  const scale = (el: typeof line) =>
    el.evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a);
  await expect(line).toHaveCSS("mix-blend-mode", "difference");

  // Destacados: a la vista, con el avance del carrusel (primera marca: vacía).
  await expect(line).toHaveCSS("opacity", "1");
  expect(await scale(fill)).toBeCloseTo(0, 2);

  // Populares: sin línea.
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.nv.top + g.nv.height / 2);
  await expect(line).toHaveCSS("opacity", "0");

  // Novedades: a mitad de su baraja, a medio llenar.
  const box = await page.getByRole("region", { name: "Novedades" }).evaluate((el) => ({
    top: el.getBoundingClientRect().top + window.scrollY,
    height: (el as HTMLElement).offsetHeight,
  }));
  const vh = await page.evaluate(() => window.innerHeight);
  const travel = box.height - vh;
  await page.evaluate((y) => window.scrollTo(0, y), box.top + travel / 2);
  await expect(line).toHaveCSS("opacity", "1");
  await expect.poll(() => scale(fill)).toBeCloseTo(0.5, 1);

  // Entre Novedades y el Catálogo no hay línea: se ha ido.
  await page.evaluate((y) => window.scrollTo(0, y), box.top + travel + vh * 0.5);
  await expect(line).toHaveCSS("opacity", "0");
});

test("Catálogo (5.ª sección): solo un grid asimétrico con la foto de todas las marcas", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const catalog = page.getByRole("region", { name: "Catálogo" });
  await page.evaluate((y) => window.scrollTo(0, y), g.er.top);

  // Todas, sin repetir, en orden alfabético y cada una con su foto; sin titular ni controles.
  const tiles = catalog.locator("[data-cat-row]");
  const names = await tiles.evaluateAll((els) =>
    els.map((el) => el.querySelector("img")?.alt ?? ""),
  );
  expect(names).toEqual(TODAS);
  await expect(catalog.getByRole("searchbox")).toHaveCount(0);
  await expect(catalog.getByRole("button")).toHaveCount(0);

  // No es uniforme: las fotos tienen anchos y proporciones distintos.
  const shapes = await tiles.evaluateAll((els) =>
    els.map((el) => {
      const r = el.querySelector("[class*='photo']")?.getBoundingClientRect();
      return r ? `${Math.round(r.width)}x${Math.round(r.height)}` : "";
    }),
  );
  expect(new Set(shapes).size).toBeGreaterThan(3);
});

test("Catálogo: con el hover, el nombre sube encima de la foto y las piezas salen a un lado", async ({
  page,
}) => {
  await openExplora(page);
  const catalog = page.getByRole("region", { name: "Catálogo" });
  const tile = catalog.getByRole("link", { name: /^Satenier: ver sus \d+ piezas/ });
  await tile.scrollIntoViewIfNeeded();
  const name = tile.locator("[class$='_name']");
  const pieces = tile.locator("[class$='_piece']");
  await expect(name).not.toHaveCSS("transform", "none");
  await tile.hover();
  await expect(name).toHaveText("Satenier");
  await expect(name).toHaveCSS("transform", "none");
  await expect(pieces).toHaveCount(3);
  await expect(pieces.last()).toHaveCSS("opacity", "1");
  // Encima de la foto el nombre; a un lado (fuera de la foto) las piezas.
  const photo = await tile.locator("[class$='_photo']").boundingBox();
  const nameBox = await name.boundingBox();
  const pieceBox = await pieces.first().boundingBox();
  expect((nameBox?.y ?? 0) + (nameBox?.height ?? 0)).toBeLessThanOrEqual((photo?.y ?? 0) + 1);
  const outside =
    (pieceBox?.x ?? 0) >= (photo?.x ?? 0) + (photo?.width ?? 0) ||
    (pieceBox?.x ?? 0) + (pieceBox?.width ?? 0) <= (photo?.x ?? 0);
  expect(outside).toBe(true);
});

test("Catálogo: cada marca lleva a sus piezas o, sin stock, a su tienda", async ({ page }) => {
  await openExplora(page);
  const catalog = page.getByRole("region", { name: "Catálogo" });
  const satenier = catalog.getByRole("link", { name: /^Satenier: ver sus \d+ piezas/ });
  await expect(satenier).toHaveAttribute("href", `/marketplace?brand=${SATENIER_ID}`);
  const bajoCero = catalog.getByRole("link", { name: /^Bajo Cero: sin stock, ir a su tienda/ });
  await expect(bajoCero).toHaveAttribute("target", "_blank");
  await expect(bajoCero).toHaveAttribute("rel", "noopener noreferrer");

  await satenier.scrollIntoViewIfNeeded();
  await satenier.click();
  await expect(page.locator("main")).toHaveAttribute("data-view", "market");
  await expect.poll(() => new URL(page.url()).search).toBe(`?brand=${SATENIER_ID}`);
});

test("Emergentes → Novedades → Catálogo: cada una sigue a la anterior, sin huecos", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const nw = await page.locator("[data-nw]").evaluate((el) => ({
    top: el.getBoundingClientRect().top + window.scrollY,
    height: (el as HTMLElement).offsetHeight,
  }));
  expect(Math.abs(nw.top - (g.pin.top + g.pin.height))).toBeLessThanOrEqual(2);
  expect(Math.abs(g.er.top - (nw.top + nw.height))).toBeLessThanOrEqual(2);
  await page.evaluate((y) => window.scrollTo(0, y), g.er.top - 0.2 * g.vh);
  await expect(page.locator("[data-er] [data-cat-item]").first()).toHaveAttribute("data-seen", "", {
    timeout: 4000,
  });
});

test("Emergentes: el alto sale del recorrido medido y la escalera llega justo al final en diagonal", async ({
  page,
}) => {
  await openExplora(page);
  const g = await geometry(page);
  const track = () =>
    page.locator("[data-cat-track]").evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return { x: m.e, y: m.f };
    });

  // Alto = pantalla (vh) + scroll que necesita la pista (1,42 px de pista por px).
  const { travel, drift } = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>("[data-cat-track]");
    const pin = document.querySelector<HTMLElement>("[data-cat-pin]");
    const cells = [...document.querySelectorAll<HTMLElement>("[data-cat-cell]")];
    return {
      travel: el && pin ? el.scrollWidth - pin.clientWidth : 0,
      drift: (cells.at(-1)?.offsetTop ?? 0) - (cells[0]?.offsetTop ?? 0),
    };
  });
  expect(travel).toBeGreaterThan(0);
  expect(drift).toBeGreaterThan(0);
  const scroll = travel / 1.42;
  expect(Math.abs(g.pin.height - (g.vh + scroll))).toBeLessThanOrEqual(1);

  // Quieta mientras sube; a mitad del recorrido, a mitad de la pista.
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top - 0.5 * g.vh);
  await expect.poll(async () => (await track()).x, { timeout: 4000 }).toBeCloseTo(0, 0);
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + scroll / 2);
  await expect.poll(async () => (await track()).x, { timeout: 4000 }).toBeCloseTo(-travel / 2, -1);
  expect((await track()).y).toBeCloseTo(-drift / 2, -1);
  // Justo cuando se suelta la escena, la pista está en su final (ni antes ni después).
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + g.pin.height - g.vh);
  await expect.poll(async () => (await track()).x, { timeout: 5000 }).toBeCloseTo(-travel, -1);
  expect((await track()).y).toBeCloseTo(-drift, -1);
});

/** Lleva Emergentes a mitad del recorrido y devuelve la primera marca (con selector) entera a la vista. */
async function visibleCell(page: Page, selector = "[data-cat] [data-cat-cell]") {
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top + 0.3 * (g.pin.height - g.vh));
  await page.waitForTimeout(1500);
  const cells = page.locator(selector);
  const index = await cells.evaluateAll((els) =>
    els.findIndex((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    }),
  );
  expect(index).toBeGreaterThanOrEqual(0);
  return cells.nth(index);
}

test("cursor: logo de la marca sobre su foto, punto sobre el resto y al salir", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "el cursor propio solo va con pointer fine");
  await openExplora(page);
  const dot = page.locator("[data-cursor]");
  const badge = page.locator("[data-cursor] + div");
  const cell = await visibleCell(page, "[data-cat] [data-cat-cell]:has([data-cursor-logo])");
  const photo = cell.locator("[data-cursor-logo]");
  // Imagen vertical en cualquier pantalla: sin <picture>.
  expect(await photo.locator("img").evaluate((img) => img.parentElement?.tagName)).not.toBe(
    "PICTURE",
  );

  await photo.hover();
  await expect(dot).toHaveAttribute("data-off", "");
  await expect(badge).toHaveAttribute("data-on", "");
  await expect(badge.locator("img")).toBeVisible();
  await expect(badge.locator("img")).toHaveCSS("opacity", "1");

  await page.mouse.move(5, 5);
  await expect(dot).not.toHaveAttribute("data-off");
  await expect(badge).not.toHaveAttribute("data-on");
});

test("Emergentes: el hover saca la línea, escribe el nombre y muestra productos sin mover nada", async ({
  page,
}) => {
  await openExplora(page);
  const cell = await visibleCell(page, "[data-cat] [data-cat-cell]:not([data-open])");
  const line = cell.locator("span").first();
  const scaleY = () => line.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).d);
  const box = () =>
    cell.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [r.x, r.y, r.width, r.height];
    });
  const letters = cell.locator("h3 span");
  const products = cell.locator("ul > li");

  expect(await scaleY()).toBe(0);
  await expect(letters.last()).toHaveCSS("opacity", "0");
  const before = await box();

  await cell.locator("img").first().hover();
  await expect.poll(scaleY, { timeout: 2000 }).toBeCloseTo(1, 1);
  await expect(letters.last()).toHaveCSS("opacity", "1", { timeout: 3000 });
  if (await products.count()) {
    expect(await products.count()).toBeLessThanOrEqual(3);
    await expect(products.last()).toHaveCSS("opacity", "1", { timeout: 3000 });
  }
  expect(await box()).toEqual(before);

  await page.mouse.move(5, 5);
  await expect(letters.last()).toHaveCSS("opacity", "0", { timeout: 2000 });
});

test("Emergentes (3.ª sección): tag «emergente», de la más joven a la más antigua, y 1 de cada 3 abierta", async ({
  page,
}) => {
  await openExplora(page);
  const names = await page
    .locator("[data-cat] [data-cat-cell]")
    .evaluateAll((els) => els.map((el) => el.querySelector("img")?.getAttribute("alt") ?? ""));
  expect(names).toEqual(EMERGENTES);
  await expect(page.locator("[data-cat] h2")).toHaveText("LAS EMERGENTES");

  // La primera con piezas va abierta y, al entrar en pantalla, enseña nombre y productos sin hover.
  const open = page.locator("[data-cat] [data-open]");
  expect(await open.count()).toBeGreaterThanOrEqual(Math.floor(EMERGENTES.length / 4));
  const g = await geometry(page);
  await page.evaluate((y) => window.scrollTo(0, y), g.pin.top);
  await expect(open.first()).toHaveAttribute("data-seen", "", { timeout: 4000 });
  await expect(open.first().locator("h3 span").last()).toHaveCSS("opacity", "1", { timeout: 3000 });
  await expect(open.first().locator("ul > li").first()).toHaveCSS("opacity", "1", {
    timeout: 3000,
  });
});

test("imágenes rotas: Emergentes usa la foto del primer producto", async ({ page }) => {
  await openExplora(page);
  for (const scope of ["[data-cat]"]) {
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
