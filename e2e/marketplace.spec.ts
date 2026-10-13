import { expect, type Page, test } from "@playwright/test";

/** Datos de src/lib/api/fixtures.ts: 9 marcas con productos y 49 productos. */
const TOTAL = 49;

const products = (page: Page) => page.getByRole("region", { name: "Productos" }).locator("article");
const menu = (page: Page) => page.getByRole("complementary", { name: "Menú del catálogo" });
const filtersButton = (page: Page) => menu(page).getByRole("button", { name: /^FILTROS/ });
const panel = (page: Page) => page.getByRole("dialog", { name: "Filtros" });

test.beforeEach(async ({ page }, info) => {
  await page.goto("/web");
  await expect(products(page).first()).toBeVisible();
  // En móvil el menú empieza oculto.
  if (info.project.name === "mobile") await page.getByRole("button", { name: "Menú" }).click();
});

test("grid con la primera página y carga infinita al bajar", async ({ page }) => {
  await expect(products(page)).toHaveCount(24);
  await expect(products(page).first()).toContainText("Satenier");
  // Cada vez que se llega al final se pide la página siguiente.
  const last = page.getByRole("region", { name: "Productos" }).locator("li").last();
  await expect
    .poll(async () => {
      await last.scrollIntoViewIfNeeded();
      return products(page).count();
    })
    .toBe(TOTAL);
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
  await expect(products(page)).toHaveCount(24);
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
  const card = products(page).first();
  await card.hover();
  await expect(card.getByText("2/2")).toBeVisible();
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
