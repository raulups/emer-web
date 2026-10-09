import { getProducts } from "./products";
import type { Brand, Product } from "./types";

/**
 * `PreviewProduct` no trae nombre ni URL (FALTA EN BACKEND). Se resuelven por id con dos
 * consultas cacheadas: novedades y ofertas de esas marcas (la vista de previews prioriza
 * ofertas y luego novedades). Lo que no se encuentre se queda sin nombre. Nunca lanza.
 */
export async function getPreviewProductsById(brands: Brand[]): Promise<Map<string, Product>> {
  const byId = new Map<string, Product>();
  if (brands.length === 0) return byId;
  const brandIds = brands.map((brand) => brand.id);
  const results = await Promise.all([
    getProducts({ brandIds, limit: 100, sort: "newest" }),
    getProducts({ brandIds, limit: 100, isOnSale: true }),
  ]);
  for (const result of results) {
    if (!result.ok) continue;
    for (const product of result.data.items) byId.set(product.id, product);
  }
  return byId;
}
