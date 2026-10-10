import { type ApiResult, type Brand, type Category, getProducts, type Product } from "@/lib/api";
import { PRICE_RANGES, priceRuns, type Run } from "./filters";
import type { BrandVM, CardVM, CategoryVM, Cursor, MarketQuery } from "./types";

export const PAGE_SIZE = 24;
const MAX_IMAGES = 4;

type Segment = Run & { brandIds?: string[] };

const API_SORT = { rel: "newest", az: "newest", asc: "price_asc", desc: "price_desc" } as const;

/**
 * El backend solo admite un rango de precio y una ordenación por petición. Para cubrir tramos
 * sueltos y «MARCA: A–Z», la consulta se parte en segmentos que se recorren en orden.
 */
function segmentsFor(query: MarketQuery, brands: readonly Brand[]): Segment[] {
  const runs: Run[] = query.precio.length > 0 ? priceRuns(query.precio) : [{}];
  if (query.orden === "desc") runs.reverse();

  if (query.orden === "az" && brands.length > 0) {
    const pool =
      query.marcas.length > 0 ? brands.filter((b) => query.marcas.includes(b.id)) : brands;
    const ordered = pool
      .filter(
        (b) => b.totalProductCount > 0 && (!query.cat || (b.categoryCounts[query.cat] ?? 0) > 0),
      )
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    return ordered.flatMap((b) => runs.map((run) => ({ ...run, brandIds: [b.id] })));
  }
  return runs.map((run) => ({
    ...run,
    ...(query.marcas.length > 0 && { brandIds: query.marcas }),
  }));
}

function apiQuery(query: MarketQuery, seg: Segment, offset: number, limit: number) {
  return {
    limit,
    offset,
    sort: API_SORT[query.orden],
    ...(query.cat && { categoryId: query.cat }),
    ...(query.oferta && { isOnSale: true }),
    ...seg,
  };
}

/** Siguiente página de piezas desde `cursor` (o desde el principio). */
export async function loadPage(
  query: MarketQuery,
  brands: readonly Brand[],
  cursor: Cursor | null,
): Promise<ApiResult<{ items: Product[]; next: Cursor | null }>> {
  const segments = segmentsFor(query, brands);
  const items: Product[] = [];
  let seg = cursor?.seg ?? 0;
  let offset = cursor?.offset ?? 0;

  while (items.length < PAGE_SIZE && seg < segments.length) {
    const segment = segments[seg] as Segment;
    // Siempre se pide la página completa desde `offset`: cachea mejor que pedir «lo que falta».
    const res = await getProducts(apiQuery(query, segment, offset, PAGE_SIZE));
    if (!res.ok) return res;
    const take = res.data.items.slice(0, PAGE_SIZE - items.length);
    items.push(...take);
    offset += take.length;
    if (take.length < res.data.items.length) break; // la página se llenó a mitad de este bloque
    if (!res.data.hasMore) {
      seg += 1;
      offset = 0;
    }
  }
  const next = seg < segments.length ? { seg, offset } : null;
  return { ok: true, data: { items, next } };
}

/**
 * Total de piezas con los filtros actuales (una petición por tramo de precio). Con un solo tramo
 * y orden por defecto usa los mismos argumentos que la primera página: sale de la caché.
 */
export async function countPieces(query: MarketQuery): Promise<ApiResult<number>> {
  const runs: Run[] = query.precio.length > 0 ? priceRuns(query.precio) : [{}];
  const seg = (run: Run): Segment => ({
    ...run,
    ...(query.marcas.length > 0 && { brandIds: query.marcas }),
  });
  const results = await Promise.all(
    runs.map((run) => getProducts(apiQuery(query, seg(run), 0, PAGE_SIZE))),
  );
  let total = 0;
  for (const res of results) {
    if (!res.ok) return res;
    total += res.data.total;
  }
  return { ok: true, data: total };
}

export function toCard(product: Product, brandName: Map<string, string>): CardVM {
  const images = [...new Set(product.imageUrls.length > 0 ? product.imageUrls : [product.imageUrl])]
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_IMAGES);
  return {
    id: product.id,
    brandId: product.brandId,
    brandName: (product.brandId && brandName.get(product.brandId)) || "",
    name: product.name,
    price: product.price ?? 0,
    originalPrice: product.isOnSale ? product.originalPrice : null,
    isOnSale: product.isOnSale,
    images,
    productUrl: product.productUrl,
    categoryId: product.categoryId,
  };
}

export function brandNames(brands: readonly Brand[]): Map<string, string> {
  return new Map(brands.map((b) => [b.id, b.name.toLocaleUpperCase("es")]));
}

export function toBrandVM(brand: Brand): BrandVM {
  return {
    id: brand.id,
    name: brand.name.toLocaleUpperCase("es"),
    logo: brand.logo,
    total: brand.totalProductCount,
    counts: brand.categoryCounts,
    more: brand.previewProducts.flatMap((p) =>
      p.imageUrl ? [{ id: p.id, image: p.imageUrl, price: p.price ?? 0 }] : [],
    ),
  };
}

/** Subcategorías en el orden de sus raíces (ROPA → CALZADO → ACCESORIOS), sin los padres. */
export function subcategories(categories: readonly Category[]): CategoryVM[] {
  const roots = categories.filter((c) => c.parentId === null);
  return roots.flatMap((root) => categories.filter((c) => c.parentId === root.id));
}

/** Piezas por tramo de precio con el resto de filtros activos (el «12» junto a cada tramo). */
export async function priceCounts(query: MarketQuery): Promise<ApiResult<Record<string, number>>> {
  const results = await Promise.all(
    PRICE_RANGES.map((r) =>
      getProducts(
        apiQuery(
          { ...query, orden: "rel" },
          {
            ...(r.min !== null && { minPrice: r.min }),
            ...(r.max !== null && { maxPrice: r.max }),
            ...(query.marcas.length > 0 && { brandIds: query.marcas }),
          },
          0,
          1,
        ),
      ),
    ),
  );
  const counts: Record<string, number> = {};
  for (const [i, res] of results.entries()) {
    if (!res.ok) return res;
    counts[(PRICE_RANGES[i] as (typeof PRICE_RANGES)[number]).key] = res.data.total;
  }
  return { ok: true, data: counts };
}
