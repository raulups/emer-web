import { expect, test } from "@playwright/test";

test.describe("08-footer", () => {
  test("textos, año y destinos pendientes sin enlace", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toContainText("MARCAS PEQUEÑAS, UN SOLO SITIO");
    await expect(footer).toContainText(`© ${new Date().getFullYear()} EMER`);
    await expect(footer.getByRole("img", { name: "Emer" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "MARCAS" })).toHaveAttribute("href", "#marcas");
    await expect(footer.getByRole("link", { name: "MARKETPLACE", exact: true })).toHaveAttribute(
      "href",
      "/marketplace",
    );
    // Destinos aún sin definir: texto, nunca enlaces muertos.
    for (const name of ["TIENDAS", "PARA MARCAS", "PRIVACIDAD", "TÉRMINOS"]) {
      await expect(footer.getByText(name, { exact: true })).toBeVisible();
      await expect(footer.getByRole("link", { name, exact: true })).toHaveCount(0);
    }
    await expect(footer.getByText(/APP STORE/)).toBeVisible();
    await expect(footer.getByRole("link", { name: /APP STORE/ })).toHaveCount(0);
  });
});
