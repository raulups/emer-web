const nf = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** «EUR 34» · «EUR 34,99» · «SIN PRECIO» (precio 0 o ausente). */
export function eur(value: number): string {
  if (!(value > 0)) return "SIN PRECIO";
  return `EUR ${nf.format(value)}`;
}

/** −NN % si hay oferta real; si no, null. */
export function discountPct(price: number, original: number | null): number | null {
  if (original === null || !(price > 0) || original <= price) return null;
  return Math.round((1 - price / original) * 100);
}

export const pad3 = (n: number): string => String(n).padStart(3, "0");

/** «1 PIEZA» / «47 PIEZAS». */
export function piecesLabel(n: number): string {
  return `${n} ${n === 1 ? "PIEZA" : "PIEZAS"}`;
}

/** Shopify permite pedir el ancho; el resto de hosts se sirven tal cual. */
export function imgSrc(url: string, width: number): string {
  try {
    const u = new URL(url);
    if (u.hostname === "cdn.shopify.com") {
      u.searchParams.set("width", String(width));
      return u.toString();
    }
  } catch {
    // ruta local o URL inválida: se usa tal cual
  }
  return url;
}
