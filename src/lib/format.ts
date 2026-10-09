/** Utilidades de presentación compartidas por las secciones (derivados en cliente del handoff). */

export const upper = (value: string) => value.toLocaleUpperCase("es");

export function domain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const priceFormatters = new Map<string, Intl.NumberFormat>();

export function price(value: number | null, currency = "EUR"): string | null {
  if (value === null || Number.isNaN(value)) return null;
  const decimals = value % 1 ? 2 : 0;
  const key = `${currency}:${decimals}`;
  let formatter = priceFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    priceFormatters.set(key, formatter);
  }
  return formatter.format(value);
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export const norm = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
