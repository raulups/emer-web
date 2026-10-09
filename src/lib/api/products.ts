import { cacheTag } from "next/cache";
import { ApiError, type ApiResult, apiGet, settle, toQuery } from "./client";
import * as normalize from "./normalize";
import type { Paginated, Product, ProductDetail, ProductsQuery, RawProduct } from "./types";

function productsQuery(query: ProductsQuery, withBrandIds: boolean): string {
  return toQuery({
    limit: query.limit,
    offset: query.offset,
    brandIds: withBrandIds ? query.brandIds : undefined,
    categoryId: query.categoryId,
    isOnSale: query.isOnSale,
    available: query.available,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    sort: query.sort,
  });
}

/** Por defecto el servidor solo devuelve productos disponibles (`available=true`). */
export async function getProducts(
  query: ProductsQuery = {},
): Promise<ApiResult<Paginated<Product>>> {
  "use cache";
  cacheTag("products");

  return settle(async () => {
    const { data, meta } = await apiGet<RawProduct[]>(`/products${productsQuery(query, true)}`);
    return normalize.paginated(data, meta, normalize.product);
  }, "hours");
}

/** Productos de una marca. Aquí `available` no se filtra por defecto. */
export async function getBrandProducts(
  brandId: string,
  query: Omit<ProductsQuery, "brandIds"> = {},
): Promise<ApiResult<Paginated<Product>>> {
  "use cache";
  cacheTag("products", `brand:${brandId}`);

  return settle(async () => {
    const { data, meta } = await apiGet<RawProduct[]>(
      `/brands/${encodeURIComponent(brandId)}/products${productsQuery(query, false)}`,
    );
    return normalize.paginated(data, meta, normalize.product);
  }, "hours");
}

/** `data: null` si el producto no existe o el id no es un UUID válido. */
export async function getProduct(id: string): Promise<ApiResult<ProductDetail | null>> {
  "use cache";
  cacheTag("products", `product:${id}`);

  return settle(async () => {
    try {
      const { data } = await apiGet<RawProduct>(`/products/${encodeURIComponent(id)}`);
      return data ? normalize.productDetail(data) : null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
      throw error;
    }
  }, "hours");
}
