import type { MarketQuery, PriceKey } from "./types";

export type PriceRange = { key: PriceKey; label: string; min: number | null; max: number | null };

/** Tramos del diseño. El mínimo excluye el tramo anterior y los productos sin precio (0). */
export const PRICE_RANGES: readonly PriceRange[] = [
  { key: "a", label: "HASTA 30 €", min: 0.01, max: 30 },
  { key: "b", label: "30–60 €", min: 30.01, max: 60 },
  { key: "c", label: "60–100 €", min: 60.01, max: 100 },
  { key: "d", label: "MÁS DE 100 €", min: 100.01, max: null },
];

export const SORT_OPTIONS = [
  { key: "rel", short: "RELEVANCIA", long: "RELEVANCIA" },
  { key: "asc", short: "↑ PRECIO", long: "PRECIO: DE MENOR A MAYOR" },
  { key: "desc", short: "↓ PRECIO", long: "PRECIO: DE MAYOR A MENOR" },
  { key: "az", short: "A–Z", long: "MARCA: A–Z" },
] as const;

export type Run = { minPrice?: number; maxPrice?: number };

/** El backend admite un solo rango: los tramos contiguos se funden y los demás son consultas aparte. */
export function priceRuns(keys: readonly PriceKey[]): Run[] {
  const selected = PRICE_RANGES.filter((r) => keys.includes(r.key));
  const runs: Array<{ min: number | null; max: number | null }> = [];
  let open = false;
  for (const range of PRICE_RANGES) {
    if (!selected.includes(range)) {
      open = false;
      continue;
    }
    if (open) {
      const last = runs[runs.length - 1];
      if (last) last.max = range.max;
    } else {
      runs.push({ min: range.min, max: range.max });
      open = true;
    }
  }
  return runs.map((r) => ({
    ...(r.min !== null && { minPrice: r.min }),
    ...(r.max !== null && { maxPrice: r.max }),
  }));
}

/** Número de filtros activos (el «(2)» de FILTROS): marcas + tramos de precio. */
export function panelFilterCount(query: MarketQuery): number {
  return query.marcas.length + query.precio.length;
}

export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}
