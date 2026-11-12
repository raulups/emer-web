import { expect, type Page, test } from "@playwright/test";

/** Datos de src/lib/api/fixtures.ts: 9 marcas con productos y 49 productos. */
const TOTAL = 49;

const products = (page: Page) => page.getByRole("region", { name: "Productos" }).locator("article");
const menu = (page: Page) => page.getByRole("complementary", { name: "Menú del catálogo" });
const filtersButton = (page: Page) => menu(page).getByRole("button", { name: /^FILTROS/ });
const panel = (page: Page) => page.getByRole("dialog", { name: "Filtros" });
/** Nombres de las fixtures: «<Tipo> <Marca> <n>» → [tipo, marca] de cada tarjeta, en orden. */
const kinds = async (page: Page) =>
  (await products(page).locator("h3").allTextContents())
    .map((t) =>
      /^(Sudadera|Camiseta|Pantalón|Gorra|Chaqueta|Bolso|Cinturón) (.+) \d+$/.exec(t.trim()),
    )
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => [m[1] ?? "", m[2] ?? ""] as const);
const blocksOf = (list: readonly (readonly [string, string])[]) =>
  list.map(([kind]) => kind).filter((kind, i, all) => kind !== all[i - 1]);

test.beforeEach(async ({ page }, info) => {
  test.skip(
    info.project.name === "mobile",
    "el Marketplace de móvil es otro diseño (e2e/mobile.spec.ts)",
  );
  await page.goto("/web");
  await expect(products(page).first()).toBeVisible();
});

test("orden por defecto: categorías en orden, marcas intercaladas y carga infinita", async ({
  page,
}) => {
  await expect(products(page).first()).toContainText("Sudadera");
  // Cada vez que se llega al final se pide la página siguiente (y después, la categoría siguiente).
  const last = page.getByRole("region", { name: "Productos" }).locator("li").last();
  await expect
    .poll(async () => {
      await last.scrollIntoViewIfNeeded();
      return products(page).count();
    })
    .toBe(TOTAL);

  const names = await kinds(page);
  expect(names).toHaveLength(TOTAL);
  const blocks = blocksOf(names);
  // CATEGORY_ORDER y, al final, las que no están en la lista (Chaquetas, Bolsos, Accesorios).
  expect(blocks).toEqual([
    "Sudadera",
    "Camiseta",
    "Pantalón",
    "Gorra",
    "Chaqueta",
    "Bolso",
    "Cinturón",
  ]);
  // Marcas intercaladas: las primeras sudaderas son de marcas distintas.
  const firstBrands = names.slice(0, 3).map(([, brand]) => brand);
  expect(new Set(firstBrands).size).toBe(3);
});

test("categorías: selección única con línea; marcas: selección múltiple", async ({ page }) => {
  const all = menu(page).getByRole("button", { name: /^Ver todo/ });
  await expect(all).toHaveAttribute("aria-current", "true");

  await menu(page)
    .getByRole("button", { name: /^Gorras y gorros/ })
    .click();
  await expect(menu(page).getByRole("button", { name: /^Gorras y gorros/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(all).not.toHaveAttribute("aria-current", "true");
  await expect(products(page).first()).toContainText("Gorra");

  await menu(page).getByRole("button", { name: "Ver más · 3" }).click();
  await menu(page)
    .getByRole("button", { name: /^Satenier/ })
    .click();
  await menu(page)
    .getByRole("button", { name: /^Ruido/ })
    .click();
  await expect(menu(page).getByRole("button", { name: /^Satenier/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(menu(page).getByRole("button", { name: "BORRAR" })).toBeVisible();
  // Gorras de Satenier (3) y Ruido (1) en las fixtures.
  await expect(products(page)).toHaveCount(4);
  for (const card of await products(page).all()) {
    await expect(card).toContainText(/Satenier|Ruido/);
  }

  await menu(page).getByRole("button", { name: "BORRAR" }).click();
  await expect(all).toHaveAttribute("aria-current", "true");
  // Sin filtros vuelve el orden por defecto (empieza por Sudaderas).
  await expect(products(page).first()).toContainText("Sudadera");
});

test("MARCAS: «Ver más» abre la lista y «Ver menos» la recoge", async ({ page }) => {
  const tinta = menu(page).getByRole("button", { name: /^Tinta/ });
  await expect(tinta).not.toBeInViewport();
  await menu(page).getByRole("button", { name: "Ver más · 3" }).click();
  await expect(menu(page).getByRole("button", { name: "Ver menos" })).toBeVisible();
  await tinta.scrollIntoViewIfNeeded();
  await expect(tinta).toBeVisible();
  await menu(page).getByRole("button", { name: "Ver menos" }).click();
  await expect(menu(page).getByRole("button", { name: "Ver más · 3" })).toBeVisible();
});

test("CATEGORÍAS: 5 visibles y «Ver más» abre hasta 8", async ({ page }) => {
  const bolsos = menu(page).getByRole("button", { name: /^Bolsos/ });
  await expect(menu(page).getByRole("button", { name: /^Chaquetas/ })).toBeInViewport();
  await expect(bolsos).not.toBeInViewport();
  await menu(page).getByRole("button", { name: "Ver más · 2" }).click();
  await expect(bolsos).toBeInViewport();
  await bolsos.click();
  await expect(bolsos).toHaveAttribute("aria-current", "true");
});

test("el menú cabe sin scroll de primeras y hace scroll al abrir las listas", async ({ page }) => {
  const overflow = () =>
    menu(page)
      .locator("div")
      .first()
      .evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await menu(page).getByRole("button", { name: "Ver más · 3" }).click();
  await menu(page).getByRole("button", { name: "Ver más · 2" }).click();
  await expect.poll(overflow).toBeGreaterThan(0);
});

test("ficha de marca de la primera seleccionada, con fallback de imagen", async ({ page }) => {
  await menu(page)
    .getByRole("button", { name: /^Imagen Rota/ })
    .click();
  const card = menu(page).getByRole("figure", { name: "Marca: Imagen Rota" });
  await expect(card).toBeVisible();
  // La imagen de la marca no existe: se usa la del primer producto.
  await expect(card.getByRole("img", { name: "Imagen Rota" })).toHaveAttribute(
    "src",
    /\/assets\/deco\/.+\.png$/,
  );
});

test("panel de filtros: talla, VER n, Esc y estado vacío", async ({ page }) => {
  await filtersButton(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cerrar filtros" })).toBeFocused();

  await panel(page).getByRole("button", { name: "M", exact: true }).click();
  await expect(panel(page).getByRole("button", { name: "M", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(filtersButton(page)).toHaveText("FILTROS (1)");
  await expect(panel(page).getByRole("button", { name: /^VER \d+$/ })).not.toHaveText(
    `VER ${TOTAL}`,
  );

  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(filtersButton(page)).toBeFocused();

  // Marea solo tiene tallas S–XL: con ÚNICA no queda nada.
  await filtersButton(page).click();
  await panel(page).getByRole("button", { name: "M", exact: true }).click();
  await panel(page).getByRole("button", { name: "ÚNICA" }).click();
  await panel(page).getByRole("button", { name: /^VER/ }).click();
  await menu(page)
    .getByRole("button", { name: /^Marea/ })
    .click();
  await expect(page.getByText("SIN RESULTADOS")).toBeVisible();
  await expect(page.getByText("Prueba con otra talla o quita algún filtro.")).toBeVisible();
  // Los filtros activos siguen en la barra del grid; sin ÚNICA vuelven las piezas de Marea.
  const active = page.getByRole("list", { name: "Filtros activos" });
  await expect(active.getByRole("button", { name: "Quitar Marea" })).toBeVisible();
  await active.getByRole("button", { name: "Quitar Talla ÚNICA" }).click();
  await expect(products(page).first()).toContainText("Marea");
});

test("vacío: BORRAR FILTROS vuelve al catálogo completo", async ({ page }) => {
  await menu(page)
    .getByRole("button", { name: /^Marea/ })
    .click();
  await filtersButton(page).click();
  await panel(page).getByRole("button", { name: "ÚNICA" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "NADA POR AQUÍ" })).toBeVisible();
  await page.getByRole("button", { name: "BORRAR FILTROS" }).click();
  await expect(products(page).first()).toContainText("Sudadera");
  await expect(menu(page).getByRole("button", { name: /^Ver todo/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
});

test("VISTA: productos por fila de 2 a 6, recordados al volver", async ({ page }) => {
  const grid = page.getByRole("region", { name: "Productos" }).locator("[data-grid]");
  const columns = () =>
    grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  const view = page.getByRole("group", { name: "Productos por fila" });
  await expect(view).toHaveCSS("position", "fixed");
  await expect(view).toHaveCSS("mix-blend-mode", "difference");
  await expect(view.getByRole("button", { name: "4 por fila" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(await columns()).toBe(4);
  for (const n of [2, 3, 5, 6]) {
    await view.getByRole("button", { name: `${n} por fila` }).click();
    await expect.poll(columns).toBe(n);
  }
  // La cookie hace que el servidor pinte ya con 6 (sin salto al hidratar).
  await page.reload();
  expect(await columns()).toBe(6);
  await expect(view.getByRole("button", { name: "6 por fila" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("loader: mientras llegan los resultados sale la tragaperras de categorías", async ({
  page,
}) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/products?**", async (route) => {
    await gate;
    await route.continue();
  });
  await menu(page)
    .getByRole("button", { name: /^Camisetas/ })
    .click();
  const loader = page.getByText("BUSCANDO PIEZAS");
  await expect(loader).toBeVisible();
  await expect(page.getByRole("region", { name: "Productos" }).locator("[data-grid]")).toHaveCSS(
    "opacity",
    "0.12",
  );
  release();
  await expect(loader).toBeHidden();
  await expect(products(page).first()).toContainText("Camiseta");
});

test("error: SIN CONEXIÓN con cinta y REINTENTAR vuelve a pedir", async ({ page }) => {
  let fail = true;
  await page.route("**/api/products?**", (route) =>
    fail
      ? route.fulfill({ status: 500, json: { success: false, data: null, error: "x" } })
      : route.continue(),
  );
  await menu(page)
    .getByRole("button", { name: /^Camisetas/ })
    .click();
  const alert = page.getByRole("alert");
  await expect(alert.getByRole("heading", { name: "SIN CONEXIÓN" })).toBeVisible();
  fail = false;
  await alert.getByRole("button", { name: "REINTENTAR" }).click();
  await expect(products(page).first()).toContainText("Camiseta");
});

test("panel de filtros: COLOR muestra 5 y «Ver más» abre hasta 8", async ({ page }) => {
  await filtersButton(page).click();
  const naranja = panel(page).getByRole("button", { name: /^Naranja/ });
  await expect(panel(page).getByRole("button", { name: /^Verde/ })).toBeInViewport();
  await expect(naranja).not.toBeInViewport();
  await panel(page).getByRole("button", { name: "Ver más · 3" }).click();
  await expect(naranja).toBeInViewport();
  await naranja.click();
  await expect(naranja).toHaveAttribute("aria-pressed", "true");
});

test("precio: el slider se maneja con teclado", async ({ page }) => {
  await filtersButton(page).click();
  const min = panel(page).getByRole("slider", { name: "Precio mínimo" });
  await min.focus();
  await page.keyboard.press("End");
  await expect(min).toHaveAttribute("aria-valuenow", "120");
  await expect(filtersButton(page)).toHaveText("FILTROS (1)");
  await expect(panel(page).getByRole("button", { name: /^VER/ })).toHaveText(/^VER [1-9]\d?$/);
});

test("tarjeta: en hover pasa a la 2.ª foto, sin tallas; nombre en una línea con el precio", async ({
  page,
}) => {
  // Está en la 2.ª tanda del orden por defecto (Camisetas): puede llegar mientras el grid crece.
  const card = products(page).filter({ hasText: "Camiseta Satenier 1" });
  // Posición de la raya activa del índice de fotos (0 = 1.ª foto).
  const active = () =>
    card
      .locator("span[data-active]")
      .evaluate((el) => [...(el.parentElement?.children ?? [])].indexOf(el));
  await expect(async () => {
    await card.hover();
    expect(await active()).toBe(1);
  }).toPass();
  // Ya no hay franja de tallas en la tarjeta.
  await expect(card.getByText("XL", { exact: true })).toHaveCount(0);
  await card.getByRole("button", { name: /Foto siguiente/ }).click();
  await expect.poll(active).toBe(0);
  await page.mouse.move(5, 600);
  await expect(page.locator("[data-product][data-hovered]")).toHaveCount(0);
  // Nombre: una línea, recortado con «…»; el precio, en la misma fila.
  const name = card.getByRole("button", { name: "Camiseta Satenier 1", exact: true });
  await expect(name).toHaveCSS("white-space", "nowrap");
  await expect(name).toHaveCSS("text-overflow", "ellipsis");
  const price = card.getByText(/€$/).first();
  const [nameBox, priceBox] = [await name.boundingBox(), await price.boundingBox()];
  expect(Math.abs((nameBox?.y ?? 0) - (priceBox?.y ?? 99))).toBeLessThan(6);
});

test("[ MENÚ ] oculta y muestra el menú", async ({ page }) => {
  const toggle = page.getByRole("button", { name: "Menú" });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(menu(page)).toHaveAttribute("inert", "");
  await toggle.click();
  await expect(menu(page)).not.toHaveAttribute("inert", "");
});

test("en hover las etiquetas no cambian de tamaño", async ({ page }) => {
  const label = menu(page)
    .getByRole("button", { name: /^Camisetas/ })
    .locator("span")
    .nth(1);
  const before = await label.boundingBox();
  await label.hover();
  // Geist Mono va siempre a 300: el hover se marca con el subrayado, no con el peso.
  await expect(label).toHaveCSS("font-weight", "300");
  await expect(label).not.toHaveCSS("text-decoration-color", "rgba(0, 0, 0, 0)");
  const after = await label.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.height).toBe(before?.height);
});

const RUIDO = "9f1cbd7e-5a4b-4ec2-9f5d-6b7c8d9e0f1a";
const SATENIER = "0208bdca-c705-491b-82fa-76123232670b";
/** Ruta + query de la página actual. */
const where = (page: Page) =>
  expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search);

test("?brand= abre con la marca seleccionada (también desde /marketplace)", async ({ page }) => {
  await page.goto(`/marketplace?brand=${RUIDO}`);
  await where(page).toBe(`/web?brand=${RUIDO}`);
  await expect(menu(page).getByRole("button", { name: /^Ruido/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Ruido tiene 4 productos en las fixtures: la primera página ya llega filtrada.
  await expect(products(page)).toHaveCount(4);
  for (const card of await products(page).all()) await expect(card).toContainText("Ruido");
});

test("?brand= con un UUID que no está en /brands se ignora", async ({ page }) => {
  await page.goto("/web?brand=00000000-0000-4000-8000-000000000000");
  await expect(products(page).first()).toContainText("Sudadera");
  await where(page).toBe("/web");
  await page.goto("/web?brand=no-es-un-uuid");
  await expect(products(page).first()).toContainText("Sudadera");
});

test("seleccionar marcas reescribe ?brand= sin navegar ni mover el scroll", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "document") requests.push(r.url());
  });
  await menu(page).getByRole("button", { name: "Ver más · 3" }).click();
  await menu(page)
    .getByRole("button", { name: /^Ruido/ })
    .click();
  await where(page).toBe(`/web?brand=${RUIDO}`);
  await menu(page)
    .getByRole("button", { name: /^Satenier/ })
    .click();
  await where(page).toBe(`/web?brand=${RUIDO}&brand=${SATENIER}`);
  await menu(page)
    .getByRole("button", { name: /^Ruido/ })
    .click();
  await where(page).toBe(`/web?brand=${SATENIER}`);
  // El scroll no se mueve al reescribir la URL.
  await page.evaluate(() => window.scrollTo(0, 300));
  const y = await page.evaluate(() => window.scrollY);
  await menu(page)
    .getByRole("button", { name: /^Satenier/ })
    .click();
  await where(page).toBe("/web");
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => window.scrollY)).toBe(y);
});

test("con un filtro u orden explícito se pagina normal; al quitarlo vuelve el orden por defecto", async ({
  page,
}) => {
  // ORDENAR va en la barra del grid, a un clic (sin abrir el panel).
  const sort = page.getByRole("group", { name: "ORDENAR" });
  await sort.getByRole("button", { name: "PRECIO ASCENDENTE" }).click();
  await expect(sort.getByRole("button", { name: "PRECIO ASCENDENTE" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Una sola consulta paginada: primera página de 24, mezclando categorías.
  await expect(products(page)).toHaveCount(24);
  // Una consulta normal ordenada por precio (no el recorrido por categorías).
  const prices = (await products(page).locator("h3 + span").allTextContents()).map((t) =>
    Number(t.replace(/[^\d,]/g, "").replace(",", ".")),
  );
  expect(prices.length).toBe(24);
  expect(prices).toEqual(prices.toSorted((x, y) => x - y));
  await sort.getByRole("button", { name: "NOVEDADES" }).click();
  await expect(products(page).first()).toContainText("Sudadera");
});

test("barra del grid: recuento, filtros activos que se quitan a un clic y BORRAR", async ({
  page,
}) => {
  const region = page.getByRole("region", { name: "Productos" });
  await expect(region.getByText(`${TOTAL} PIEZAS`)).toBeVisible();
  await menu(page)
    .getByRole("button", { name: /^Gorras y gorros/ })
    .click();
  await menu(page).getByRole("button", { name: "Ver más · 3" }).click();
  await menu(page)
    .getByRole("button", { name: /^Satenier/ })
    .click();
  const active = region.getByRole("list", { name: "Filtros activos" });
  await expect(active.getByRole("button")).toHaveText(["Gorras y gorros×", "Satenier×"]);
  await expect(region.getByText("3 PIEZAS")).toBeVisible();
  await active.getByRole("button", { name: "Quitar Gorras y gorros" }).click();
  await expect(active.getByRole("button")).toHaveText(["Satenier×"]);
  await expect(menu(page).getByRole("button", { name: /^Ver todo/ })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await region.getByRole("button", { name: "BORRAR" }).click();
  await expect(active).toHaveCount(0);
  await expect(region.getByText(`${TOTAL} PIEZAS`)).toBeVisible();
});

test("MARCAS: el buscador deja solo las que coinciden y Escape lo limpia", async ({ page }) => {
  const search = menu(page).getByRole("searchbox", { name: "Buscar marca" });
  await search.fill("sat");
  await expect(menu(page).getByRole("button", { name: /^Satenier/ })).toBeVisible();
  await expect(menu(page).getByRole("button", { name: /^Bajo Cero/ })).toHaveCount(0);
  await expect(menu(page).getByRole("button", { name: "Ver más · 3" })).toHaveCount(0);
  await menu(page)
    .getByRole("button", { name: /^Satenier/ })
    .click();
  await expect(products(page).first()).toContainText("Satenier");
  await search.press("Escape");
  await expect(search).toHaveValue("");
  // Vuelve la lista plegada completa, con la marca elegida marcada.
  await expect(menu(page).getByRole("button", { name: "Ver más · 3" })).toBeVisible();
  await expect(menu(page).getByRole("button", { name: /^Calma/ })).toBeVisible();
  await expect(menu(page).getByRole("button", { name: /^Satenier/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("detalle: la tarjeta abre un popup con galería, tallas y la tienda; atrás lo cierra", async ({
  page,
}) => {
  // `exact`: «Camiseta Satenier 10» también contiene el nombre.
  const open = products(page).getByRole("button", { name: "Camiseta Satenier 1", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Camiseta Satenier 1", exact: true });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/[?&]p=[0-9a-f-]{36}/);
  await expect(
    dialog.getByRole("heading", { name: "Camiseta Satenier 1", exact: true }),
  ).toBeVisible();
  // Tallas del detalle, con las agotadas tachadas; la tienda oficial, en otra pestaña.
  await expect(dialog.getByRole("list", { name: "Tallas" }).getByRole("listitem")).not.toHaveCount(
    0,
  );
  const store = dialog.getByRole("link", { name: /IR A LA TIENDA/ });
  await expect(store).toHaveAttribute("href", /satenier\.example\/products\//);
  await expect(store).toHaveAttribute("target", "_blank");
  // Galería: flechas y miniaturas.
  await dialog.getByRole("button", { name: "Foto siguiente" }).click();
  await expect(dialog.getByRole("button", { name: "Foto 2 de 2" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  // La página de detrás queda inerte; Escape cierra y quita `?p=`.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/[?&]p=/);
  // Abrir de nuevo y cerrar con «atrás» (el gesto del móvil).
  await open.click();
  await expect(dialog).toBeVisible();
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/web$/);
});

test("detalle: VER MÁS DE la marca filtra el catálogo por ella", async ({ page }) => {
  // `exact`: «Camiseta Satenier 10» también contiene el nombre.
  const open = products(page).getByRole("button", { name: "Camiseta Satenier 1", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Camiseta Satenier 1", exact: true });
  await dialog.getByRole("button", { name: "VER MÁS DE Satenier" }).click();
  await expect(dialog).toBeHidden();
  await expect(menu(page).getByRole("button", { name: /^Satenier/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  for (const item of await products(page).all()) await expect(item).toContainText("Satenier");
});

test("VISTA: la primera tarjeta visible se queda donde estaba al cambiar las columnas", async ({
  page,
}) => {
  const view = page.getByRole("group", { name: "Productos por fila" });
  await page.evaluate(() => window.scrollTo(0, 900));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(800);
  // La primera foto que asoma bajo el shell (identificada por su pieza: las fotos de ejemplo se
  // repiten entre piezas). La barra del grid ya se ha ido con el scroll.
  const first = await page.evaluate(() => {
    const medias = [...document.querySelectorAll("[data-media]")];
    const top = 76;
    const media = medias.find((m) => m.getBoundingClientRect().bottom > top);
    const id = media?.closest("[data-product]")?.getAttribute("data-product") ?? "";
    return { id, y: media?.getBoundingClientRect().top ?? 0 };
  });
  expect(first.id).not.toBe("");
  await view.getByRole("button", { name: "6 por fila" }).click();
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const media = document.querySelector(`[data-product="${id}"] [data-media]`);
        return media?.getBoundingClientRect().top ?? -1;
      }, first.id),
    )
    .toBeCloseTo(first.y, -1);
});
