import { type Brand, getBrandProducts, getBrands } from "@/lib/data";
import { type ExploraSection, sectionsOf } from "@/lib/explora-tags";
import { emergentBrands, newestBrands, popularBrands, portraitSources } from "@/lib/format";

/** Piezas por marca: Destacados elige cuántas caben; las demás secciones enseñan hasta 3. */
export const BRAND_PRODUCTS = 3;

/** Novedades enseña las últimas en llegar: cada una es un paso de scroll, así que con tope. */
export const NOVEDADES_MAX = 12;

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
  /** Imagen vertical de la marca (`img_mobile`; si falta, `img_desktop`) y, por si falla, la de su primer producto. */
  portrait: string[];
  /** Logo de la marca: es el cursor al pasar por encima (`data-cursor-logo`). */
  logo: string | null;
  style: string | null;
  /** Texto de la marca (aún no llega del backend). */
  description: string | null;
  tags: string[];
  foundedYear: number | null;
  createdAt: string;
  /** Piezas totales de la marca. */
  count: number;
  products: ExploraProduct[];
};

/** Marcas de cada sección, en el orden en que se pintan (por posición en la pantalla). */
export type ExploraData = {
  /** 1.ª sección (componente `Populares`). */
  destacados: ExploraBrand[];
  /** 2.ª sección (componente `Novedades`). */
  populares: ExploraBrand[];
  /** 3.ª sección, Emergentes: tag «emergente» (componente `Catalogo`). */
  emergentes: ExploraBrand[];
  /** 4.ª sección, Novedades: tag «novedad», las `NOVEDADES_MAX` más recientes (componente `Llegadas`). */
  novedades: ExploraBrand[];
  /** Todas las marcas: 5.ª sección, Catálogo (componente `Emergentes`), y filas de Sugerir marca. */
  todas: ExploraBrand[];
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
    portrait: portraitSources(brand, products[0]?.image),
    logo: brand.logo,
    style: brand.style,
    description: brand.description,
    tags: brand.tags,
    foundedYear: brand.founded_year,
    createdAt: brand.created_at,
    count: brand.product_count,
    products,
  };
}

/**
 * Datos de Explora: una sola lectura de todas las marcas (`/brands`, en caché). Las cuatro primeras
 * secciones se reparten por tag (`sectionsOf`; una marca con varios tags sale en varias) y el
 * Catálogo lleva todas. Orden: Destacados y Populares por nº de piezas, Emergentes por
 * `founded_year` desc. (las más jóvenes primero), Novedades por `created_at` desc. (las últimas en
 * llegar a Emer) y todas por `founded_year` desc. (el Catálogo las reordena en el cliente).
 * Las dos primeras piden sus piezas con nombre y enlace (una petición por marca, en caché); las
 * otras usan las vistas previas. Solo servidor.
 */
export async function getExploraData(): Promise<ExploraData | null> {
  const result = await getBrands();
  if (!result.ok) return null;
  const brands = result.data;
  const tagged = (section: ExploraSection) =>
    brands.filter((brand) => sectionsOf(brand.tags).has(section));

  const destacados = popularBrands(tagged("destacados"));
  const populares = popularBrands(tagged("populares"));

  const detailed = new Map<string, ExploraBrand>();
  await Promise.all(
    [...new Map([...destacados, ...populares].map((b) => [b.id, b])).values()].map(
      async (brand) => {
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
      },
    ),
  );

  const pick = (list: readonly Brand[]) =>
    list.map((brand) => detailed.get(brand.id) ?? fromPreview(brand));
  return {
    destacados: pick(destacados),
    populares: pick(populares),
    emergentes: emergentBrands(tagged("emergentes")).map(fromPreview),
    novedades: newestBrands(tagged("novedades")).slice(0, NOVEDADES_MAX).map(fromPreview),
    todas: emergentBrands(brands).map(fromPreview),
  };
}
