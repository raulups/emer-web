import { type Brand, getBrandProducts, getBrands } from "@/lib/data";
import { emergentBrands, newestBrands, popularBrands } from "@/lib/format";

/** Marcas que recorre Populares (README §4.2). */
export const POPULAR_SIZE = 6;
/** Últimas marcas en llegar que lista Novedades (README §4.3). */
export const NEWEST_SIZE = 12;
/** Piezas por marca: Populares elige cuántas caben; Novedades y Emergentes enseñan hasta 3. */
export const BRAND_PRODUCTS = 3;

export type ExploraProduct = {
  id: string;
  /** Solo en las marcas de Populares y Novedades (las vistas previas de la API no traen nombre). */
  name: string | null;
  url: string | null;
  image: string | null;
  price: number | null;
};

export type ExploraBrand = {
  id: string;
  name: string;
  url: string | null;
  /** Imagen de la marca y, por si falla, la de su primer producto. */
  sources: string[];
  style: string | null;
  tags: string[];
  foundedYear: number | null;
  createdAt: string;
  /** Piezas totales de la marca. */
  count: number;
  products: ExploraProduct[];
};

export type ExploraData = {
  popular: ExploraBrand[];
  newest: ExploraBrand[];
  emergent: ExploraBrand[];
};

function fromPreview(brand: Brand): ExploraBrand {
  const products = brand.preview_products.slice(0, BRAND_PRODUCTS).map((p) => ({
    id: p.id,
    name: null,
    url: null,
    image: p.main_image_url,
    price: p.current_price,
  }));
  return {
    id: brand.id,
    name: brand.name,
    url: brand.url,
    sources: [brand.img, products[0]?.image].filter((src): src is string => Boolean(src)),
    style: brand.style,
    tags: brand.tags,
    foundedYear: brand.founded_year,
    createdAt: brand.created_at,
    count: brand.product_count,
    products,
  };
}

/**
 * Datos de Explora. Populares (por nº de piezas), Novedades (`created_at` desc.) y Emergentes
 * (`founded_year` desc.), con las marcas reales, sin repetir. Populares y Novedades piden sus
 * piezas con nombre y enlace (una petición por marca, en caché); Emergentes usa las vistas previas.
 * Solo servidor.
 */
export async function getExploraData(): Promise<ExploraData | null> {
  const result = await getBrands();
  if (!result.ok) return null;
  const brands = result.data;

  const popular = popularBrands(brands.filter((b) => b.product_count > 0)).slice(0, POPULAR_SIZE);
  const newest = newestBrands(brands).slice(0, NEWEST_SIZE);

  const detailed = new Map<string, ExploraBrand>();
  await Promise.all(
    [...new Map([...popular, ...newest].map((b) => [b.id, b])).values()].map(async (brand) => {
      const base = fromPreview(brand);
      if (brand.product_count === 0) {
        detailed.set(brand.id, base);
        return;
      }
      const page = await getBrandProducts(brand.id, { pageSize: BRAND_PRODUCTS });
      detailed.set(brand.id, {
        ...base,
        products: page.ok
          ? page.data.items.slice(0, BRAND_PRODUCTS).map((product) => ({
              id: product.id,
              name: product.name,
              url: product.product_url,
              image: product.main_image_url,
              price: product.current_price,
            }))
          : base.products,
      });
    }),
  );

  const pick = (list: readonly Brand[]) =>
    list.map((brand) => detailed.get(brand.id) ?? fromPreview(brand));
  return {
    popular: pick(popular),
    newest: pick(newest),
    emergent: emergentBrands(brands).map(fromPreview),
  };
}
