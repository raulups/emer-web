import { connection } from "next/server";
import { type Brand, getAllBrands, getProducts, type Product } from "@/lib/api";
import { selectHeroBrands } from "@/lib/config/hero";
import { price } from "@/lib/format";
import { HeroCarousel } from "./hero-carousel";
import { HeroError } from "./hero-error";
import type { HeroBrand } from "./types";

const HERO_BG = "#0a0a0a";

/**
 * `PreviewProduct` no trae nombre ni URL (FALTA EN BACKEND). Se intentan resolver por id con
 * dos consultas cacheadas: las novedades y las ofertas de las marcas del hero (la vista de
 * previews prioriza ofertas y luego novedades). Lo que no se encuentre se queda sin nombre.
 */
async function resolvePreviewProducts(brands: Brand[]): Promise<Map<string, Product>> {
  const brandIds = brands.map((brand) => brand.id);
  const results = await Promise.allSettled([
    getProducts({ brandIds, limit: 100, sort: "newest" }),
    getProducts({ brandIds, limit: 100, isOnSale: true }),
  ]);
  const byId = new Map<string, Product>();
  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value.ok) continue;
    for (const product of result.value.data.items) byId.set(product.id, product);
  }
  return byId;
}

function toHeroBrand(brand: Brand, products: Map<string, Product>): HeroBrand | null {
  if (!brand.img) return null;
  return {
    id: brand.id,
    name: brand.name, // en mayúsculas por CSS: los lectores de pantalla no lo deletrean
    url: brand.url,
    img: brand.img,
    color: brand.color ?? HERO_BG,
    products: brand.previewProducts
      .filter((preview) => preview.imageUrl)
      .slice(0, 3)
      .map((preview) => {
        const full = products.get(preview.id);
        const productUrl = full?.productUrl || null;
        return {
          id: preview.id,
          imageUrl: preview.imageUrl ?? "",
          price: price(preview.price, preview.currency),
          name: full?.name ?? null,
          href: productUrl ?? brand.url,
          hrefIsBrand: productUrl === null,
        };
      }),
  };
}

export async function HeroSection() {
  const result = await getAllBrands();
  if (!result.ok) {
    // Un fallo cacheado solo segundos ya queda fuera del prerender; `connection()` lo garantiza
    // para que el error nunca se hornee en el HTML estático y se reintente en cada petición.
    await connection();
    return <HeroError />;
  }

  const selected = selectHeroBrands(result.data);
  if (selected.length === 0) return null;

  const products = await resolvePreviewProducts(selected);
  const heroBrands = selected
    .map((brand) => toHeroBrand(brand, products))
    .filter((brand): brand is HeroBrand => brand !== null);

  return <HeroCarousel brands={heroBrands} />;
}

/** Hueco con la misma geometría mientras llegan los datos (evita CLS). */
export function HeroFallback() {
  return (
    <section
      id="marcas"
      data-section="MARCAS"
      aria-label="Marcas destacadas"
      aria-busy="true"
      className="relative h-svh min-h-[560px] bg-hero"
    />
  );
}
