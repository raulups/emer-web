import { expect, test } from "@playwright/test";

/** Chromium sin `--hide-scrollbars`: barra de scroll clásica, como en Windows. */
test.use({
  launchOptions: {
    ignoreDefaultArgs: ["--hide-scrollbars"],
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  },
});

test("la línea de Emergentes y la de Catálogo son la misma (mismo x que la primera columna)", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "el diseño de Explora es de escritorio");
  await page.goto("/web");
  await page.getByRole("button", { name: "Explora" }).click();
  await expect(page.locator("[data-cat]")).toBeAttached();
  const scrollbar = await page.evaluate(
    () => window.innerWidth - document.documentElement.clientWidth,
  );
  test.skip(scrollbar === 0, "este Chromium no dibuja barra de scroll");

  const x = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => el.getBoundingClientRect().left);
  const emergentes = await x("[data-ediv]");
  const lead = await x("[data-cat-line]");
  const column = await x("[data-cat-g]");
  expect(Math.abs(emergentes - lead)).toBeLessThan(0.5);
  expect(Math.abs(lead - column)).toBeLessThan(0.5);
});
