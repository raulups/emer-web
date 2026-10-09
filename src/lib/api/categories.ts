import { cacheTag } from "next/cache";
import { type ApiResult, apiGet, settle } from "./client";
import * as normalize from "./normalize";
import type { Category, RawCategory } from "./types";

/** Lista plana: raíces (ROPA, CALZADO, ACCESORIOS) seguidas de sus hijas directas. */
export async function getCategories(): Promise<ApiResult<Category[]>> {
  "use cache";
  cacheTag("categories");

  return settle(async () => {
    const { data } = await apiGet<RawCategory[]>("/categories");
    return (data ?? []).map(normalize.category);
  }, "days");
}

export function groupCategories(categories: Category[]) {
  const roots = categories.filter((c) => c.parentId === null);
  return roots.map((root) => ({
    ...root,
    children: categories.filter((c) => c.parentId === root.id),
  }));
}
