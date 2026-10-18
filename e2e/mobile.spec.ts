import { devices, expect, type Page, test } from "@playwright/test";
import { APP_PROMPT_KEY } from "@/lib/app-links";

/** Web de móvil (`src/proxy.ts` → `src/app/m`): solo Marketplace y el aviso de la app. */

const SATENIER = "0208bdca-c705-491b-82fa-76123232670b";
const prompt = (page: Page) => page.getByRole("dialog", { name: "MEJOR EN LA APP" });
const products = (page: Page) => page.getByRole("region", { name: "Productos" }).locator("article");
const isOpen = (page: Page) => page.locator("dialog").evaluate((el: HTMLDialogElement) => el.open);
const skipPrompt = (page: Page) =>
  page.addInitScript((key) => sessionStorage.setItem(key, "1"), APP_PROMPT_KEY);

test.describe("móvil", () => {
  test.beforeEach(({ page: _page }, info) => {
    test.skip(info.project.name !== "mobile", "solo con un teléfono");
  });

  test("/ muestra el Marketplace sin redirigir, sin Landing ni Explora", async ({ page }) => {
    await skipPrompt(page);
    const response = await page.goto("/");
    expect(response?.request().redirectedFrom()).toBeNull();
    await expect(page).toHaveURL("/");
    await expect(products(page).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Marketplace", level: 1 })).toBeAttached();
    await expect(page.getByRole("navigation", { name: "Vista" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Explora" })).toHaveCount(0);
    await expect(page.locator("[data-intro]")).toHaveCount(0);
  });

  test("cabecera: [ MENÚ ] y [ MARKETPLACE ] en la primera fila; el menú abre debajo", async ({
    page,
  }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    const menuButton = page.getByRole("button", { name: "Menú" });
    const title = page.getByRole("button", { name: "Marketplace: volver arriba" });
    await expect(menuButton).toHaveCSS("top", "26px");
    await expect(title).toHaveCSS("top", "26px");
    const [menuBox, titleBox] = [await menuButton.boundingBox(), await title.boundingBox()];
    expect((menuBox?.x ?? 0) + (menuBox?.width ?? 0)).toBeLessThan(titleBox?.x ?? 0);
    expect((await products(page).first().boundingBox())?.y ?? 0).toBeGreaterThanOrEqual(76);

    await menuButton.click();
    const menu = page.getByRole("complementary", { name: "Menú del catálogo" });
    await expect(menu).toHaveCSS("top", "76px");
    await expect(menu.getByRole("button", { name: /^Ver todo/ })).toBeVisible();
  });

  test("[ MARKETPLACE ] sube al principio", async ({ page }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    await page.getByRole("button", { name: "Marketplace: volver arriba" }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 4000 }).toBe(0);
  });

  for (const path of ["/", "/web"]) {
    test(`${path}?brand= preselecciona la marca y se conserva en la URL`, async ({ page }) => {
      await skipPrompt(page);
      await page.goto(`${path}?brand=${SATENIER}`);
      await expect(products(page).first()).toContainText("Satenier");
      await expect(page).toHaveURL(`${path}?brand=${SATENIER}`);
      await expect(page.getByRole("button", { name: "Marketplace: volver arriba" })).toBeVisible();
    });
  }

  test("aviso de la app: sale al entrar, una vez por sesión", async ({ page }) => {
    await page.goto("/web");
    const dialog = prompt(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Para una mejor experiencia, descarga la app de Emer");
    await expect(dialog.getByText("APP STORE")).toBeVisible();
    await expect(dialog.getByText("GOOGLE PLAY")).toBeVisible();
    // Sin enlaces publicados: «Próximamente» y nada que pulsar.
    await expect(dialog.getByText("PRÓXIMAMENTE")).toHaveCount(2);
    await expect(dialog.getByRole("link")).toHaveCount(0);
    // Hoja inferior: termina de subir pegada al borde de abajo.
    const height = page.viewportSize()?.height;
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        return Math.round((box?.y ?? 0) + (box?.height ?? 0));
      })
      .toBe(height);

    await dialog.getByRole("button", { name: "SEGUIR EN LA WEB" }).click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await expect(dialog).toBeHidden();
    await expect(products(page).first()).toBeVisible();

    await page.reload();
    await expect(products(page).first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await isOpen(page)).toBe(false);
  });

  test("aviso de la app: se cierra con ×, con Escape y tocando fuera", async ({ page }) => {
    const reopen = async () => {
      await page.evaluate((key) => sessionStorage.removeItem(key), APP_PROMPT_KEY);
      await page.reload();
      await expect(prompt(page)).toBeVisible();
    };

    await page.goto("/web");
    await expect(prompt(page)).toBeVisible();
    await prompt(page).getByRole("button", { name: "Cerrar" }).click();
    await expect.poll(() => isOpen(page)).toBe(false);

    await reopen();
    await page.keyboard.press("Escape");
    await expect.poll(() => isOpen(page)).toBe(false);

    await reopen();
    await page.mouse.click(20, 20);
    await expect.poll(() => isOpen(page)).toBe(false);
    // Con el aviso cerrado, la página vuelve a hacer scroll.
    await page.evaluate(() => window.scrollTo(0, 600));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300);
  });

  test("aviso de la app: empieza con el foco en la hoja y la página queda inerte", async ({
    page,
  }) => {
    await page.goto("/web");
    await expect(prompt(page)).toBeVisible();
    await expect(prompt(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(prompt(page).getByRole("button", { name: "Cerrar" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(prompt(page).getByRole("button", { name: "SEGUIR EN LA WEB" })).toBeFocused();
    // Más allá, el foco sale al navegador, nunca a la página de detrás (modal nativo).
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Tab");
      const outside = await page.evaluate(() => {
        const active = document.activeElement;
        return !!active && active !== document.body && !active.closest("dialog");
      });
      expect(outside).toBe(false);
    }
  });

  test("aviso de la app con «reducir movimiento»: aparece y se va sin animar", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/web");
    await expect(prompt(page)).toBeVisible();
    // Sin transición: ya está arriba en cuanto aparece (la animada tarda 0,8 s).
    await expect(prompt(page)).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)", { timeout: 300 });
    await prompt(page).getByRole("button", { name: "SEGUIR EN LA WEB" }).click();
    await expect.poll(() => isOpen(page), { timeout: 500 }).toBe(false);
  });

  test("sin errores en consola", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && !/404 \(Not Found\)/.test(message.text())) {
        problems.push(message.text());
      }
    });
    await page.goto("/");
    await expect(prompt(page)).toBeVisible();
    await prompt(page).getByRole("button", { name: "SEGUIR EN LA WEB" }).click();
    await page.getByRole("button", { name: "Menú" }).click();
    await page.waitForTimeout(800);
    expect(problems).toEqual([]);
  });
});

test.describe("escritorio sin cambios", () => {
  test.beforeEach(({ page: _page }, info) => {
    test.skip(info.project.name !== "desktop", "solo en escritorio");
  });

  test("ni aviso ni redirección: Landing en / y switch en /web", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("[data-intro-count]")).toBeAttached();
    await page.goto("/web");
    await expect(page.getByRole("navigation", { name: "Vista" })).toBeVisible();
    await expect(page.locator("dialog")).toHaveCount(0);
  });

  test("/m es interna: fuera del móvil vuelve a /web", async ({ page }) => {
    await page.goto(`/m?brand=${SATENIER}`);
    await expect(page).toHaveURL(`/web?brand=${SATENIER}`);
    await expect(page.getByRole("navigation", { name: "Vista" })).toBeVisible();
  });
});

test.describe("ventana estrecha de escritorio y tablet", () => {
  test.beforeEach(({ page: _page }, info) => {
    test.skip(info.project.name !== "desktop", "basta con un proyecto");
  });

  const cases = [
    { name: "portátil con ventana estrecha", use: { viewport: { width: 390, height: 844 } } },
    { name: "iPad", use: devices["iPad (gen 7)"] },
  ];
  for (const { name, use } of cases) {
    test(`${name}: web completa (Landing y switch)`, async ({ browser }) => {
      const { defaultBrowserType: _type, ...options } = use as typeof use & {
        defaultBrowserType?: string;
      };
      const context = await browser.newContext(options);
      const page = await context.newPage();
      await page.goto("/");
      await expect(page).toHaveURL("/");
      await expect(page.locator("[data-intro-count]")).toBeAttached();
      await page.goto("/web");
      await expect(page.getByRole("navigation", { name: "Vista" })).toBeVisible();
      await expect(page.locator("dialog")).toHaveCount(0);
      await context.close();
    });
  }
});
