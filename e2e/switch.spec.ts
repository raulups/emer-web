import { expect, type Page, test } from "@playwright/test";

const option = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Vista" }).getByRole("button", { name });
const line = (page: Page, name: string) => option(page, name).locator("span").last();
const SCALE_ON = "matrix(1, 0, 0, 1, 0, 0)";
const SCALE_OFF = "matrix(0, 0, 0, 1, 0, 0)";

test.beforeEach(async ({ page }) => {
  await page.goto("/web");
});

test("abre en MARKETPLACE, con el switch fijo arriba al centro", async ({ page }) => {
  await expect(option(page, "Marketplace")).toHaveAttribute("aria-pressed", "true");
  await expect(option(page, "Explora")).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { name: "Marketplace", level: 1 })).toBeAttached();

  const nav = page.getByRole("navigation", { name: "Vista" });
  await expect(nav).toHaveCSS("position", "fixed");
  await expect(nav).toHaveCSS("top", "26px");
  const box = await nav.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - width / 2)).toBeLessThan(1);

  const products = await page.getByRole("region", { name: "Productos" }).boundingBox();
  expect(products?.y).toBe(76);
  await expect(line(page, "Marketplace")).toHaveCSS("transform", SCALE_ON);
});

test("EXPLORA monta Explora a sangre", async ({ page }) => {
  await option(page, "Explora").click();
  await expect(option(page, "Explora")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("region", { name: "Productos" })).toHaveCount(0);

  const explora = page.locator("[data-intro]");
  await expect(explora).toBeVisible();
  expect((await explora.boundingBox())?.y).toBe(0);

  await page.mouse.move(0, 400);
  await expect(line(page, "Explora")).toHaveCSS("transform", SCALE_ON);
  await expect(line(page, "Marketplace")).toHaveCSS("transform", SCALE_OFF);
});

test("en hover la línea viaja a la opción y sus letras suben", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "sin hover en táctil");

  await option(page, "Explora").hover();
  await expect(line(page, "Explora")).toHaveCSS("transform", SCALE_ON);
  await expect(line(page, "Marketplace")).toHaveCSS("transform", SCALE_OFF);
  const letter = option(page, "Explora").locator('span[aria-hidden="true"]').nth(1);
  await expect(letter).toHaveCSS("opacity", "0.8");

  await page.mouse.move(10, 600);
  await expect(line(page, "Marketplace")).toHaveCSS("transform", SCALE_ON);
  await expect(line(page, "Explora")).toHaveCSS("transform", SCALE_OFF);
});
