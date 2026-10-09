import type {
  ApiMeta,
  Brand,
  Category,
  Paginated,
  Product,
  ProductDetail,
  ProductPreview,
  ProductSize,
  RawBrand,
  RawCategory,
  RawProduct,
  RawProductPreview,
  RawProductSize,
  RawStoreLocation,
  StoreLocation,
} from "./types";

function storeLocation(raw: RawStoreLocation): StoreLocation {
  return {
    id: raw.id,
    brandId: raw.brand_id,
    address: raw.address,
    city: raw.city,
    latitude: raw.latitude,
    longitude: raw.longitude,
    placeId: raw.place_id ?? null,
  };
}

function productPreview(raw: RawProductPreview): ProductPreview {
  return {
    id: raw.id,
    imageUrl: raw.main_image_url ?? null,
    price: raw.current_price ?? null,
    currency: raw.currency,
  };
}

export function brand(raw: RawBrand): Brand {
  return {
    id: raw.id,
    name: raw.name,
    url: raw.url ?? null,
    img: raw.img ?? null,
    logo: raw.logo ?? null,
    color: raw.color ?? null,
    isEmergent: raw.is_emergent,
    createdAt: raw.created_at,
    storeLocations: (raw.store_locations ?? []).map(storeLocation),
    // El servidor omite estos campos cuando valen su defecto (encodeDefaults = false).
    previewProducts: (raw.preview_products ?? []).map(productPreview),
    totalProductCount: raw.total_product_count ?? 0,
    onSaleCount: raw.on_sale_count ?? 0,
    categoryCounts: raw.category_counts ?? {},
    foundedYear: raw.founded_year ?? null,
    style: raw.style ?? null,
  };
}

export function product(raw: RawProduct): Product {
  return {
    id: raw.id,
    brandId: raw.brand_id ?? null,
    categoryId: raw.category_id ?? null,
    handle: raw.handle ?? null,
    name: raw.name,
    description: raw.description ?? null,
    productUrl: raw.product_url,
    currency: raw.currency,
    price: raw.current_price ?? null,
    originalPrice: raw.original_price ?? null,
    isOnSale: raw.is_on_sale,
    available: raw.available,
    imageUrl: raw.main_image_url ?? null,
    thumbnailUrl: raw.thumbnail_image_url ?? null,
    imageUrls: raw.image_urls ?? [],
    colorName: raw.color_name ?? null,
    tags: raw.attributes?.tags ?? [],
    productType: raw.attributes?.product_type ?? null,
    vendor: raw.attributes?.vendor ?? null,
    createdAt: raw.created_at ?? null,
  };
}

function productSize(raw: RawProductSize): ProductSize {
  return {
    label: raw.size_label,
    sku: raw.sku ?? null,
    // `available` se omite cuando es true: ausente = true.
    available: raw.available ?? true,
    stockStatus: raw.stock_status ?? null,
    stockQuantity: raw.stock_quantity ?? null,
  };
}

export function productDetail(raw: RawProduct): ProductDetail {
  return {
    ...product(raw),
    sizes: (raw.sizes ?? []).map(productSize),
    priceHistory: (raw.price_history ?? []).map((entry) => ({
      price: entry.price,
      currency: entry.currency,
      scrapedAt: entry.scraped_at,
    })),
  };
}

export function category(raw: RawCategory): Category {
  return { id: raw.id, name: raw.name, parentId: raw.parent_id ?? null };
}

export function paginated<R, T>(
  data: R[] | undefined,
  meta: ApiMeta | undefined,
  map: (raw: R) => T,
): Paginated<T> {
  const items = (data ?? []).map(map);
  const total = meta?.total ?? items.length;
  const limit = meta?.limit ?? items.length;
  const offset = meta?.offset ?? 0;
  return { items, total, limit, offset, hasMore: offset + items.length < total };
}
