import { devices, expect, type Page, test } from "@playwright/test";
import { APP_PROMPT_KEY } from "@/lib/app-links";

/** Web de móvil (`src/proxy.ts` → `src/app/m`): solo Marketplace y el aviso de la app. */

const SATENIER = "0208bdca-c705-491b-82fa-76123232670b";
const MAREA = "b13edf90-7c6d-4fe4-9b7f-8d9e0f1a2b3c";
const bar = (page: Page) => page.getByRole("navigation", { name: "Catálogo" });
const prompt = (page: Page) => page.getByRole("dialog", { name: "MEJOR EN LA APP" });
const products = (page: Page) => page.getByRole("region", { name: "Productos" }).locator("article");
/** ¿Hay alguna hoja abierta? (aviso de la app o las de la barra). */
const isOpen = (page: Page) => page.evaluate(() => document.querySelector("dialog[open]") !== null);
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

  test("cabecera [ MARKETPLACE ] arriba al centro y barra inferior sin menú lateral", async ({
    page,
  }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    const title = page.getByRole("button", { name: "Marketplace: volver arriba" });
    await expect(title).toHaveCSS("top", "26px");
    await expect(title).toHaveCSS("mix-blend-mode", "difference");
    await expect(page.getByRole("button", { name: "Menú" })).toHaveCount(0);
    await expect(page.getByRole("complementary", { name: "Menú del catálogo" })).toHaveCount(0);

    const viewport = page.viewportSize();
    const box = await bar(page).boundingBox();
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(viewport?.height);
    expect(box?.width).toBe(viewport?.width);
    await expect(bar(page).getByRole("button")).toHaveText([
      /CATEGORÍA\s*TODO/,
      /MARCAS\s*TODAS/,
      /FILTROS\s*NINGUNO/,
      "",
    ]);
    // El último producto no queda tapado por la barra.
    const section = page.getByRole("region", { name: "Productos" });
    const padding = await section.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).paddingBottom),
    );
    expect(padding).toBeGreaterThanOrEqual(box?.height ?? 0);
  });

  test("CATEGORÍA: hoja con la lista; elegir filtra y cierra", async ({ page }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    await bar(page)
      .getByRole("button", { name: /CATEGORÍA/ })
      .click();
    const sheet = page.getByRole("dialog", { name: "CATEGORÍAS" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: /^Ver todo/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await sheet.getByRole("button", { name: /^Camisetas/ }).click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await expect(products(page).first()).toContainText("Camiseta");
    await expect(bar(page).getByRole("button", { name: /CATEGORÍA/ })).toContainText(/camisetas/i);
  });

  test("MARCAS: selección múltiple, VER n cierra y ?brand= se actualiza", async ({ page }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    await bar(page)
      .getByRole("button", { name: /MARCAS/ })
      .click();
    const sheet = page.getByRole("dialog", { name: "MARCAS" });
    await sheet.getByRole("button", { name: /^Satenier/ }).click();
    await expect(sheet.getByRole("button", { name: /^Satenier/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(sheet.getByRole("button", { name: "VER 12" })).toBeVisible();
    await sheet.getByRole("button", { name: "VER 12" }).click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await expect(page).toHaveURL(`/web?brand=${SATENIER}`);
    await expect(bar(page).getByRole("button", { name: /MARCAS/ })).toContainText("1 ELEGIDA");
  });

  test("FILTROS: hoja con scroll propio (táctil) sin mover la página; vacío con sus filtros", async ({
    page,
    context,
  }) => {
    await skipPrompt(page);
    await page.goto(`/web?brand=${MAREA}`);
    await expect(products(page).first()).toBeVisible();
    await bar(page)
      .getByRole("button", { name: /FILTROS/ })
      .click();
    const sheet = page.getByRole("dialog", { name: "FILTROS" });
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

    // Gesto táctil real sobre la hoja: se desplaza ella, no la página.
    const cdp = await context.newCDPSession(page);
    const swipe = async (x: number, from: number, to: number) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y: from }],
      });
      for (let i = 1; i <= 10; i++) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: from + ((to - from) * i) / 10 }],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    const [scrollHeight, clientHeight] = await sheet.evaluate((el) => [
      el.scrollHeight,
      el.clientHeight,
    ]);
    if ((scrollHeight ?? 0) > (clientHeight ?? 0)) {
      await swipe(200, 700, 350);
      await expect.poll(() => sheet.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await sheet.getByRole("button", { name: "ÚNICA" }).click();
    await expect(sheet.getByRole("button", { name: "VER 0" })).toBeVisible();
    await sheet.getByRole("button", { name: "VER 0" }).click();
    await expect(page.getByRole("heading", { name: "NADA POR AQUÍ" })).toBeVisible();
    await page.getByRole("button", { name: "Quitar Talla ÚNICA" }).click();
    await expect(products(page).first()).toContainText("Marea");
  });

  test("productos por fila: 2 → 3 → 1, recordado al volver", async ({ page }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    const grid = page.getByRole("region", { name: "Productos" }).locator("ul").first();
    const columns = () =>
      grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(await columns()).toBe(2);
    const button = bar(page).getByRole("button", { name: /Productos por fila/ });
    await button.click();
    await expect.poll(columns).toBe(3);
    await button.click();
    await expect.poll(columns).toBe(1);
    await expect(button).toHaveAccessibleName("Productos por fila: 1. Cambiar");
    await page.reload();
    expect(await columns()).toBe(1);
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
    await bar(page)
      .getByRole("button", { name: /FILTROS/ })
      .click();
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
