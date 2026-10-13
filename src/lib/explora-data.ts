import { getBrandProducts, getBrands } from "@/lib/data";
import { popularBrands } from "@/lib/format";

/** Marcas que recorre Populares (README §4.2: 6). */
export const POPULAR_SIZE = 6;
/** Productos de ejemplo bajo la descripción. */
export const POPULAR_PRODUCTS = 2;

export type PopularProduct = {
  id: string;
  name: string;
  url: string;
  image: string | null;
  price: number | null;
};

export type PopularBrand = {
  id: string;
  name: string;
  url: string | null;
  /** Imagen de la marca y, por si falla, la de su primer producto. */
  sources: string[];
  style: string | null;
  tags: string[];
  foundedYear: number | null;
  /** Piezas totales de la marca. */
  count: number;
  products: PopularProduct[];
};

/**
 * Populares: marcas por número de productos, de más a menos, tal cual (sin repetir). Cada una con
 * sus dos primeras piezas (una petición por marca, en caché). Solo servidor.
 */
export async function getPopularBrands(): Promise<PopularBrand[] | null> {
  const result = await getBrands();
  if (!result.ok) return null;
  const top = popularBrands(result.data.filter((brand) => brand.product_count > 0)).slice(
    0,
    POPULAR_SIZE,
  );

  return Promise.all(
    top.map(async (brand): Promise<PopularBrand> => {
      const page = await getBrandProducts(brand.id, { pageSize: POPULAR_PRODUCTS });
      const products = page.ok
        ? page.data.items.slice(0, POPULAR_PRODUCTS).map((product) => ({
            id: product.id,
            name: product.name,
            url: product.product_url,
            image: product.main_image_url,
            price: product.current_price,
          }))
        : [];
      return {
        id: brand.id,
        name: brand.name,
        url: brand.url,
        sources: [brand.img, brand.preview_products[0]?.main_image_url, products[0]?.image].filter(
          (src): src is string => Boolean(src),
        ),
        style: brand.style,
        tags: brand.tags,
        foundedYear: brand.founded_year,
        count: brand.product_count,
        products,
      };
    }),
  );
}
