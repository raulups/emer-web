import { type DataResult, getProducts, type ProductPage } from "@/lib/data";
import { type Filters, toProductsQuery } from "@/lib/marketplace";

/** Respuesta de `/api/products` y estado inicial del Marketplace. */
export type MarketplacePage = {
  page: ProductPage;
  /** Productos en oferta con el resto de filtros (para «SOLO OFERTAS · n»). */
  saleCount: number;
};

/**
 * Página del Marketplace. El backend no da el recuento de ofertas como faceta: si el filtro
 * no está activo se pide aparte (una página de 1, cacheada).
 */
export async function getMarketplacePage(
  filters: Filters,
  page = 1,
): Promise<DataResult<MarketplacePage>> {
  const query = toProductsQuery(filters, page);
  const [products, sale] = await Promise.all([
    getProducts(query),
    filters.sale || page > 1
      ? null
      : getProducts({ ...toProductsQuery({ ...filters, sale: true }), pageSize: 1 }),
  ]);
  if (!products.ok) return products;
  const saleCount = filters.sale ? products.data.total : sale?.ok ? sale.data.total : 0;
  return { ok: true, data: { page: products.data, saleCount } };
}
