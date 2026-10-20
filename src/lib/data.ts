import {
  type Brand as ApiBrand,
  type Category as ApiCategory,
  type Product as ApiProduct,
  type ProductSize as ApiProductSize,
  type ProductsPage as ApiProductsPage,
  type ApiResult,
  getBrandProducts as apiBrandProducts,
  getCategories as apiCategories,
  getProducts as apiProducts,
  getAllBrands,
  getProduct,
  type ProductFacets,
  type ProductSort,
  type ProductsQuery,
} from "@/lib/api";

/**
 * Lecturas de EMER con la forma de las tablas del README del handoff
 * (brands, products, product_sizes, categories).
 *
 * Los datos salen del backend KMP (`@/lib/api`, con "use cache"), nunca de Supabase directamente.
 * Solo servidor (los tipos se pueden importar con `import type` desde el cliente).
 */

export type { ApiResult as DataResult, ProductFacets, ProductSort, ProductsQuery };

export type PreviewProduct = {
  id: string;
  main_image_url: string | null;
  current_price: number | null;
  currency: string;
};

export type Brand = {
  id: string;
  name: string;
  url: string | null;
  img: string | null;
  logo: string | null;
  color: string | null;
  tags: string[];
  founded_year: number | null;
  style: string | null;
  description: string | null;
  created_at: string;
  product_count: number;
  preview_products: PreviewProduct[];
};

export type Product = {
  id: string;
  brand_id: string | null;
  category_id: string | null;
  name: string;
  product_url: string;
  currency: string;
  current_price: number | null;
  original_price: number | null;
  is_on_sale: boolean;
  available: boolean;
  main_image_url: string | null;
  image_urls: string[];
  color_name: string | null;
  color_hex: string | null;
  created_at: string | null;
};

export type ProductSize = {
  product_id: string;
  size_label: string;
  size_normalized: string;
  stock_status: string | null;
  available: boolean;
};

export type Category = {
  id: string;
  name: string;
  parent_id: string | null;
};

export type ProductPage = {
  items: Product[];
  total: number;
  page: number;
  hasMore: boolean;
  facets: ProductFacets;
};

// ---------- Mapeo API → tablas ----------

function toBrand(b: ApiBrand): Brand {
  return {
    id: b.id,
    name: b.name,
    url: b.url,
    img: b.img,
    logo: b.logo,
    color: b.color,
    tags: b.tags,
    founded_year: b.foundedYear,
    style: b.style,
    description: b.description,
    created_at: b.createdAt,
    product_count: b.totalProductCount,
    preview_products: b.previewProducts.map((p) => ({
      id: p.id,
      main_image_url: p.imageUrl,
      current_price: p.price,
      currency: p.currency,
    })),
  };
}

function toProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    brand_id: p.brandId,
    category_id: p.categoryId,
    name: p.name,
    product_url: p.productUrl,
    currency: p.currency,
    current_price: p.price,
    original_price: p.originalPrice,
    is_on_sale: p.isOnSale,
    available: p.available,
    main_image_url: p.imageUrl,
    image_urls: p.imageUrls,
    color_name: p.colorName,
    color_hex: p.colorHex,
    created_at: p.createdAt,
  };
}

function toProductSize(productId: string, s: ApiProductSize): ProductSize {
  return {
    product_id: productId,
    size_label: s.label,
    size_normalized: s.normalized,
    stock_status: s.stockStatus,
    available: s.available,
  };
}

function toCategory(c: ApiCategory): Category {
  return { id: c.id, name: c.name, parent_id: c.parentId };
}

function toProductPage(page: ApiProductsPage): ProductPage {
  return {
    items: page.items.map(toProduct),
    total: page.total,
    page: page.page,
    hasMore: page.hasMore,
    facets: page.facets,
  };
}

function mapResult<T, U>(result: ApiResult<T>, map: (data: T) => U): ApiResult<U> {
  return result.ok ? { ok: true, data: map(result.data) } : result;
}

// ---------- Consultas ----------

/** Todas las marcas, con recuento y productos de muestra. */
export async function getBrands(): Promise<ApiResult<Brand[]>> {
  return mapResult(await getAllBrands(), (brands) => brands.map(toBrand));
}

export async function getCategories(): Promise<ApiResult<Category[]>> {
  return mapResult(await apiCategories(), (categories) => categories.map(toCategory));
}

/** Productos disponibles, paginados y filtrados en el servidor, con sus facetas. */
export async function getProducts(query: ProductsQuery = {}): Promise<ApiResult<ProductPage>> {
  return mapResult(await apiProducts(query), toProductPage);
}

/** Productos de una marca (incluye agotados). */
export async function getBrandProducts(
  brandId: string,
  query: Omit<ProductsQuery, "brandIds"> = {},
): Promise<ApiResult<ProductPage>> {
  return mapResult(await apiBrandProducts(brandId, query), toProductPage);
}

/** Ficha corta de un producto para el detalle en hover de Explora (las vistas previas no traen más). */
export type ProductPeek = {
  name: string;
  url: string;
  price: number | null;
  original_price: number | null;
  is_on_sale: boolean;
  color_name: string | null;
  sizes: { label: string; available: boolean }[];
};

export async function getProductPeek(productId: string): Promise<ApiResult<ProductPeek | null>> {
  return mapResult(await getProduct(productId), (detail) =>
    detail
      ? {
          name: detail.name,
          url: detail.productUrl,
          price: detail.price,
          original_price: detail.originalPrice,
          is_on_sale: detail.isOnSale,
          color_name: detail.colorName,
          sizes: detail.sizes.map((size) => ({ label: size.label, available: size.available })),
        }
      : null,
  );
}

/** Tallas de un producto. Las listas no las traen: solo el detalle (`GET /products/{id}`). */
export async function getProductSizes(productId: string): Promise<ApiResult<ProductSize[]>> {
  return mapResult(await getProduct(productId), (detail) =>
    (detail?.sizes ?? []).map((size) => toProductSize(productId, size)),
  );
}
