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

test("sin errores en consola (solo el 404 de la imagen rota de las fixtures) ni fuentes ajenas", async ({
  page,
}, info) => {
  const problems: string[] = [];
  const hosts = new Set<string>();
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/404 \(Not Found\)/.test(message.text())) {
      problems.push(message.text());
    }
  });
  page.on("request", (request) => hosts.add(new URL(request.url()).host));

  await page.goto("/");
  await page.waitForTimeout(1500);
  await page.goto("/web");
  await expect(page.getByRole("region", { name: "Productos" })).toBeVisible();
  // En el móvil no hay Explora.
  if (info.project.name !== "mobile") {
    await page.getByRole("button", { name: "Explora" }).click();
    await expect(page.locator("[data-cat]")).toBeAttached();
  }
  await page.waitForTimeout(500);

  expect(problems).toEqual([]);
  // Nada de Google Fonts ni de otros orígenes tipográficos: solo el propio servidor.
  expect([...hosts]).toEqual([new URL(page.url()).host]);
  const families = await page.evaluate(() => [...document.fonts].map((font) => font.family));
  expect(new Set(families)).toEqual(
    new Set([
      "Inter",
      "Geist Mono",
      "Instrument Serif",
      "TeX Gyre Heros Condensed",
      "Cormorant Garamond",
    ]),
  );
});
