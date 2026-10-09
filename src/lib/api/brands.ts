import { cacheTag } from "next/cache";
import { ApiError, type ApiResult, apiGet, settle, toQuery } from "./client";
import * as normalize from "./normalize";
import type { Brand, BrandsQuery, Paginated, RawBrand } from "./types";

export async function getBrands(query: BrandsQuery = {}): Promise<ApiResult<Paginated<Brand>>> {
  "use cache";
  cacheTag("brands");

  return settle(async () => {
    const { data, meta } = await apiGet<RawBrand[]>(
      `/brands${toQuery({
        limit: query.limit,
        offset: query.offset,
        isEmergent: query.isEmergent,
        city: query.city,
      })}`,
    );
    return normalize.paginated(data, meta, normalize.brand);
  }, "hours");
}

/** `data: null` si la marca no existe o el id no es un UUID válido. */
export async function getBrand(id: string): Promise<ApiResult<Brand | null>> {
  "use cache";
  cacheTag("brands", `brand:${id}`);

  return settle(async () => {
    try {
      const { data } = await apiGet<RawBrand>(`/brands/${encodeURIComponent(id)}`);
      return data ? normalize.brand(data) : null;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
      throw error;
    }
  }, "hours");
}

/**
 * Recorre todas las páginas de `/brands` (máx. 100 por petición; hoy son ~31 marcas → 1).
 * Úsalo con moderación: el rate limit del backend es de 60 peticiones por minuto.
 */
export async function getAllBrands(
  query: Omit<BrandsQuery, "limit" | "offset"> = {},
): Promise<ApiResult<Brand[]>> {
  const items: Brand[] = [];
  let offset = 0;
  for (;;) {
    const page = await getBrands({ ...query, limit: 100, offset });
    if (!page.ok) return page;
    items.push(...page.data.items);
    if (!page.data.hasMore) return { ok: true, data: items };
    offset += page.data.limit;
  }
}
