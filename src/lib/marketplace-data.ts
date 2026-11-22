import { type DataResult, getProducts, type ProductPage } from "@/lib/data";
import { type Filters, toProductsQuery } from "@/lib/marketplace";

/** Respuesta de `/api/products` y estado inicial del Marketplace. */
export type MarketplacePage = {
  page: ProductPage;
  /** Productos en oferta con el resto de filtros (para «SOLO OFERTAS · n»). */
  saleCount: number;
};

/**
 * El backend no da el recuento de ofertas como faceta: si el filtro no está activo se pide aparte
 * (una página de 1, cacheada).
 */
async function saleCountOf(filters: Filters) {
  const sale = await getProducts({ ...toProductsQuery({ ...filters, sale: true }), pageSize: 1 });
  return sale.ok ? sale.data.total : 0;
}

/**
 * Página del Marketplace. El orden lo decide el backend: sin filtros ni orden explícito,
 * `sort=recommended` (ver `isDefaultOrder`); si no, el orden elegido.
 */
export async function getMarketplacePage(
  filters: Filters,
  page = 1,
): Promise<DataResult<MarketplacePage>> {
  const [products, saleCount] = await Promise.all([
    getProducts(toProductsQuery(filters, page)),
    filters.sale || page > 1 ? 0 : saleCountOf(filters),
  ]);
  if (!products.ok) return products;
  return {
    ok: true,
    data: {
      page: products.data,
      saleCount: filters.sale ? products.data.total : saleCount,
    },
  };
}
