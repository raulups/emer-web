import type { ApiEnvelope, RawBrand, RawCategory, RawProduct } from "./types";

/**
 * Datos de ejemplo con la forma EXACTA de la API (docs/API_CONTRACT.md), para desarrollo
 * sin backend y para los tests e2e. Solo se usan con `EMER_API_FIXTURES=1`.
 * Las imágenes son locales (public/assets) para no depender de la red.
 */

const deco = (name: string) => `/assets/deco/${name}.webp`;
const decoDark = (name: string) => `/assets/deco-negro/${name}.webp`;

type FixtureBrand = {
  id: string;
  name: string;
  img: string | null;
  color: string | null;
  products: Array<{ name: string; image: string; price: number; sale?: number }>;
};

const BRANDS: FixtureBrand[] = [
  {
    id: "0208bdca-c705-491b-82fa-76123232670b",
    name: "Satenier",
    img: decoDark("cara-luna"),
    color: "#e1609f",
    products: [
      { name: "Camiseta Ascii verde", image: deco("flores"), price: 34 },
      { name: "Sudadera bordada luna", image: deco("ojo"), price: 79.9, sale: 99 },
      { name: "Gorra cinco paneles", image: deco("estrellas"), price: 29 },
    ],
  },
  {
    id: "30995220-a71b-416a-8123-63e9b0037919",
    name: "Scuffers",
    img: decoDark("caballo-tumbado"),
    color: "#2b2b2b",
    products: [
      { name: "Hoodie oversize gris", image: deco("caballo"), price: 89 },
      { name: "Pantalón cargo negro", image: deco("moto"), price: 95 },
      { name: "Camiseta logo frontal", image: deco("coche"), price: 39 },
    ],
  },
  {
    id: "5b7e7f3a-1c0d-4a8e-9b1f-2d3c4e5f6a7b",
    name: "Nocturna",
    img: decoDark("paloma"),
    color: "#1e2a44",
    products: [
      { name: "Chaqueta acolchada", image: deco("golondrinas"), price: 149 },
      { name: "Camisa de franela", image: deco("edificios"), price: 65 },
    ],
  },
  {
    id: "6c8f8a4b-2d1e-4b9f-8c2a-3e4d5f6a7b8c",
    name: "Imagen Rota",
    img: "/assets/no-existe.webp",
    color: "#552222",
    products: [{ name: "Producto", image: deco("mano"), price: 10 }],
  },
  {
    id: "7d9a9b5c-3e2f-4ca0-9d3b-4f5e6a7b8c9d",
    name: "Bajo Cero",
    img: decoDark("estrellas-rayo"),
    color: "#0f3d3e",
    products: [],
  },
  {
    id: "8e0bac6d-4f3a-4db1-8e4c-5a6b7c8d9e0f",
    name: "Solar Club",
    img: decoDark("corazon-ojo"),
    color: "#6b4a12",
    products: [
      { name: "Bermuda de lino", image: deco("tabaco"), price: 55 },
      { name: "Camiseta tie-dye", image: deco("mecheros"), price: 32.5 },
      { name: "Sandalia trenzada", image: deco("dolar"), price: 70 },
    ],
  },
  {
    id: "9f1cbd7e-5a4b-4ec2-9f5d-6b7c8d9e0f1a",
    name: "Ruido",
    img: decoDark("dientes"),
    color: null,
    products: [{ name: "Cazadora vaquera", image: deco("grupo"), price: 120 }],
  },
  {
    id: "a02dce8f-6b5c-4fd3-8a6e-7c8d9e0f1a2b",
    name: "Calma",
    img: null,
    color: "#cccccc",
    products: [{ name: "Jersey de punto", image: deco("nino"), price: 75 }],
  },
];

const CATEGORY_ID = "38de51a7-7356-436e-8e0f-4952b5742bf8";
const productId = (brandIndex: number, i: number) =>
  `${brandIndex.toString(16).padStart(8, "0")}-0000-4000-8000-${i.toString().padStart(12, "0")}`;

const RAW_PRODUCTS: RawProduct[] = BRANDS.flatMap((brand, b) =>
  brand.products.map((p, i) => ({
    id: productId(b, i),
    brand_id: brand.id,
    category_id: CATEGORY_ID,
    name: p.name,
    description: null,
    product_url: `https://${brand.name.toLowerCase().replace(/\s+/g, "")}.example/products/${i}`,
    currency: "EUR",
    current_price: p.price,
    original_price: p.sale ?? null,
    is_on_sale: p.sale !== undefined,
    available: true,
    main_image_url: p.image,
    thumbnail_image_url: p.image,
    image_urls: [p.image],
    color_name: null,
    created_at: "2026-09-01T10:00:00.000000Z",
  })),
);

const RAW_BRANDS: RawBrand[] = BRANDS.map((brand, b) => ({
  id: brand.id,
  name: brand.name,
  url: `https://${brand.name.toLowerCase().replace(/\s+/g, "")}.example`,
  img: brand.img,
  logo: null,
  color: brand.color,
  is_emergent: b % 2 === 0,
  created_at: `2026-0${9 - (b % 9)}-01T10:00:00.000000Z`,
  store_locations: [],
  ...(brand.products.length > 0 && {
    preview_products: brand.products.slice(0, 3).map((p, i) => ({
      id: productId(b, i),
      main_image_url: p.image,
      current_price: p.price,
      currency: "EUR",
    })),
  }),
  total_product_count: brand.products.length,
}));

const RAW_CATEGORIES: RawCategory[] = [
  {
    id: "213b160c-c0a0-4dae-8339-a07096381f79",
    name: "ROPA",
    parent_id: null,
    created_at: "2025-12-08T18:20:57.767265Z",
  },
  {
    id: CATEGORY_ID,
    name: "Camisetas",
    parent_id: "213b160c-c0a0-4dae-8339-a07096381f79",
    created_at: "2025-12-08T18:20:57.767265Z",
  },
];

function page<T>(items: T[], params: URLSearchParams): ApiEnvelope<T[]> {
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 20) || 20));
  const offset = Math.max(0, Number(params.get("offset") ?? 0) || 0);
  return {
    data: items.slice(offset, offset + limit),
    meta: { total: items.length, limit, offset },
  };
}

export function fixtureGet<T>(path: string): ApiEnvelope<T> {
  const url = new URL(path, "http://fixtures.local");
  const segments = url.pathname.split("/").filter(Boolean);
  const params = url.searchParams;

  if (segments[0] === "brands" && segments.length === 1) {
    return page(RAW_BRANDS, params) as ApiEnvelope<T>;
  }
  if (segments[0] === "brands" && segments.length === 2) {
    return { data: RAW_BRANDS.find((b) => b.id === segments[1]) } as ApiEnvelope<T>;
  }
  if (segments[0] === "products" && segments.length === 1) {
    const brandIds = params.get("brandIds")?.split(",");
    const onSale = params.get("isOnSale");
    const items = RAW_PRODUCTS.filter(
      (p) =>
        (!brandIds || (p.brand_id !== null && brandIds.includes(p.brand_id))) &&
        (onSale === null || String(p.is_on_sale) === onSale),
    );
    return page(items, params) as ApiEnvelope<T>;
  }
  if (segments[0] === "categories") {
    return { data: RAW_CATEGORIES } as ApiEnvelope<T>;
  }
  return { error: "Not found" };
}
