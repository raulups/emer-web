import { expect, type Page, test } from "@playwright/test";

const section = (page: Page) => page.locator("#sugiere");

async function toSugiere(page: Page, query = "") {
  await page.goto(`/${query}`);
  await expect(page.locator("#marcas[data-registered]")).toBeAttached();
  await section(page).evaluate((el) => el.scrollIntoView());
  await page.waitForTimeout(600);
}

test.describe("07-sugiere", () => {
  test("cabecera, campos y contacto", async ({ page }) => {
    await toSugiere(page);
    await expect(section(page).getByRole("heading", { level: 2 })).toHaveText(/¿falta\s*alguna\?/i);
    await expect(section(page).getByLabel("NOMBRE DE LA MARCA")).toHaveAttribute("maxlength", "32");
    await expect(section(page).getByRole("link", { name: /Mail/ })).toHaveAttribute(
      "href",
      "mailto:hola@emer.app",
    );
  });

  test("vacío: ENVIAR no envía y enfoca el nombre", async ({ page }) => {
    await toSugiere(page);
    const send = section(page).getByRole("button", { name: /ENVIAR/ });
    await expect(send).toHaveAttribute("aria-disabled", "true");
    await send.press("Enter");
    await expect(section(page).getByLabel("NOMBRE DE LA MARCA")).toBeFocused();
    await expect(section(page).getByRole("status")).toHaveText("");
  });

  test("Enter envía: sello RECIBIDA con la palabra normalizada", async ({ page }) => {
    await toSugiere(page);
    const instagram = section(page).getByLabel("INSTAGRAM");
    await instagram.fill("@satenier");
    await instagram.press("Enter");
    await expect(section(page).getByRole("status")).toHaveText("SATENIER: sugerencia recibida.");
    await expect(section(page).getByText("RECIBIDA", { exact: true })).toHaveCSS("opacity", "1");
    await section(page)
      .getByRole("button", { name: /SUGERIR OTRA/ })
      .click();
    await expect(section(page).getByLabel("NOMBRE DE LA MARCA")).toBeFocused();
    await expect(section(page).getByLabel("NOMBRE DE LA MARCA")).toHaveValue("");
  });

  test("error del backend: mantiene los datos y avisa", async ({ page }) => {
    await toSugiere(page);
    const name = section(page).getByLabel("NOMBRE DE LA MARCA");
    await name.fill("error");
    await section(page)
      .getByRole("button", { name: /ENVIAR/ })
      .click();
    await expect(section(page).getByRole("alert")).toHaveText(
      "No se ha podido enviar. Inténtalo otra vez.",
    );
    await expect(name).toHaveValue("error");
  });

  test("prellenado con ?sugiere=", async ({ page }) => {
    await toSugiere(page, "?sugiere=Nueva");
    await expect(section(page).getByLabel("NOMBRE DE LA MARCA")).toHaveValue("Nueva");
  });
});
