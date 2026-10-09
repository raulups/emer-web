import { cacheLife, cacheTag } from "next/cache";
import { ApiError, apiGet, toQuery } from "./client";
import * as normalize from "./normalize";
import type { Brand, BrandsQuery, Paginated, RawBrand } from "./types";

export async function getBrands(query: BrandsQuery = {}): Promise<Paginated<Brand>> {
  "use cache";
  cacheLife("hours");
  cacheTag("brands");

  const { data, meta } = await apiGet<RawBrand[]>(
    `/brands${toQuery({
      limit: query.limit,
      offset: query.offset,
      isEmergent: query.isEmergent,
      city: query.city,
    })}`,
  );
  return normalize.paginated(data, meta, normalize.brand);
}

/** Devuelve `null` si la marca no existe o el id no es un UUID válido. */
export async function getBrand(id: string): Promise<Brand | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("brands", `brand:${id}`);

  try {
    const { data } = await apiGet<RawBrand>(`/brands/${encodeURIComponent(id)}`);
    return data ? normalize.brand(data) : null;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

/**
 * Recorre todas las páginas de `/brands` (máx. 100 por petición).
 * Úsalo con moderación: el rate limit del backend es de 60 peticiones por minuto.
 */
export async function getAllBrands(query: Omit<BrandsQuery, "limit" | "offset"> = {}) {
  const items: Brand[] = [];
  let offset = 0;
  for (;;) {
    const page = await getBrands({ ...query, limit: 100, offset });
    items.push(...page.items);
    if (!page.hasMore) return items;
    offset += page.limit;
  }
}
