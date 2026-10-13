import type {
  ApiEnvelope,
  RawBrand,
  RawCategory,
  RawProduct,
  RawProductFacets,
  RawProductSize,
  RawProductsPage,
} from "./types";

/**
 * Datos de ejemplo con la forma real de la API, para desarrollo sin backend y para los tests e2e.
 * Solo se usan con `EMER_API_FIXTURES=1`. Las imágenes son locales (public/assets).
 */

const IMAGES = [
  "rally",
  "labios",
  "estrellas-col",
  "cerezas",
  "choque",
  "pistolera",
  "golondrinas-2",
  "movil",
  "mujer",
  "ojo-grito",
  "manos",
  "bomba-policia",
].map((name) => `/assets/deco/${name}.png`);
const image = (i: number) => IMAGES[i % IMAGES.length] as string;

/** `brand_id=<este id>` en /products simula un error del backend. */
export const FAIL_BRAND_ID = "00000000-0000-4000-8000-0000000000ee";

const CAT = {
  camisetas: "38de51a7-7356-436e-8e0f-4952b5742bf8",
  sudaderas: "b4898522-f3e1-4faf-8ff2-d5f6ecd2f235",
  pantalones: "a0ca4fd5-0138-419d-b001-77f45938b571",
  gorras: "6ed4e7c2-416c-4648-81b1-437e18da139e",
  calzado: "4fb481c8-7680-4591-81b7-5a67461bbc9b", // sin productos: no aparece en el menú
} as const;
const CATEGORY_NAMES: Record<string, string> = {
  [CAT.camisetas]: "Camisetas",
  [CAT.sudaderas]: "Sudaderas",
  [CAT.pantalones]: "Pantalones",
  [CAT.gorras]: "Gorras y gorros",
  [CAT.calzado]: "Calzado",
};
const KINDS = [
  { name: "Camiseta", category: CAT.camisetas },
  { name: "Sudadera", category: CAT.sudaderas },
  { name: "Pantalón", category: CAT.pantalones },
  { name: "Gorra", category: CAT.gorras },
];
const COLORS = [
  { name: "Negro", hex: "#111111" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Azul", hex: "#1E4FA3" },
  { name: "Rojo", hex: "#C62828" },
];
const PRICES = [19, 25.5, 45, 64.9, 89, 120, 34.99, 55];
const SIZE_LABELS = ["S", "M", "L", "XL"];

type FixtureBrand = { id: string; name: string; products: number; img: string | null };

const BRANDS: FixtureBrand[] = [
  { id: "0208bdca-c705-491b-82fa-76123232670b", name: "Satenier", products: 12, img: image(0) },
  { id: "30995220-a71b-416a-8123-63e9b0037919", name: "Scuffers", products: 10, img: image(1) },
  { id: "5b7e7f3a-1c0d-4a8e-9b1f-2d3c4e5f6a7b", name: "Nocturna", products: 8, img: image(2) },
  {
    id: "6c8f8a4b-2d1e-4b9f-8c2a-3e4d5f6a7b8c",
    name: "Imagen Rota",
    products: 2,
    img: "/assets/no-existe.png",
  },
  { id: "7d9a9b5c-3e2f-4ca0-9d3b-4f5e6a7b8c9d", name: "Bajo Cero", products: 0, img: image(3) },
  { id: "8e0bac6d-4f3a-4db1-8e4c-5a6b7c8d9e0f", name: "Solar Club", products: 6, img: image(4) },
  { id: "9f1cbd7e-5a4b-4ec2-9f5d-6b7c8d9e0f1a", name: "Ruido", products: 4, img: image(5) },
  { id: "a02dce8f-6b5c-4fd3-8a6e-7c8d9e0f1a2b", name: "Calma", products: 3, img: null },
  { id: "b13edf90-7c6d-4fe4-9b7f-8d9e0f1a2b3c", name: "Marea", products: 2, img: image(6) },
  { id: "c24fe0a1-8d7e-4af5-8c80-9e0f1a2b3c4d", name: "Tinta", products: 2, img: image(7) },
];

const productId = (b: number, i: number) =>
  `${b.toString(16).padStart(8, "0")}-0000-4000-8000-${i.toString().padStart(12, "0")}`;

function sizesFor(b: number, i: number): RawProductSize[] {
  if (i % 4 === 3)
    return [{ size_label: "ONE SIZE", size_normalized: "ONE SIZE", available: true }];
  return SIZE_LABELS.map((label, k) => ({
    size_label: label,
    size_normalized: label,
    available: (i + b + k) % 5 !== 0,
  }));
}

let createdSeq = 0;
const RAW_PRODUCTS: RawProduct[] = BRANDS.flatMap((brand, b) =>
  Array.from({ length: brand.products }, (_, i): RawProduct => {
    const kind = KINDS[(i + b) % KINDS.length] as (typeof KINDS)[number];
    const color = COLORS[(i * 3 + b) % COLORS.length] as (typeof COLORS)[number];
    const price = PRICES[(i + b) % PRICES.length] as number;
    const onSale = i % 4 === 1;
    const gallery = i % 5 === 4 ? 1 : 2 + (i % 2);
    return {
      id: productId(b, i),
      brand_id: brand.id,
      category_id: kind.category,
      name: `${kind.name} ${brand.name} ${i + 1}`,
      description: null,
      product_url: `https://${brand.name.toLowerCase().replace(/\s+/g, "")}.example/products/${i}`,
      currency: "EUR",
      current_price: price,
      original_price: onSale ? Math.round(price * 1.3) : null,
      is_on_sale: onSale,
      available: true,
      main_image_url: image(i + b),
      thumbnail_image_url: image(i + b),
      image_urls: Array.from({ length: gallery }, (_, k) => image(i + b + k * 5)),
      color_name: color.name,
      color_hex: color.hex,
      sizes: sizesFor(b, i),
      // Decreciente: «newest» conserva el orden de declaración.
      created_at: new Date(Date.UTC(2026, 8, 28) - createdSeq++ * 3_600_000).toISOString(),
    };
  }),
);

const RAW_BRANDS: RawBrand[] = BRANDS.map((brand, b) => {
  const products = RAW_PRODUCTS.filter((p) => p.brand_id === brand.id);
  return {
    id: brand.id,
    name: brand.name,
    url: `https://${brand.name.toLowerCase().replace(/\s+/g, "")}.example`,
    img: brand.img,
    logo: b % 3 === 0 ? image(b + 2) : null,
    color: null,
    tags: b % 2 === 0 ? ["streetwear", "gráfico"] : ["skate"],
    founded_year: 2018 + (b % 7),
    style: b % 2 === 0 ? "Streetwear" : "Skate",
    created_at: `2026-0${9 - (b % 9)}-01T10:00:00.000000Z`,
    store_locations: [],
    preview_products: products.slice(0, 3).map((p) => ({
      id: p.id,
      main_image_url: p.main_image_url,
      current_price: p.current_price,
      currency: "EUR",
    })),
    total_product_count: products.length,
    on_sale_count: products.filter((p) => p.is_on_sale).length,
  };
});

const RAW_CATEGORIES: RawCategory[] = Object.entries(CATEGORY_NAMES).map(([id, name]) => ({
  id,
  name,
  parent_id: null,
  created_at: "2025-12-08T18:20:57.767265Z",
}));

// ---------- /products ----------

type Filter = (p: RawProduct) => boolean;

function productFilters(params: URLSearchParams): { all: Filter; exceptCategory: Filter } {
  const brandIds = params.getAll("brand_id");
  const categoryId = params.get("category_id");
  const sizes = params.getAll("size");
  const colors = params.getAll("color");
  const onSale = params.get("on_sale") === "true";
  const min = params.has("min_price") ? Number(params.get("min_price")) : null;
  const max = params.has("max_price") ? Number(params.get("max_price")) : null;
  const exceptCategory: Filter = (p) =>
    (brandIds.length === 0 || (p.brand_id !== null && brandIds.includes(p.brand_id))) &&
    (sizes.length === 0 ||
      (p.sizes ?? []).some((s) => s.available && sizes.includes(s.size_normalized ?? ""))) &&
    (colors.length === 0 || (p.color_name !== null && colors.includes(p.color_name))) &&
    (!onSale || p.is_on_sale) &&
    (min === null || (p.current_price ?? 0) >= min) &&
    (max === null || (p.current_price ?? 0) <= max);
  return {
    exceptCategory,
    all: (p) => exceptCategory(p) && (!categoryId || p.category_id === categoryId),
  };
}

function count<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

/** Como el backend: las categorías ignoran el filtro de categoría; el precio es global. */
function facets(scope: RawProduct[]): RawProductFacets {
  const prices = RAW_PRODUCTS.map((p) => p.current_price ?? 0);
  return {
    categories: [...count(scope.map((p) => p.category_id ?? ""))]
      .filter(([id]) => id)
      .map(([id, n]) => ({ id, name: CATEGORY_NAMES[id] ?? id, count: n })),
    sizes: [
      ...count(scope.flatMap((p) => (p.sizes ?? []).map((s) => s.size_normalized ?? ""))),
    ].map(([value, n]) => ({ value, count: n })),
    colors: COLORS.map((c) => ({
      name: c.name,
      hex: c.hex,
      count: scope.filter((p) => p.color_name === c.name).length,
    })),
    price_range: { min: Math.min(...prices), max: Math.max(...prices) },
  };
}

function productsPage(params: URLSearchParams, scope: RawProduct[]): ApiEnvelope<RawProductsPage> {
  const filters = productFilters(params);
  const items = scope.filter(filters.all);
  const sort = params.get("sort");
  if (sort === "price_asc" || sort === "price_desc") {
    const dir = sort === "price_asc" ? 1 : -1;
    items.sort((a, b) => ((a.current_price ?? 0) - (b.current_price ?? 0)) * dir);
  }
  const pageSize = Math.min(100, Math.max(1, Number(params.get("page_size") ?? 24) || 24));
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const from = (page - 1) * pageSize;
  return {
    data: {
      products: items.slice(from, from + pageSize).map(({ sizes: _sizes, ...p }) => p),
      page,
      page_size: pageSize,
      total: items.length,
      has_more: from + pageSize < items.length,
      filters: facets(scope.filter(filters.exceptCategory)),
    },
  };
}

function brandsPage(params: URLSearchParams): ApiEnvelope<RawBrand[]> {
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 20) || 20));
  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  return {
    data: RAW_BRANDS.slice(offset, offset + limit),
    meta: { total: RAW_BRANDS.length, limit, offset },
  };
}

export function fixtureGet<T>(path: string): ApiEnvelope<T> {
  const url = new URL(path, "http://fixtures.local");
  const [resource, id, sub] = url.pathname.split("/").filter(Boolean);
  const params = url.searchParams;

  if (resource === "brands" && !id) return brandsPage(params) as ApiEnvelope<T>;
  if (resource === "brands" && id && sub === "products") {
    return productsPage(
      params,
      RAW_PRODUCTS.filter((p) => p.brand_id === id),
    ) as ApiEnvelope<T>;
  }
  if (resource === "brands" && id) {
    return { data: RAW_BRANDS.find((b) => b.id === id) } as ApiEnvelope<T>;
  }
  if (resource === "products" && !id) {
    if (params.getAll("brand_id").includes(FAIL_BRAND_ID)) return { error: "Boom" };
    return productsPage(params, RAW_PRODUCTS) as ApiEnvelope<T>;
  }
  if (resource === "products" && id) {
    const found = RAW_PRODUCTS.find((p) => p.id === id);
    return found ? ({ data: found } as ApiEnvelope<T>) : { error: "Product not found" };
  }
  if (resource === "categories") return { data: RAW_CATEGORIES } as ApiEnvelope<T>;
  return { error: "Not found" };
}
