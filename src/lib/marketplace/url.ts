import type { MarketQuery, PriceKey, SortKey, ViewCols } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRICE_KEYS: readonly PriceKey[] = ["a", "b", "c", "d"];
const SORTS: readonly SortKey[] = ["rel", "asc", "desc", "az"];
const MAX_BRANDS = 40;

export const DEFAULT_QUERY: MarketQuery = {
  cat: null,
  marcas: [],
  precio: [],
  oferta: false,
  orden: "rel",
  vista: 4,
  pieza: null,
};

export const isUuid = (value: string): boolean => UUID.test(value);

type Raw = Record<string, string | string[] | undefined> | URLSearchParams;

function first(raw: Raw, key: string): string | undefined {
  if (raw instanceof URLSearchParams) return raw.get(key) ?? undefined;
  const value = raw[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Lee y sanea la URL (los UUID inválidos darían 400 en el backend). */
export function parseQuery(raw: Raw): MarketQuery {
  const cat = first(raw, "cat");
  const marcas = (first(raw, "marcas") ?? "")
    .split(",")
    .filter((id, i, all) => UUID.test(id) && all.indexOf(id) === i)
    .slice(0, MAX_BRANDS);
  const precio = PRICE_KEYS.filter((k) => (first(raw, "precio") ?? "").split("|").includes(k));
  const orden = SORTS.find((k) => k === first(raw, "orden")) ?? "rel";
  const vista = Number(first(raw, "vista"));
  const pieza = first(raw, "pieza");
  return {
    cat: cat && UUID.test(cat) ? cat : null,
    marcas,
    precio,
    oferta: first(raw, "oferta") === "1",
    orden,
    vista: vista === 2 || vista === 6 ? (vista as ViewCols) : 4,
    pieza: pieza && UUID.test(pieza) ? pieza : null,
  };
}

/** `?cat=…&marcas=a,b&precio=a|b&oferta=1&orden=asc&vista=6&pieza=…`; omite los valores por defecto. */
export function toSearch(query: MarketQuery): string {
  const params = new URLSearchParams();
  if (query.cat) params.set("cat", query.cat);
  if (query.marcas.length > 0) params.set("marcas", query.marcas.join(","));
  if (query.precio.length > 0) params.set("precio", query.precio.join("|"));
  if (query.oferta) params.set("oferta", "1");
  if (query.orden !== "rel") params.set("orden", query.orden);
  if (query.vista !== 4) params.set("vista", String(query.vista));
  if (query.pieza) params.set("pieza", query.pieza);
  // Las comas y barras van sin escapar: son legibles y válidas en un query string.
  return params.toString().replace(/%2C/g, ",").replace(/%7C/g, "|");
}

/** Lo que cambia los datos del servidor (ni `vista` ni `pieza`). */
export function dataKey(query: MarketQuery): string {
  return toSearch({ ...query, vista: 4, pieza: null });
}

export function hasFilters(query: MarketQuery): boolean {
  return query.cat !== null || query.marcas.length > 0 || query.precio.length > 0 || query.oferta;
}
