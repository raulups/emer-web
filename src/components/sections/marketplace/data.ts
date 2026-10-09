import type { Brand, Category, Product } from "@/lib/api";
import { price, upper } from "@/lib/format";

/** Tarjetas por anillo (dos anillos). */
export const RING_SIZE = 18;
export const SLOTS = RING_SIZE * 2;
export const STEP = 360 / RING_SIZE;
/** Pool máximo que se pide al backend (límite de la API). */
export const POOL_LIMIT = 100;

export type MarketItem = {
  id: string;
  name: string;
  url: string;
  img: string;
  price: string | null;
  brand: string;
  category: string | null;
};

/** Decorados de `deco-negro` (tabla del handoff; contraste y recorte ya aplicados en los WebP). */
export const DECOS = [
  {
    file: "paloma",
    pos: { left: "50%", top: "44%" },
    w: "clamp(240px,24vw,400px)",
    tf: "translate(-50%,-30%)",
    iw: 706,
    ih: 1256,
  },
  {
    file: "dientes",
    pos: { right: "3vw", top: "1%" },
    w: "clamp(170px,16vw,270px)",
    iw: 960,
    ih: 960,
  },
  {
    file: "asterisco",
    pos: { left: "52vw", top: "3%" },
    w: "clamp(60px,5vw,96px)",
    iw: 542,
    ih: 978,
  },
  {
    file: "cara-doble",
    pos: { left: "1vw", top: "30%" },
    w: "clamp(170px,16vw,270px)",
    iw: 541,
    ih: 739,
  },
  {
    file: "hate",
    pos: { left: "24vw", top: "36%" },
    w: "clamp(100px,8vw,140px)",
    tf: "rotate(-8deg)",
    iw: 408,
    ih: 576,
  },
  {
    file: "pasamontanas",
    pos: { right: "23vw", top: "31%" },
    w: "clamp(100px,8vw,150px)",
    iw: 706,
    ih: 706,
  },
  {
    file: "ojo-cementerio",
    pos: { right: "1vw", top: "42%" },
    w: "clamp(170px,16vw,260px)",
    iw: 692,
    ih: 692,
  },
  {
    file: "corazon-ojo",
    pos: { left: "9vw", top: "62%" },
    w: "clamp(120px,10vw,170px)",
    iw: 1152,
    ih: 1152,
  },
  {
    file: "billete",
    pos: { left: "28vw", top: "66%" },
    w: "clamp(90px,7vw,130px)",
    tf: "rotate(10deg)",
    iw: 706,
    ih: 706,
  },
  {
    file: "cara-luna",
    pos: { right: "28vw", top: "62%" },
    w: "clamp(120px,11vw,190px)",
    opacity: 0.75,
    iw: 706,
    ih: 705,
  },
  {
    file: "carrito",
    pos: { right: "3vw", bottom: "1%" },
    w: "clamp(160px,15vw,250px)",
    iw: 706,
    ih: 706,
  },
  {
    file: "caballo-tumbado",
    pos: { left: "2vw", bottom: "1%" },
    w: "clamp(180px,17vw,280px)",
    iw: 706,
    ih: 706,
  },
] as const;

/** Productos con imagen, cruzados con su marca (nombre) y su categoría (nombre en mayúsculas). */
export function toMarketItems(
  products: Product[],
  brands: Brand[],
  categories: Category[],
): MarketItem[] {
  const brandName = new Map(brands.map((b) => [b.id, upper(b.name)]));
  const categoryName = new Map(categories.map((c) => [c.id, upper(c.name)]));
  return products.flatMap((p) =>
    p.imageUrl
      ? [
          {
            id: p.id,
            name: p.name,
            url: p.productUrl,
            img: p.imageUrl,
            price: price(p.price, p.currency || "EUR"),
            brand: (p.brandId && brandName.get(p.brandId)) || "",
            category: (p.categoryId && categoryName.get(p.categoryId)) || null,
          },
        ]
      : [],
  );
}
