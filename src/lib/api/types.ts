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
  is_emergent: boolean;
  created_at: string;
  store_locations: RawStoreLocation[];
  preview_products?: RawProductPreview[];
  total_product_count?: number;
  founded_year?: number;
  style?: string;
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
  attributes?: RawProductAttributes;
  sizes?: RawProductSize[];
  price_history?: RawPriceHistory[];
  created_at?: string;
  updated_at?: string;
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
  createdAt: string;
  storeLocations: StoreLocation[];
  previewProducts: ProductPreview[];
  totalProductCount: number;
  onSaleCount: number;
  categoryCounts: Record<string, number>;
  foundedYear: number | null;
  style: string | null;
};

export type ProductSize = {
  label: string;
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

// ---------- Filtros ----------

export type PageParams = { limit?: number; offset?: number };

export type BrandsQuery = PageParams & {
  isEmergent?: boolean;
  /** Coincidencia parcial sobre la ciudad de las tiendas físicas. */
  city?: string;
};

export type ProductSort = "newest" | "oldest" | "price_asc" | "price_desc";

export type ProductsQuery = PageParams & {
  brandIds?: string[];
  categoryId?: string;
  isOnSale?: boolean;
  /** En /products el servidor aplica `true` por defecto; en /brands/{id}/products no filtra. */
  available?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};
