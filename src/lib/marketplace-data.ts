import { type DataResult, getCategories, getProducts, type ProductPage } from "@/lib/data";
import {
  categoryOrder,
  type FeedCursor,
  type Filters,
  formatCursor,
  interleaveBrands,
  isDefaultOrder,
  toProductsQuery,
} from "@/lib/marketplace";

/** Respuesta de `/api/products` y estado inicial del Marketplace. */
export type MarketplacePage = {
  page: ProductPage;
  /** Productos en oferta con el resto de filtros (para «SOLO OFERTAS · n»). */
  saleCount: number;
  /**
   * Orden por defecto: siguiente página del recorrido por categorías (se devuelve tal cual en
   * `?cursor=`). `null` con filtros (paginación normal) o al terminar el recorrido.
   */
  cursor: string | null;
};

/**
 * Página del Marketplace. Sin filtros ni orden explícito (`isDefaultOrder`), recorre las
 * categorías en `CATEGORY_ORDER` (ver `defaultOrderPage`); si no, una consulta paginada normal.
 */
export async function getMarketplacePage(
  filters: Filters,
  page = 1,
  cursor: FeedCursor | null = null,
): Promise<DataResult<MarketplacePage>> {
  if (isDefaultOrder(filters)) {
    const feed = await defaultOrderPage(filters, cursor);
    if (feed) return feed;
  }
  return queryPage(filters, page);
}

/**
 * El backend no da el recuento de ofertas como faceta: si el filtro no está activo se pide aparte
 * (una página de 1, cacheada).
 */
async function saleCountOf(filters: Filters, page: ProductPage | null) {
  if (filters.sale && page) return page.total;
  const sale = await getProducts({ ...toProductsQuery({ ...filters, sale: true }), pageSize: 1 });
  return sale.ok ? sale.data.total : 0;
}

async function queryPage(filters: Filters, page: number): Promise<DataResult<MarketplacePage>> {
  const [products, saleCount] = await Promise.all([
    getProducts(toProductsQuery(filters, page)),
    filters.sale || page > 1 ? 0 : saleCountOf(filters, null),
  ]);
  if (!products.ok) return products;
  return {
    ok: true,
    data: {
      page: products.data,
      saleCount: filters.sale ? products.data.total : saleCount,
      cursor: null,
    },
  };
}

/**
 * Orden por defecto: `/products?category_id=<id>&sort=newest&page=N` hasta `has_more = false`
 * y después la siguiente categoría, con `brand_id` si hay marca. Las categorías sin productos
 * (según las facetas, que responden a la marca) se saltan sin pedirlas. Cada página intercala
 * las marcas. Total, facetas y recuento de ofertas son los de la consulta sin categoría, para que
 * el menú no cambie. `null` si no se pueden ordenar las categorías (paginación normal).
 */
async function defaultOrderPage(
  filters: Filters,
  cursor: FeedCursor | null,
): Promise<DataResult<MarketplacePage> | null> {
  const at = cursor ?? { cat: 0, page: 1 };
  const [base, categories] = await Promise.all([
    getProducts({ ...toProductsQuery(filters), pageSize: 1 }),
    getCategories(),
  ]);
  if (!base.ok) return base;
  if (!categories.ok) return null;

  const { ids, missing } = categoryOrder(categories.data);
  if (missing.length > 0 && cursor === null) {
    console.warn("[marketplace] categorías del orden por defecto que no existen:", missing);
  }
  const counts = new Map(base.data.facets.categories.map((c) => [c.id, c.count]));
  const order = ids.filter((id) => (counts.get(id) ?? 0) > 0);
  const category = order[at.cat];

  const [chunk, saleCount] = await Promise.all([
    category ? getProducts({ ...toProductsQuery(filters, at.page), categoryId: category }) : null,
    cursor === null ? saleCountOf(filters, base.data) : 0,
  ]);
  if (chunk && !chunk.ok) return chunk;

  const next: FeedCursor | null = !chunk
    ? null
    : chunk.data.hasMore
      ? { cat: at.cat, page: at.page + 1 }
      : at.cat + 1 < order.length
        ? { cat: at.cat + 1, page: 1 }
        : null;

  return {
    ok: true,
    data: {
      page: {
        items: chunk ? interleaveBrands(chunk.data.items) : [],
        total: base.data.total,
        page: 1,
        hasMore: next !== null,
        facets: base.data.facets,
      },
      saleCount,
      cursor: next ? formatCursor(next) : null,
    },
  };
}
