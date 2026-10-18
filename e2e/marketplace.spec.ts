import { expect, type Page, test } from "@playwright/test";
import { APP_PROMPT_KEY } from "@/lib/app-links";

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
  // En el móvil el aviso de la app ya se ha visto (se prueba en e2e/mobile.spec.ts).
  await page.addInitScript((key) => sessionStorage.setItem(key, "1"), APP_PROMPT_KEY);
  await page.goto("/web");
  await expect(products(page).first()).toBeVisible();
  // En móvil el menú empieza oculto.
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menú" }).click();
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

  await menu(page).getByRole("button", { name: "Ver más · 4" }).click();
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
  await menu(page).getByRole("button", { name: "Ver más · 4" }).click();
  await expect(menu(page).getByRole("button", { name: "Ver menos" })).toBeVisible();
  await tinta.scrollIntoViewIfNeeded();
  await expect(tinta).toBeVisible();
  await menu(page).getByRole("button", { name: "Ver menos" }).click();
  await expect(menu(page).getByRole("button", { name: "Ver más · 4" })).toBeVisible();
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

test("el menú cabe sin scroll de primeras y hace scroll al abrir las listas", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "el menú móvil es un panel aparte");
  const overflow = () =>
    menu(page)
      .locator("div")
      .first()
      .evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(await overflow()).toBeLessThanOrEqual(0);
  await menu(page).getByRole("button", { name: "Ver más · 4" }).click();
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

test("tarjeta: en hover pasa a la 2.ª foto y muestra tallas", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "sin hover en táctil");
  // Está en la 2.ª tanda del orden por defecto (Camisetas): puede llegar mientras el grid crece.
  const card = products(page).filter({ hasText: "Camiseta Satenier 1" });
  await expect(async () => {
    await card.hover();
    await expect(card.getByText("2/2")).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(card.getByText("XL", { exact: true })).toBeVisible();
  await expect(card.locator("[data-soldout]")).toHaveText("S");
  await card.getByRole("button", { name: /Foto siguiente/ }).click();
  await expect(card.getByText("1/2")).toBeVisible();
  await page.mouse.move(5, 600);
  await expect(card.locator("[data-hovered]")).toHaveCount(0);
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

test("en hover las etiquetas no cambian de tamaño", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "sin hover en táctil");
  const label = menu(page)
    .getByRole("button", { name: /^Camisetas/ })
    .locator("span")
    .nth(1);
  const before = await label.boundingBox();
  await label.hover();
  await expect(label).toHaveCSS("font-weight", "500");
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

test("seleccionar marcas reescribe ?brand= sin navegar ni mover el scroll", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "el menú se abre aparte en móvil");
  const requests: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "document") requests.push(r.url());
  });
  await menu(page).getByRole("button", { name: "Ver más · 4" }).click();
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
}, info) => {
  test.skip(info.project.name === "mobile", "el menú se abre aparte en móvil");
  await filtersButton(page).click();
  await panel(page).getByRole("button", { name: "PRECIO ASCENDENTE" }).click();
  await page.keyboard.press("Escape");
  // Una sola consulta paginada: primera página de 24, mezclando categorías.
  await expect(products(page)).toHaveCount(24);
  // Una consulta normal ordenada por precio (no el recorrido por categorías).
  const prices = (await products(page).locator("h3 + span").allTextContents()).map((t) =>
    Number(t.replace(/[^\d,]/g, "").replace(",", ".")),
  );
  expect(prices.length).toBe(24);
  expect(prices).toEqual(prices.toSorted((x, y) => x - y));
  await filtersButton(page).click();
  await panel(page).getByRole("button", { name: "NOVEDADES" }).click();
  await page.keyboard.press("Escape");
  await expect(products(page).first()).toContainText("Sudadera");
});
