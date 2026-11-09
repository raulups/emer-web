import { expect, test } from "@playwright/test";

/** Chromium sin `--hide-scrollbars`: barra de scroll clásica, como en Windows. */
test.use({
  launchOptions: {
    ignoreDefaultArgs: ["--hide-scrollbars"],
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  },
});

test("con barra de scroll, Explora no se desborda en horizontal en Populares ni en Emergentes", async ({
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

  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
  // Durante el slide entre vistas el ancho es el de la pantalla: se mira al acabar.
  await expect(page.locator("html")).not.toHaveAttribute("data-slide");
  await expect.poll(overflow).toBeLessThanOrEqual(0);
  for (const selector of ["[data-nv]", "[data-cat-pin]"]) {
    await page
      .locator(selector)
      .evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 2));
    await page.waitForTimeout(500);
    expect(await overflow()).toBeLessThanOrEqual(0);
  }
});
