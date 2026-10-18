/**
 * Tipos de la API de Emer. Ver docs/API_CONTRACT.md.
 *
 * `Raw*` = forma exacta del JSON (snake_case, con campos omitidos por el servidor).
 * Sin prefijo = modelo de dominio normalizado (camelCase, sin campos opcionales sorpresa).
 */

// ---------- Envoltorio ----------

export type ApiMeta = { total: number; limit: number; offset: number };

export type ApiEnvelope<T> = { data?: T; error?: string; meta?: ApiMeta };

export type Paginated<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

// ---------- Crudo (JSON) ----------

export type RawStoreLocation = {
  id: string;
  brand_id: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  place_id: string | null;
};

export type RawProductPreview = {
  id: string;
  main_image_url: string | null;
  current_price: number | null;
  currency: string;
};

export type RawBrand = {
  id: string;
  name: string;
  url: string | null;
  img: string | null;
  logo: string | null;
  color: string | null;
  is_emergent?: boolean;
  tags?: string[];
  created_at: string;
  store_locations: RawStoreLocation[];
  preview_products?: RawProductPreview[];
  total_product_count?: number;
  founded_year?: number;
  style?: string;
  /** Aún no lo envía el backend (ver docs/PENDIENTES.md); la web lo pinta si llega. */
  description?: string | null;
  on_sale_count?: number;
  category_counts?: Record<string, number>;
};

export type RawProductAttributes = {
  tags?: string[];
  product_type?: string;
  vendor?: string;
};

export type RawProductSize = {
  size_label: string;
  size_normalized?: string;
  sku?: string;
  available?: boolean;
  stock_status?: string;
  stock_quantity?: number;
};

export type RawPriceHistory = {
  price: number;
  currency: string;
  scraped_at: string;
};

export type RawProduct = {
  id: string;
  brand_id: string | null;
  category_id: string | null;
  external_id?: string;
  handle?: string;
  name: string;
  description: string | null;
  product_url: string;
  currency: string;
  current_price: number | null;
  original_price: number | null;
  is_on_sale: boolean;
  available: boolean;
  main_image_url: string | null;
  thumbnail_image_url: string | null;
  image_urls: string[];
  color_name: string | null;
  color_hex?: string | null;
  attributes?: RawProductAttributes;
  sizes?: RawProductSize[];
  price_history?: RawPriceHistory[];
  created_at?: string;
  updated_at?: string;
};

export type RawProductFacets = {
  categories?: Array<{ id: string; name: string; count: number }>;
  sizes?: Array<{ value: string; count: number }>;
  colors?: Array<{ name: string; hex: string | null; count: number }>;
  price_range?: { min: number; max: number } | null;
};

/** `GET /products` y `GET /brands/{id}/products`: `data` es una página con facetas. */
export type RawProductsPage = {
  products: RawProduct[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  filters?: RawProductFacets;
};

export type RawCategory = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

// ---------- Dominio ----------

export type StoreLocation = {
  id: string;
  brandId: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  placeId: string | null;
};

export type ProductPreview = {
  id: string;
  imageUrl: string | null;
  price: number | null;
  currency: string;
};

export type Brand = {
  id: string;
  name: string;
  url: string | null;
  img: string | null;
  logo: string | null;
  color: string | null;
  isEmergent: boolean;
  tags: string[];
  createdAt: string;
  storeLocations: StoreLocation[];
  previewProducts: ProductPreview[];
  totalProductCount: number;
  onSaleCount: number;
  categoryCounts: Record<string, number>;
  foundedYear: number | null;
  style: string | null;
  description: string | null;
};

export type ProductSize = {
  label: string;
  /** Talla normalizada por el backend (S, M, L, XL, ONE SIZE…). */
  normalized: string;
  sku: string | null;
  available: boolean;
  stockStatus: string | null;
  stockQuantity: number | null;
};

export type PriceHistoryEntry = {
  price: number;
  currency: string;
  scrapedAt: string;
};

export type Product = {
  id: string;
  brandId: string | null;
  categoryId: string | null;
  handle: string | null;
  name: string;
  description: string | null;
  productUrl: string;
  currency: string;
  price: number | null;
  originalPrice: number | null;
  isOnSale: boolean;
  available: boolean;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  imageUrls: string[];
  colorName: string | null;
  colorHex: string | null;
  tags: string[];
  productType: string | null;
  vendor: string | null;
  createdAt: string | null;
};

export type ProductDetail = Product & {
  sizes: ProductSize[];
  priceHistory: PriceHistoryEntry[];
};

export type Category = {
  id: string;
  name: string;
  parentId: string | null;
};

export type ProductFacets = {
  /** Recuento por categoría. El backend no aplica aquí el filtro de categoría. */
  categories: Array<{ id: string; name: string; count: number }>;
  sizes: Array<{ value: string; count: number }>;
  colors: Array<{ name: string; hex: string | null; count: number }>;
  priceRange: { min: number; max: number } | null;
};

export type ProductsPage = {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  facets: ProductFacets;
};

// ---------- Filtros ----------

export type PageParams = { limit?: number; offset?: number };

export type BrandsQuery = PageParams & {
  isEmergent?: boolean;
  /** Coincidencia parcial sobre la ciudad de las tiendas físicas. */
  city?: string;
};

export type ProductSort = "newest" | "price_asc" | "price_desc";

/** Parámetros reales de `/products` (snake_case en la URL; ver products.ts). */
export type ProductsQuery = {
  page?: number;
  pageSize?: number;
  brandIds?: readonly string[];
  categoryId?: string;
  /** Tallas normalizadas (S, M, L, XL, ONE SIZE…); cualquiera de ellas. */
  sizes?: readonly string[];
  /** Nombres de color de las facetas; cualquiera de ellos. */
  colors?: readonly string[];
  onSale?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
  q?: string;
};
