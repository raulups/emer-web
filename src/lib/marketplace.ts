import type { ProductSort, ProductsQuery } from "@/lib/data";

/**
 * Estado de filtros del Marketplace (README §3) y su traducción a la API.
 * Puro: lo usan el cliente, la ruta `/api/products` y los tests.
 */

export type Sort = "new" | "asc" | "desc";

export type Filters = {
  cat: string | null;
  brands: readonly string[];
  sizes: readonly string[];
  colors: readonly string[];
  sale: boolean;
  sort: Sort;
  /** `null` = sin límite (extremo del rango). */
  lo: number | null;
  hi: number | null;
};

export const EMPTY_FILTERS: Filters = {
  cat: null,
  brands: [],
  sizes: [],
  colors: [],
  sale: false,
  sort: "new",
  lo: null,
  hi: null,
};

export const PAGE_SIZE = 24;

export const SORT_OPTIONS: readonly { value: Sort; label: string }[] = [
  { value: "new", label: "NOVEDADES" },
  { value: "asc", label: "PRECIO ASCENDENTE" },
  { value: "desc", label: "PRECIO DESCENDENTE" },
];

/** Tallas del panel; `value` es la talla normalizada del backend. */
export const SIZE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "ONE SIZE", label: "ÚNICA" },
];

const SORT_TO_API: Record<Sort, ProductSort> = {
  new: "newest",
  asc: "price_asc",
  desc: "price_desc",
};

/** Añade o quita `value` de la lista sin mutarla. */
export function toggle(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** FILTROS (n): tallas + colores + ofertas + precio. */
export function filterCount(f: Filters): number {
  return (
    f.sizes.length + f.colors.length + (f.sale ? 1 : 0) + (f.lo != null || f.hi != null ? 1 : 0)
  );
}

export function hasFilters(f: Filters): boolean {
  return f.brands.length > 0 || f.cat !== null || filterCount(f) > 0;
}

export function toProductsQuery(f: Filters, page = 1): ProductsQuery {
  return {
    page,
    pageSize: PAGE_SIZE,
    brandIds: f.brands,
    categoryId: f.cat ?? undefined,
    sizes: f.sizes,
    colors: f.colors,
    onSale: f.sale || undefined,
    minPrice: f.lo ?? undefined,
    maxPrice: f.hi ?? undefined,
    sort: SORT_TO_API[f.sort],
  };
}

/** Query string de `/api/products` (mismos nombres que la API del backend). */
export function toSearchParams(f: Filters, page = 1): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), sort: f.sort });
  if (f.cat) params.set("category_id", f.cat);
  for (const id of f.brands) params.append("brand_id", id);
  for (const size of f.sizes) params.append("size", size);
  for (const color of f.colors) params.append("color", color);
  if (f.sale) params.set("on_sale", "true");
  if (f.lo != null) params.set("min_price", String(f.lo));
  if (f.hi != null) params.set("max_price", String(f.hi));
  return params;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIST = 50;
const MAX_TEXT = 40;
const MAX_PAGE = 1000;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

function price(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
}

function texts(values: string[]): string[] | null {
  if (values.length > MAX_LIST) return null;
  const clean = values.map((v) => v.trim()).filter(Boolean);
  return clean.every((v) => v.length <= MAX_TEXT) ? clean : null;
}

export type ParsedQuery =
  | { ok: true; filters: Filters; page: number }
  | { ok: false; error: string };

/** Valida el query string de `/api/products`. Nunca confía en la entrada. */
export function parseSearchParams(params: URLSearchParams): ParsedQuery {
  const page = Number(params.get("page") ?? "1");
  if (!Number.isInteger(page) || page < 1 || page > MAX_PAGE) {
    return { ok: false, error: "page no válido" };
  }
  const sort = params.get("sort") ?? "new";
  if (sort !== "new" && sort !== "asc" && sort !== "desc") {
    return { ok: false, error: "sort no válido" };
  }
  const cat = params.get("category_id");
  if (cat !== null && !isUuid(cat)) return { ok: false, error: "category_id no válido" };
  const brands = params.getAll("brand_id");
  if (brands.length > MAX_LIST || !brands.every(isUuid)) {
    return { ok: false, error: "brand_id no válido" };
  }
  const sizes = texts(params.getAll("size"));
  const colors = texts(params.getAll("color"));
  if (!sizes || !colors) return { ok: false, error: "size o color no válidos" };
  const lo = price(params.get("min_price"));
  const hi = price(params.get("max_price"));
  if ((params.has("min_price") && lo === null) || (params.has("max_price") && hi === null)) {
    return { ok: false, error: "precio no válido" };
  }
  return {
    ok: true,
    page,
    filters: { cat, brands, sizes, colors, sale: params.get("on_sale") === "true", sort, lo, hi },
  };
}

/** Las imágenes de Shopify aceptan `width`: se piden al tamaño de la tarjeta. */
export function sizedImage(url: string, width: number): string {
  try {
    const parsed = new URL(url, "http://local");
    if (parsed.hostname !== "cdn.shopify.com") return url;
    parsed.searchParams.set("width", String(width));
    return parsed.toString();
  } catch {
    return url;
  }
}
