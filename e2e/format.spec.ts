import { expect, test } from "@playwright/test";
import {
  discount,
  emergentBrands,
  newestBrands,
  popularBrands,
  portraitSources,
  price,
} from "@/lib/format";

test.describe("reglas de datos", () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== "desktop", "no usa el navegador: basta con un proyecto");
  });

  test("precio: entero sin decimales, decimal con coma", () => {
    expect(price(34)).toBe("34 €");
    expect(price(25.6)).toBe("25,60 €");
    expect(price(null)).toBe("—");
  });

  test("descuento: round((1 − current/original)·100)", () => {
    expect(discount({ current_price: 30, original_price: 40, is_on_sale: true })).toBe(25);
    expect(discount({ current_price: 30, original_price: 40, is_on_sale: false })).toBe(0);
    expect(discount({ current_price: 30, original_price: null, is_on_sale: true })).toBe(0);
  });

  const brands = [
    { name: "B", product_count: 3, created_at: "2026-06-01T00:00:00Z", founded_year: 2019 },
    { name: "A", product_count: 9, created_at: "2026-06-05T00:00:00Z", founded_year: null },
    { name: "C", product_count: 3, created_at: "2026-06-03T00:00:00Z", founded_year: 2022 },
  ];
  const names = (list: { name: string }[]) => list.map((b) => b.name);

  test("órdenes de Populares, Novedades y Emergentes", () => {
    expect(names(popularBrands(brands))).toEqual(["A", "B", "C"]);
    expect(names(newestBrands(brands))).toEqual(["A", "C", "B"]);
    expect(names(emergentBrands(brands))).toEqual(["C", "B", "A"]);
    expect(names(brands)).toEqual(["B", "A", "C"]);
  });

  test("imagen de marca: vertical, la horizontal si falta y el primer producto si falla", () => {
    const both = { img_desktop: "h.jpg", img_mobile: "v.jpg" };
    expect(portraitSources(both, "p.jpg")).toEqual(["v.jpg", "p.jpg"]);
    expect(portraitSources({ img_desktop: "h.jpg", img_mobile: null }, "p.jpg")).toEqual([
      "h.jpg",
      "p.jpg",
    ]);
    expect(portraitSources({ img_desktop: null, img_mobile: null }, "p.jpg")).toEqual(["p.jpg"]);
    expect(portraitSources({ img_desktop: null, img_mobile: null }, undefined)).toEqual([]);
  });
});
