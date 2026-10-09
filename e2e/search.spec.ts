import { expect, type Page, test } from "@playwright/test";

const dialog = (page: Page) => page.getByRole("dialog", { name: "Buscar marcas" });
const input = (page: Page) => dialog(page).getByRole("combobox");

async function openSearch(page: Page) {
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/is-loading/);
  const hero = page.locator("#marcas:not([aria-busy])");
  await expect(hero).toHaveAttribute("data-registered", "");
  await hero.getByRole("button", { name: /BUSCAR/ }).click();
  await expect(input(page)).toBeFocused();
  await page.waitForTimeout(900);
}

test.describe("09-buscar", () => {
  test("se abre con el botón, enfoca el campo y para el scroll", async ({ page }) => {
    await openSearch(page);
    await expect(dialog(page)).toHaveAttribute("aria-modal", "true");
    await expect(page.locator("html")).toHaveAttribute("data-search-open", "");
  });

  test("filtra por nombre sin acentos, resalta y cuenta", async ({ page }) => {
    await openSearch(page);
    await input(page).fill("sc");
    const options = dialog(page).getByRole("option");
    await expect(options).toHaveCount(1);
    await expect(options.first()).toContainText("SCUFFERS");
    await expect(dialog(page).getByText("1 MARCA", { exact: true })).toBeVisible();
    await input(page).fill("a");
    await expect(dialog(page).getByText(/^0?\d MARCAS$/)).toBeVisible();
  });

  test("flechas seleccionan, Enter abre la tienda en pestaña nueva", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __opened: string[] };
      w.__opened = [];
      window.open = (url) => {
        w.__opened.push(String(url));
        return null;
      };
    });
    await openSearch(page);
    await input(page).fill("a");
    await page.keyboard.press("ArrowDown");
    await expect(input(page)).toHaveAttribute("aria-activedescendant", "sr-1");
    await expect(dialog(page).getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    const opened = await page.evaluate(
      () => (window as unknown as { __opened: string[] }).__opened,
    );
    expect(opened).toHaveLength(1);
    expect(opened[0]).toContain(".example");
  });

  test("Esc borra el texto y, sin texto, cierra devolviendo el foco", async ({ page }) => {
    await openSearch(page);
    await input(page).fill("sat");
    await page.keyboard.press("Escape");
    await expect(input(page)).toHaveValue("");
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator("#marcas").getByRole("button", { name: /BUSCAR/ })).toBeFocused();
    await expect(page.locator("html")).not.toHaveAttribute("data-search-open", "");
  });

  test("el foco queda atrapado dentro del diálogo", async ({ page }) => {
    await openSearch(page);
    await page.keyboard.press("Tab");
    await expect(dialog(page).getByRole("button", { name: /CERRAR/ })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(input(page)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog(page).getByRole("button", { name: /CERRAR/ })).toBeFocused();
  });

  test("sin resultados: «Sugiérela.» cierra y prellena Sugiere", async ({ page }) => {
    await openSearch(page);
    await input(page).fill("zzz");
    await expect(dialog(page).getByText("Ninguna marca con ese nombre.")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Sugiérela." }).click();
    await expect(dialog(page)).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator("#sugiere").getByLabel("NOMBRE DE LA MARCA")).toHaveValue("zzz");
  });

  test("clic en el velo cierra", async ({ page, isMobile }) => {
    test.skip(isMobile, "Escritorio");
    await openSearch(page);
    await page.mouse.click(700, 880);
    await expect(dialog(page)).toHaveCount(0, { timeout: 3000 });
  });

  test("movimiento reducido: aparece sin telón", async ({ browser, isMobile }) => {
    test.skip(isMobile, "Crea su propio contexto de escritorio");
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await openSearch(page);
    await input(page).fill("sat");
    await expect(dialog(page).getByRole("option")).toHaveCount(1);
    await context.close();
  });
});
