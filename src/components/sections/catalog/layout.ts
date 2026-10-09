import type { Brand } from "@/lib/api";
import { price } from "@/lib/format";

export type CatalogBrand = {
  id: string;
  name: string;
  url: string | null;
  img: string | null;
  products: Array<{ id: string; imageUrl: string; price: string | null }>;
};

export type CatalogCell =
  | { kind: "head"; k: number }
  | {
      kind: "brand";
      k: number;
      brand: CatalogBrand;
      /** flex-grow en reposo. */
      base: number;
      /** flex-grow con hover (base · max(4, celdasEnFila · .75)). */
      grow: number;
    };

const ROW_WEIGHTS = [0.9, 1.15, 0.85, 1.1];

/** Pseudoaleatorio determinista del diseño (mismo resultado en servidor y cliente). */
const rnd = (i: number) => {
  const a = Math.sin((i + 1) * 91.17) * 43758.5453;
  return a - Math.floor(a);
};

export function toCatalogBrand(brand: Brand): CatalogBrand {
  return {
    id: brand.id,
    name: brand.name,
    url: brand.url,
    img: brand.img,
    products: brand.previewProducts
      .filter((p) => p.imageUrl)
      .slice(0, 3)
      .map((p) => ({ id: p.id, imageUrl: p.imageUrl ?? "", price: price(p.price, p.currency) })),
  };
}

/**
 * Reparto de filas de escritorio (handoff 05, determinista). En móvil las filas se aplanan con
 * CSS (2 celdas por fila), así que no hace falta un segundo cálculo.
 */
export function catalogRows(brands: CatalogBrand[]): CatalogCell[][] {
  const total = brands.length + 1; // + cabecera
  const nRows = total > 22 ? 4 : 3;
  const weights = ROW_WEIGHTS.slice(0, nRows);
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.round((total * w) / sum));
  counts[counts.length - 1] =
    (counts[counts.length - 1] ?? 0) + total - counts.reduce((a, b) => a + b, 0);

  const cells: Array<{ kind: "head" } | { kind: "brand"; brand: CatalogBrand }> = [
    { kind: "head" },
    ...brands.map((brand) => ({ kind: "brand" as const, brand })),
  ];

  const rows: CatalogCell[][] = [];
  let k = 0;
  counts.forEach((count, r) => {
    const slice = cells.slice(k, k + count);
    rows.push(
      slice.map((cell, c) => {
        const index = k + c;
        if (cell.kind === "head") return { kind: "head", k: index };
        const base = 0.8 + rnd(r * 13 + c) * 1.3;
        return {
          kind: "brand",
          k: index,
          brand: cell.brand,
          base,
          grow: base * Math.max(4, slice.length * 0.75),
        };
      }),
    );
    k += count;
  });
  return rows.filter((row) => row.length > 0);
}
