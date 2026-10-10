import { expect, test } from "@playwright/test";
import { PRICE_RANGES, priceRuns, toggle } from "../src/lib/marketplace/filters";
import { discountPct, eur, imgSrc, piecesLabel } from "../src/lib/marketplace/format";
import { DEFAULT_QUERY, dataKey, parseQuery, toSearch } from "../src/lib/marketplace/url";

const A = "0208bdca-c705-491b-82fa-76123232670b";
const B = "30995220-a71b-416a-8123-63e9b0037919";

test.describe("10-marketplace · lógica pura", () => {
  test("parseQuery sanea la URL y toSearch la reconstruye", () => {
    const q = parseQuery({
      cat: A,
      marcas: `${A},${B},no-es-uuid,${A}`,
      precio: "b|d|x",
      oferta: "1",
      orden: "desc",
      vista: "6",
      pieza: "tampoco",
    });
    expect(q).toEqual({
      cat: A,
      marcas: [A, B],
      precio: ["b", "d"],
      oferta: true,
      orden: "desc",
      vista: 6,
      pieza: null,
    });
    expect(toSearch(q)).toBe(`cat=${A}&marcas=${A},${B}&precio=b|d&oferta=1&orden=desc&vista=6`);
    expect(parseQuery(new URLSearchParams(toSearch(q)))).toEqual(q);
  });

  test("los valores por defecto no ensucian la URL y `dataKey` ignora vista y pieza", () => {
    expect(toSearch(DEFAULT_QUERY)).toBe("");
    expect(parseQuery({ vista: "3", orden: "raro" })).toEqual(DEFAULT_QUERY);
    expect(dataKey({ ...DEFAULT_QUERY, vista: 6, pieza: A })).toBe("");
  });

  test("priceRuns funde tramos contiguos y separa los sueltos", () => {
    expect(priceRuns([])).toEqual([]);
    expect(priceRuns(["a", "b"])).toEqual([{ minPrice: 0.01, maxPrice: 60 }]);
    expect(priceRuns(["b", "c"])).toEqual([{ minPrice: 30.01, maxPrice: 100 }]);
    expect(priceRuns(["a", "c"])).toEqual([
      { minPrice: 0.01, maxPrice: 30 },
      { minPrice: 60.01, maxPrice: 100 },
    ]);
    expect(priceRuns(["c", "d"])).toEqual([{ minPrice: 60.01 }].map((r) => ({ ...r })));
    expect(PRICE_RANGES.map((r) => r.key)).toEqual(["a", "b", "c", "d"]);
  });

  test("toggle añade y quita", () => {
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
  });

  test("formato de precios, descuento y recuento", () => {
    expect(eur(34)).toBe("EUR 34");
    expect(eur(34.99)).toBe("EUR 34,99");
    expect(eur(79.9)).toBe("EUR 79,9");
    expect(eur(0)).toBe("SIN PRECIO");
    expect(discountPct(34, 46)).toBe(26);
    expect(discountPct(0, 46)).toBeNull();
    expect(discountPct(50, 46)).toBeNull();
    expect(discountPct(34, null)).toBeNull();
    expect(piecesLabel(1)).toBe("1 PIEZA");
    expect(piecesLabel(47)).toBe("47 PIEZAS");
  });

  test("imgSrc pide el ancho solo a Shopify", () => {
    expect(imgSrc("https://cdn.shopify.com/s/files/1/a.jpg", 600)).toContain("width=600");
    expect(imgSrc("https://otro.example/a.jpg", 600)).toBe("https://otro.example/a.jpg");
    expect(imgSrc("/assets/deco/ojo.webp", 600)).toBe("/assets/deco/ojo.webp");
  });
});
