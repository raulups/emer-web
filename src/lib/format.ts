/**
 * Reglas de datos del README del handoff (sección «Datos»). Puras: sirven en servidor y cliente.
 */

type Priced = {
  current_price: number | null;
  original_price: number | null;
  is_on_sale: boolean;
};

type Dated = { name: string; created_at: string; founded_year: number | null };
type Counted = { name: string; product_count: number };
type Imaged = { img: string | null };

/** `34 €` / `25,60 €`; `—` si no hay precio. */
export function price(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const text = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
  return `${text} €`;
}

/** Porcentaje de descuento: `round((1 − current/original)·100)`; 0 si no está rebajado. */
export function discount(p: Priced): number {
  if (!p.is_on_sale || p.current_price == null || !p.original_price) return 0;
  return Math.max(0, Math.round((1 - p.current_price / p.original_price) * 100));
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "es");

/** Populares: por número de productos, de más a menos. */
export function popularBrands<T extends Counted>(brands: readonly T[]): T[] {
  return [...brands].sort((a, b) => b.product_count - a.product_count || byName(a, b));
}

/** Novedades: por `created_at`, de la más reciente a la más antigua. */
export function newestBrands<T extends Dated>(brands: readonly T[]): T[] {
  return [...brands].sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || byName(a, b),
  );
}

/** Emergentes: por `founded_year`, de la más joven a la más antigua (sin año, al final). */
export function emergentBrands<T extends Dated>(brands: readonly T[]): T[] {
  return [...brands].sort(
    (a, b) =>
      (b.founded_year ?? Number.NEGATIVE_INFINITY) - (a.founded_year ?? Number.NEGATIVE_INFINITY) ||
      byName(a, b),
  );
}

/** Imagen de marca; si falta, el `main_image_url` del primer producto de la marca. */
export function brandImage(
  brand: Imaged,
  firstProductImage: string | null | undefined,
): string | null {
  return brand.img || firstProductImage || null;
}
