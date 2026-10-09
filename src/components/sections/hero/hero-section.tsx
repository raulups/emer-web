import { connection } from "next/server";
import { type Brand, getAllBrands, getPreviewProductsById, type Product } from "@/lib/api";
import { selectHeroBrands } from "@/lib/config/hero";
import { price } from "@/lib/format";
import { HeroCarousel } from "./hero-carousel";
import { HeroError } from "./hero-error";
import type { HeroBrand } from "./types";

const HERO_BG = "#0a0a0a";

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

  const products = await getPreviewProductsById(selected);
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
