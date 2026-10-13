import { expect, test } from "@playwright/test";

for (const path of ["/", "/web"]) {
  test(`${path} responde y usa Inter`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator("main")).toBeAttached();

    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('300 16px "Inter"') && document.fonts.check('900 16px "Inter"');
    });
    expect(loaded).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(
      /^"?Inter/,
    );
  });
}

test("cursor propio: sigue al ratón solo con pointer fine", async ({ page }, info) => {
  await page.goto("/");
  const dot = page.locator("[data-cursor]");
  await expect(dot).toBeAttached();

  if (info.project.name === "mobile") {
    await expect(page.locator("html")).not.toHaveClass(/has-cursor/);
    await expect(dot).toBeHidden();
    return;
  }

  await expect(page.locator("html")).toHaveClass(/has-cursor/);
  await page.mouse.move(200, 150);
  await expect(dot).toBeVisible();
  await expect(dot).toHaveCSS("mix-blend-mode", "difference");
  await expect(dot).toHaveCSS("width", "12px");
  await expect(dot).toHaveCSS("transform", "matrix(1, 0, 0, 1, 200, 150)");
});
