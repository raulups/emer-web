export type SortKey = "rel" | "asc" | "desc" | "az";
export type PriceKey = "a" | "b" | "c" | "d";
export type ViewCols = 2 | 4 | 6;

/** Filtros de la página: viven en la URL (ids, sin slugs). */
export type MarketQuery = {
  cat: string | null;
  marcas: string[];
  precio: PriceKey[];
  oferta: boolean;
  orden: SortKey;
  vista: ViewCols;
  pieza: string | null;
};

/** Pieza lista para pintar (serializable: viaja del servidor al cliente). */
export type CardVM = {
  id: string;
  brandId: string | null;
  brandName: string;
  name: string;
  /** 0 = sin precio. */
  price: number;
  originalPrice: number | null;
  isOnSale: boolean;
  images: string[];
  productUrl: string;
  categoryId: string | null;
};

/** Posición en el flujo de segmentos del servidor (ver `stream.ts`). */
export type Cursor = { seg: number; offset: number };

export type BrandVM = {
  id: string;
  name: string;
  logo: string | null;
  total: number;
  counts: Record<string, number>;
  more: Array<{ id: string; image: string; price: number }>;
};

export type CategoryVM = { id: string; name: string; parentId: string | null };
