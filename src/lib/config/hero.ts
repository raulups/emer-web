import type { Brand } from "@/lib/api";

export const HERO_MAX_BRANDS = 6;
export const HERO_AUTOPLAY_MS = 7_000;

/**
 * Marcas del hero. DECISIÓN PENDIENTE (docs/PENDIENTES.md): no existe el campo «destacada»,
 * así que se usan las 6 primeras del orden de la API que tienen imagen.
 */
export function selectHeroBrands(brands: Brand[]): Brand[] {
  return brands.filter((brand) => brand.img).slice(0, HERO_MAX_BRANDS);
}
