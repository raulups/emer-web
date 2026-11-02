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

/** El filtro que acaba de ponerse (el loader empieza por él); `null` si solo se quitó alguno. */
export type FilterChange =
  | { kind: "cat" | "brand" | "size" | "color"; value: string }
  | { kind: "sort"; value: Sort }
  | { kind: "sale" | "price" };

export function changedFilter(prev: Filters, next: Filters): FilterChange | null {
  const added = (a: readonly string[], b: readonly string[]) => b.find((v) => !a.includes(v));
  if (next.cat && next.cat !== prev.cat) return { kind: "cat", value: next.cat };
  const brand = added(prev.brands, next.brands);
  if (brand) return { kind: "brand", value: brand };
  const size = added(prev.sizes, next.sizes);
  if (size) return { kind: "size", value: size };
  const color = added(prev.colors, next.colors);
  if (color) return { kind: "color", value: color };
  if (next.sale && !prev.sale) return { kind: "sale" };
  if (next.sort !== prev.sort) return { kind: "sort", value: next.sort };
  if ((next.lo != null || next.hi != null) && (next.lo !== prev.lo || next.hi !== prev.hi)) {
    return { kind: "price" };
  }
  return null;
}

export function hasFilters(f: Filters): boolean {
  return f.brands.length > 0 || f.cat !== null || filterCount(f) > 0;
}

/** Un filtro activo como etiqueta y el cambio que lo quita (pantalla de «sin resultados»). */
export type ActiveFilter = { key: string; label: string; remove: Partial<Filters> };

export function activeFilters(
  f: Filters,
  names: { categories: ReadonlyMap<string, string>; brands: ReadonlyMap<string, string> },
): ActiveFilter[] {
  const list: ActiveFilter[] = [];
  if (f.cat) {
    list.push({
      key: "cat",
      label: names.categories.get(f.cat) ?? "Categoría",
      remove: { cat: null },
    });
  }
  for (const id of f.brands) {
    list.push({
      key: `brand:${id}`,
      label: names.brands.get(id) ?? "Marca",
      remove: { brands: f.brands.filter((b) => b !== id) },
    });
  }
  for (const size of f.sizes) {
    const label = SIZE_OPTIONS.find((o) => o.value === size)?.label ?? size;
    list.push({
      key: `size:${size}`,
      label: `Talla ${label}`,
      remove: { sizes: f.sizes.filter((s) => s !== size) },
    });
  }
  for (const color of f.colors) {
    list.push({
      key: `color:${color}`,
      label: color,
      remove: { colors: f.colors.filter((c) => c !== color) },
    });
  }
  if (f.sale) list.push({ key: "sale", label: "Solo ofertas", remove: { sale: false } });
  if (f.lo != null || f.hi != null) {
    const label =
      f.lo != null && f.hi != null
        ? `${f.lo}–${f.hi} €`
        : f.lo != null
          ? `Desde ${f.lo} €`
          : `Hasta ${f.hi} €`;
    list.push({ key: "price", label, remove: { lo: null, hi: null } });
  }
  return list;
}

// ---------- Orden por defecto: por categorías ----------

/**
 * Orden por defecto del Marketplace (sin filtros ni orden explícito): se recorre una categoría
 * entera (más nuevos primero) antes de pasar a la siguiente. Se compara normalizado.
 */
export const CATEGORY_ORDER = [
  "SUDADERAS",
  "CAMISETAS",
  "PANTALONES",
  "ABRIGOS Y CHAQUETAS",
  "SHORTS Y FALDAS",
  "GORRAS Y GORROS",
  "ROPA INTERIOR Y CALCETINES",
  "JERSEYS Y PUNTO",
  "POLOS",
  "TOPS",
  "BAÑADORES",
  "BOLSOS Y MOCHILAS",
  "CALZADO",
] as const;

/**
 * Las categorías de `/categories` que no están en `CATEGORY_ORDER` van al final, en el orden de
 * la API. Con `false` sus productos no aparecerían nunca en el orden por defecto.
 */
export const APPEND_UNLISTED_CATEGORIES = true;

/** Minúsculas, sin acentos (Ñ → N) y con los espacios colapsados: «BAÑADORES» = «banadores». */
export function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Ids de las categorías en el orden por defecto y los nombres de la lista que no existen. */
export function categoryOrder(categories: readonly { id: string; name: string }[]): {
  ids: string[];
  missing: string[];
} {
  const byName = new Map(categories.map((c) => [normalizeName(c.name), c.id]));
  const ids: string[] = [];
  const missing: string[] = [];
  for (const name of CATEGORY_ORDER) {
    const id = byName.get(normalizeName(name));
    if (id) ids.push(id);
    else missing.push(name);
  }
  if (APPEND_UNLISTED_CATEGORIES) {
    for (const c of categories) if (!ids.includes(c.id)) ids.push(c.id);
  }
  return { ids, missing };
}

/**
 * Orden por defecto: sin categoría, talla, color, oferta, precio ni orden explícito. La marca sí
 * se admite (mismo recorrido con `brand_id`).
 */
export function isDefaultOrder(f: Filters): boolean {
  return (
    f.cat === null &&
    f.sizes.length === 0 &&
    f.colors.length === 0 &&
    !f.sale &&
    f.lo == null &&
    f.hi == null &&
    f.sort === "new"
  );
}

/**
 * Intercala las marcas (round-robin por `brand_id`) conservando el orden relativo dentro de cada
 * marca: A1 A2 B1 C1 B2 → A1 B1 C1 A2 B2.
 */
export function interleaveBrands<T extends { brand_id: string | null }>(items: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = item.brand_id ?? "";
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  const queues = [...groups.values()];
  const out: T[] = [];
  for (let round = 0; out.length < items.length; round++) {
    for (const queue of queues) {
      const item = queue[round];
      if (item) out.push(item);
    }
  }
  return out;
}

/** Posición del recorrido por categorías: índice en el orden y página dentro de la categoría. */
export type FeedCursor = { cat: number; page: number };

export const formatCursor = (c: FeedCursor): string => `${c.cat}.${c.page}`;

/** `null` si no hay cursor; `undefined` si no es válido. */
export function parseCursor(value: string | null): FeedCursor | null | undefined {
  if (value === null) return null;
  const match = /^(\d{1,3})\.(\d{1,4})$/.exec(value);
  if (!match) return undefined;
  const page = Number(match[2]);
  return page >= 1 && page <= MAX_PAGE ? { cat: Number(match[1]), page } : undefined;
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

/**
 * Query string de `/api/products` (mismos nombres que la API del backend). Con `cursor`, la
 * siguiente página del recorrido por categorías del orden por defecto.
 */
export function toSearchParams(f: Filters, page = 1, cursor?: string): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), sort: f.sort });
  if (cursor) params.set("cursor", cursor);
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

/** Query param de la página con las marcas preseleccionadas: `?brand=<uuid>` (repetible). */
export const BRAND_PARAM = "brand";

/**
 * Marcas de `?brand=` que existen en `known`, sin repetir. Lo que no es un UUID o no está en
 * `/brands` se ignora.
 */
export function brandsFromParam(
  value: string | string[] | undefined,
  known: ReadonlySet<string>,
): string[] {
  const values = value === undefined ? [] : Array.isArray(value) ? value : [value];
  return [...new Set(values.slice(0, MAX_LIST))].filter((id) => isUuid(id) && known.has(id));
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
  | { ok: true; filters: Filters; page: number; cursor: FeedCursor | null }
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
  const cursor = parseCursor(params.get("cursor"));
  if (cursor === undefined) return { ok: false, error: "cursor no válido" };
  const lo = price(params.get("min_price"));
  const hi = price(params.get("max_price"));
  if ((params.has("min_price") && lo === null) || (params.has("max_price") && hi === null)) {
    return { ok: false, error: "precio no válido" };
  }
  return {
    ok: true,
    page,
    cursor,
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
