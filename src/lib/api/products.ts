import { cacheTag } from "next/cache";
import { ApiError, type ApiResult, apiGet, settle, toQuery } from "./client";
import * as normalize from "./normalize";
import type {
  ProductDetail,
  ProductsPage,
  ProductsQuery,
  RawProduct,
  RawProductsPage,
} from "./types";

/**
 * El backend lee los filtros de `/products` en snake_case; los camelCase se ignoran sin error.
 * Las listas (`brand_id`, `size`, `color`) se envían repitiendo la clave.
 */
function productsQuery(query: ProductsQuery, withBrandIds: boolean): string {
  return toQuery({
    page: query.page,
    page_size: query.pageSize,
    brand_id: withBrandIds ? query.brandIds : undefined,
    category_id: query.categoryId,
    size: query.sizes,
    color: query.colors,
    on_sale: query.onSale,
    min_price: query.minPrice,
    max_price: query.maxPrice,
    sort: query.sort,
    q: query.q,
  });
}

/** Página de productos disponibles con sus facetas (categorías, tallas, colores, precio). */
export async function getProducts(query: ProductsQuery = {}): Promise<ApiResult<ProductsPage>> {
  "use cache";
  cacheTag("products");

  return settle(async () => {
    const { data } = await apiGet<RawProductsPage>(`/products${productsQuery(query, true)}`);
    return normalize.productsPage(data);
  }, "hours");
}

/** Productos de una marca, con la misma forma que `getProducts`. */
export async function getBrandProducts(
  brandId: string,
  query: Omit<ProductsQuery, "brandIds"> = {},
): Promise<ApiResult<ProductsPage>> {
  "use cache";
  cacheTag("products", `brand:${brandId}`);

  return settle(async () => {
    const { data } = await apiGet<RawProductsPage>(
      `/brands/${encodeURIComponent(brandId)}/products${productsQuery(query, false)}`,
    );
    return normalize.productsPage(data);
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
