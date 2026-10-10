/**
 * Destinos externos y páginas que aún no existen. `null` = pendiente (docs/PENDIENTES.md):
 * se renderiza como texto, sin enlace, para no tener enlaces muertos.
 */
export const LINKS = {
  marketplace: "/marketplace",
  stores: null,
  forBrands: null,
  privacy: null,
  terms: null,
  appStore: null,
  googlePlay: null,
  instagram: null,
  x: null,
} as const satisfies Record<string, string | null>;

export type LinkKey = keyof typeof LINKS;
