import { expect, type Page, test } from "@playwright/test";

const skip = (page: Page) => page.getByRole("link", { name: "Saltar al Marketplace" });
const progress = (page: Page, section: string) =>
  page.evaluate((name) => {
    const el = document.querySelector<HTMLElement>(`[data-${name}]`);
    if (!el) return 0;
    const top = el.getBoundingClientRect().top + window.scrollY;
    return (window.scrollY - top) / (el.offsetHeight - window.innerHeight);
  }, section);

test.beforeEach(({ page: _page }, info) => {
  test.skip(info.project.name === "mobile", "en el móvil no hay Landing (ver e2e/mobile.spec.ts)");
});

test("loader: contador, [ SALTAR ] centrado y viaje a la esquina", async ({ page }) => {
  await page.goto("/");
  const box = await skip(page).boundingBox();
  const viewport = page.viewportSize();
  expect(box && viewport && Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(4);
  expect(box && viewport && Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(4);
  await expect(page.locator("[data-intro-count]")).not.toHaveText("000");

  await expect(page.locator("main[data-ready]")).toBeAttached({ timeout: 6000 });
  await expect
    .poll(async () => (await skip(page).boundingBox())?.y ?? 999, { timeout: 4000 })
    .toBeLessThan(40);
  await expect(skip(page)).toHaveAttribute("href", "/web");
});

test("hero: EMER, [ AUTOMÁTICO ] y el zoom con el scroll", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main[data-ready]")).toBeAttached({ timeout: 6000 });
  const auto = page.getByRole("button", { name: "[ AUTOMÁTICO ]" });
  await expect(auto).toBeVisible();
  const word = page.locator("[data-word-text]");
  const before = await word.evaluate((el) => getComputedStyle(el).transform);

  await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.2));
  await expect
    .poll(() => word.evaluate((el) => getComputedStyle(el).transform), { timeout: 4000 })
    .not.toBe(before);
  // Con el scroll, [ AUTOMÁTICO ] deja de estar disponible.
  await expect(page.locator("[data-auto-wrap]")).toHaveCSS("pointer-events", "none");
});

test("[ AUTOMÁTICO ] arranca el zoom ya, se oculta y se para con el scroll del usuario", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("main[data-ready]")).toBeAttached({ timeout: 6000 });
  await page.getByRole("button", { name: "[ AUTOMÁTICO ]" }).click();
  await expect(page.getByRole("button", { name: "[ DETENER ]" })).toHaveCount(0);
  await expect(page.locator("[data-auto-wrap]")).toHaveCSS("opacity", "0");
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 })
    .toBeGreaterThan(300);
  await page.mouse.wheel(0, 10);
  await page.waitForTimeout(400);
  const stopped = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(600);
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - stopped)).toBeLessThan(3);
});

test("[ AUTOMÁTICO ] recorre la Landing sin parar y abre el Marketplace", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main[data-ready]")).toBeAttached({ timeout: 6000 });
  await page.getByRole("button", { name: "[ AUTOMÁTICO ]" }).click();
  await page.waitForURL("**/web", { timeout: 30_000 });
});

test("manifiesto: palabras que se encienden y corte a la bomba", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main[data-ready]")).toBeAttached({ timeout: 6000 });
  const words = page.locator("[data-w]");
  await expect(words).toHaveCount(14);

  const mani = page.locator("section[data-mani]");
  const geometry = await mani.evaluate((el: HTMLElement) => ({
    top: el.getBoundingClientRect().top + window.scrollY,
    height: el.offsetHeight,
    vh: window.innerHeight,
  }));
  const at = (p: number) => geometry.top + p * (geometry.height - geometry.vh);

  await page.evaluate((y) => window.scrollTo(0, y), at(0.05));
  await expect.poll(() => page.locator("[data-w][data-on]").count()).toBeLessThan(4);
  await page.evaluate((y) => window.scrollTo(0, y), at(0.6));
  await expect.poll(() => page.locator("[data-w][data-on]").count()).toBe(14);
  await expect(page.locator("[data-mani-stage][data-big]")).toHaveCount(0);
  await page.evaluate((y) => window.scrollTo(0, y), at(0.8));
  await expect(page.locator("[data-mani-stage][data-big]")).toHaveCount(1, { timeout: 4000 });
  expect(await progress(page, "mani")).toBeGreaterThan(0.5);
});

test("al llegar al final cae la cortina y navega a /web", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main[data-ready]")).toBeAttached({ timeout: 6000 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForURL("**/web", { timeout: 8000 });
  await expect(page.getByRole("region", { name: "Productos" })).toBeVisible();
});

test("sin movimiento: sin loader, pantallas estáticas y acceso directo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(skip(page)).toBeVisible();
  await expect(page.locator("main[data-ready]")).toBeAttached();
  const heights = await page.evaluate(() => ({
    doc: document.documentElement.scrollHeight,
    vh: window.innerHeight,
  }));
  expect(heights.doc).toBeLessThan(heights.vh * 6);
  await expect(page.getByRole("link", { name: "[ MARKETPLACE ]" })).toBeVisible();
});
