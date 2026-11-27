import { devices, expect, type Page, test } from "@playwright/test";
import { APP_PROMPT_KEY } from "@/lib/app-links";

/** Web de móvil: Landing en `/`; `/web` → `src/app/m` (`src/proxy.ts`): Marketplace y aviso de la app. */

const SATENIER = "0208bdca-c705-491b-82fa-76123232670b";
const MAREA = "b13edf90-7c6d-4fe4-9b7f-8d9e0f1a2b3c";
const bar = (page: Page) => page.getByRole("navigation", { name: "Catálogo" });
/** Barra + LIMPIAR FILTROS: lo que se esconde con el scroll. */
const dock = (page: Page) => bar(page).locator("..");
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

  test("/ muestra la Landing y al acabar abre /web: el Marketplace de móvil, sin Explora", async ({
    page,
  }) => {
    await skipPrompt(page);
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.locator("[data-cnt-number]")).not.toHaveText("00");
    await page.waitForURL("**/web", { timeout: 12_000 });
    await expect(products(page).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Marketplace", level: 1 })).toBeAttached();
    await expect(page.getByRole("navigation", { name: "Vista" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Explora" })).toHaveCount(0);
    await expect(page.locator("[data-dest]")).toHaveCount(0);
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

    // Barra flotante: 16px a los lados, 28px sobre el borde de abajo, 52px de alto.
    const viewport = page.viewportSize();
    const box = await bar(page).boundingBox();
    const fromBottom = (viewport?.height ?? 0) - ((box?.y ?? 0) + (box?.height ?? 0));
    expect(fromBottom).toBe(28);
    expect(box?.x).toBe(16);
    expect(box?.width).toBe((viewport?.width ?? 0) - 32);
    expect(box?.height).toBe(52);
    await expect(bar(page)).toHaveCSS("border-radius", "0px");
    await expect(bar(page).getByRole("button")).toHaveText(["CATEGORÍA", "MARCAS", "FILTROS", ""]);
    await expect(bar(page).getByRole("button", { name: "Cambiar vista" })).toBeVisible();
    // Sin filtros: peso normal, sin badge ni LIMPIAR FILTROS.
    await expect(bar(page).getByRole("button", { name: "FILTROS: NINGUNO" })).toHaveCSS(
      "font-weight",
      "400",
    );
    await expect(page.getByRole("button", { name: "LIMPIAR FILTROS" })).toHaveCount(0);
    await expect(bar(page).getByRole("button", { name: "CATEGORÍA: TODO" })).toBeVisible();
    await expect(bar(page).getByRole("button", { name: "MARCAS: TODAS" })).toBeVisible();
    await expect(bar(page).getByRole("button", { name: "FILTROS: NINGUNO" })).toBeVisible();
    // El último producto no queda tapado por la barra.
    const section = page.getByRole("region", { name: "Productos" });
    const padding = await section.evaluate((el) =>
      Number.parseFloat(getComputedStyle(el).paddingBottom),
    );
    expect(padding).toBeGreaterThanOrEqual((box?.height ?? 0) + fromBottom);
  });

  test("barra inferior: se esconde al bajar y vuelve al subir", async ({ page }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(dock(page)).toHaveAttribute("data-hidden", "");
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(dock(page)).not.toHaveAttribute("data-hidden", "");
  });

  test("un toque en la foto abre el popup de la pieza (sin hover que se coma el toque)", async ({
    page,
  }) => {
    await skipPrompt(page);
    await page.goto("/web");
    const media = products(page).first().locator("[data-media]");
    await expect(media).toBeVisible();
    const box = await media.boundingBox();
    await page.touchscreen.tap((box?.x ?? 0) + 40, (box?.y ?? 0) + 40);
    await expect(page.locator("dialog[open]")).toBeVisible();
    await expect(page.locator("[data-product][data-hovered]")).toHaveCount(0);
  });

  test("[ MARKETPLACE ] y ORDENAR se van con el scroll", async ({ page }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    const title = page.getByRole("button", { name: "Marketplace: volver arriba" });
    const sort = page.getByRole("group", { name: "ORDENAR" });
    await expect(title).toBeInViewport();
    await expect(sort).toBeInViewport();
    await page.evaluate(() => window.scrollTo(0, 700));
    await expect(title).not.toBeInViewport();
    await expect(sort).not.toBeInViewport();
  });

  test("CATEGORÍA: hoja con iconos; elegir filtra y cierra", async ({ page }) => {
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
    // Cada tipo de prenda lleva su icono (máscara CSS con el SVG de `src/icons/`).
    const tile = sheet.getByRole("button", { name: /^Camisetas/ });
    await expect
      .poll(() => tile.evaluate((el) => getComputedStyle(el).getPropertyValue("--icon")))
      .toContain("url(");
    await tile.click();
    await expect.poll(() => isOpen(page)).toBe(false);
    await expect(products(page).first()).toContainText("Camiseta");
    const category = bar(page).getByRole("button", { name: /CATEGORÍA/ });
    await expect(category).toHaveAccessibleName(/camisetas/i);
    await expect(category).toHaveText("CATEGORÍA1");
    await expect(category).toHaveCSS("font-weight", "700");
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
    const brands = bar(page).getByRole("button", { name: /MARCAS/ });
    await expect(brands).toHaveAccessibleName("MARCAS: 1 ELEGIDAS");
    await expect(brands).toContainText("1");
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
    const sheet = page.getByRole("dialog", { name: "[ FILTROS ]" });
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
    await expect(sheet.getByRole("button", { name: "VER 0 PIEZAS" })).toBeVisible();
    await sheet.getByRole("button", { name: "VER 0 PIEZAS" }).click();
    await expect(page.getByRole("heading", { name: "NADA POR AQUÍ" })).toBeVisible();
    // Sin chips de filtros activos: se quitan con LIMPIAR FILTROS.
    await expect(page.getByRole("button", { name: /^Quitar/ })).toHaveCount(0);
    // Quita todos, también la marca de `?brand=`.
    await page.getByRole("button", { name: "LIMPIAR FILTROS" }).click();
    await expect(products(page).first()).toBeVisible();
    await expect(page).toHaveURL("/web");
  });

  test("Cambiar vista: 2 ↔ 1 columnas, recordado al volver", async ({ page }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    const grid = page.getByRole("region", { name: "Productos" }).locator("[data-grid]");
    const columns = () =>
      grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(await columns()).toBe(2);
    const button = bar(page).getByRole("button", { name: "Cambiar vista" });
    await expect(button.locator("span")).toHaveCount(2);
    await button.click();
    await expect.poll(columns).toBe(1);
    await expect(button.locator("span")).toHaveCount(1);
    await page.reload();
    expect(await columns()).toBe(1);
    await button.click();
    await expect.poll(columns).toBe(2);
  });

  test("DESCUENTO: rangos con selección múltiple, badge en FILTROS y LIMPIAR FILTROS", async ({
    page,
  }) => {
    await skipPrompt(page);
    await page.goto("/web");
    await expect(products(page).first()).toBeVisible();
    await bar(page)
      .getByRole("button", { name: /FILTROS/ })
      .click();
    const sheet = page.getByRole("dialog", { name: "[ FILTROS ]" });
    await expect(sheet.getByRole("heading", { name: "DESCUENTO" })).toBeVisible();
    await expect(sheet.getByRole("button", { name: "SOLO OFERTAS" })).toHaveCount(0);
    // Los ejemplos rebajan un 23 %: 25–50 % no trae nada, 0–25 % solo lo rebajado.
    await sheet.getByRole("button", { name: "25–50%" }).click();
    await expect(sheet.getByRole("button", { name: "VER 0 PIEZAS" })).toBeVisible();
    await sheet.getByRole("button", { name: "0–25%" }).click();
    await expect(sheet.getByRole("button", { name: "0–25%" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(sheet.getByRole("button", { name: /^VER [1-9]\d* PIEZAS?$/ })).toBeVisible();
    await sheet.getByRole("button", { name: /^VER \d+ PIEZAS?$/ }).click();
    await expect.poll(() => isOpen(page)).toBe(false);
    const filters = bar(page).getByRole("button", { name: /FILTROS/ });
    await expect(filters).toHaveAccessibleName("FILTROS: 2 ACTIVOS");
    await expect(filters).toHaveText("FILTROS2");
    await expect(products(page).first()).toBeVisible();

    const clear = page.getByRole("button", { name: "LIMPIAR FILTROS" });
    const [clearBox, barBox] = await Promise.all([clear.boundingBox(), bar(page).boundingBox()]);
    expect((barBox?.y ?? 0) - ((clearBox?.y ?? 0) + (clearBox?.height ?? 0))).toBe(8);
    await clear.click();
    await expect(filters).toHaveAccessibleName("FILTROS: NINGUNO");
    await expect(clear).toHaveCount(0);
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

  // `/?brand=` pasa por la Landing y acaba en `/web?brand=`.
  for (const path of ["/", "/web"]) {
    test(`${path}?brand= preselecciona la marca y se conserva en la URL`, async ({ page }) => {
      await skipPrompt(page);
      await page.goto(`${path}?brand=${SATENIER}`);
      if (path === "/") await page.waitForURL("**/web?brand=*", { timeout: 12_000 });
      await expect(products(page).first()).toContainText("Satenier");
      await expect(page).toHaveURL(`/web?brand=${SATENIER}`);
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
    await expect(prompt(page).getByRole("textbox", { name: "AVÍSAME CUANDO SALGA" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(prompt(page).getByRole("button", { name: "AVÍSAME" })).toBeFocused();
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

  test("aviso de la app: lista de espera con el email", async ({ page }) => {
    await page.goto("/web");
    const dialog = prompt(page);
    const email = dialog.getByRole("textbox", { name: "AVÍSAME CUANDO SALGA" });
    const submit = dialog.getByRole("button", { name: "AVÍSAME" });

    await email.fill("no-es-un-email");
    await submit.click();
    await expect(dialog.getByRole("alert")).toContainText("Revisa el email");

    await email.fill("error@emer.es");
    await submit.click();
    await expect(dialog.getByRole("alert")).toContainText("No se pudo guardar");

    await email.fill("  Ana@Emer.ES ");
    await submit.click();
    await expect(dialog.getByRole("status")).toContainText("LISTO");
    await expect(dialog.getByRole("status")).toContainText("ana@emer.es");
    await expect(email).toHaveCount(0);

    // En otra sesión del mismo navegador ya no pide el email.
    await page.evaluate((key) => sessionStorage.removeItem(key), APP_PROMPT_KEY);
    await page.reload();
    await expect(prompt(page).getByRole("status")).toContainText("YA ESTÁS EN LA LISTA");
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
    await page.goto("/web");
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
    await expect(page.locator("[data-cnt-number]")).toBeAttached();
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
      await expect(page.locator("[data-cnt-number]")).toBeAttached();
      await page.goto("/web");
      await expect(page.getByRole("navigation", { name: "Vista" })).toBeVisible();
      await expect(page.locator("dialog")).toHaveCount(0);
      await context.close();
    });
  }
});
