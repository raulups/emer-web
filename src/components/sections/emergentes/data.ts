import type { Brand, Product } from "@/lib/api";
import { pad2, price } from "@/lib/format";

export const EMERGENTES_MAX = 8;

export type EmergenteProduct = {
  id: string;
  imageUrl: string;
  price: string | null;
  name: string | null;
};

export type Emergente = {
  id: string;
  name: string;
  url: string | null;
  img: string;
  /** dd.mm.aa (el handoff la daba por inexistente, pero `createdAt` sí llega del backend). */
  date: string | null;
  dateTime: string | null;
  products: EmergenteProduct[];
};

/** Tamaños cíclicos de panel (i % 3). */
export const PANEL_SIZES = [
  { w: "clamp(260px, 26vw, 400px)", h: "64vh", mt: "-4vh" },
  { w: "clamp(320px, 36vw, 560px)", h: "46vh", mt: "10vh" },
  { w: "clamp(240px, 22vw, 340px)", h: "56vh", mt: "-10vh" },
] as const;

/** Decorados del diseño (tabla del handoff). Los recortes ya vienen aplicados en los WebP. */
export const DECOS = [
  { file: "estrellas", l: "3vw", t: "8vh", w: "clamp(60px,6vw,96px)", r: 0, iw: 474, ih: 842 },
  { file: "coche", l: "11vw", t: "56vh", w: "clamp(300px,30vw,480px)", r: -4, iw: 736, ih: 736 },
  { file: "ojos", l: "40vw", t: "-4vh", w: "clamp(200px,19vw,300px)", r: 4, iw: 736, ih: 1138 },
  { file: "dolar", l: "64vw", t: "54vh", w: "clamp(80px,8vw,130px)", r: 12, iw: 720, ih: 1200 },
  {
    file: "golondrinas",
    l: "82vw",
    t: "4vh",
    w: "clamp(110px,10vw,160px)",
    r: 8,
    iw: 348,
    ih: 619,
  },
  { file: "edificios", l: "98vw", t: "44vh", w: "clamp(400px,40vw,640px)", r: 0, iw: 735, ih: 735 },
  { file: "mano", l: "138vw", t: "6vh", w: "clamp(140px,13vw,210px)", r: -12, iw: 339, ih: 387 },
  {
    file: "nino-rojo",
    l: "158vw",
    t: "50vh",
    w: "clamp(180px,17vw,280px)",
    r: -6,
    iw: 736,
    ih: 736,
  },
  { file: "bomba", l: "184vw", t: "-6vh", w: "clamp(220px,22vw,350px)", r: 10, iw: 736, ih: 959 },
  {
    file: "cara-agua",
    l: "212vw",
    t: "36vh",
    w: "clamp(260px,26vw,420px)",
    r: 0,
    iw: 736,
    ih: 684,
  },
  { file: "caballo", l: "242vw", t: "-2vh", w: "clamp(200px,20vw,320px)", r: 0, iw: 736, ih: 968 },
  { file: "ojo", l: "266vw", t: "54vh", w: "clamp(110px,11vw,170px)", r: 6, iw: 736, ih: 916 },
  { file: "nino", l: "288vw", t: "6vh", w: "clamp(150px,14vw,230px)", r: 4, iw: 1000, ih: 1500 },
] as const;

function shortDate(iso: string): { date: string; dateTime: string } | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${pad2(d.getUTCDate())}.${pad2(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear()).slice(-2)}`,
    dateTime: d.toISOString().slice(0, 10),
  };
}

/** Emergentes: marcas con `isEmergent` e imagen, por fecha de alta descendente, máximo 8. */
export function selectEmergentes(brands: Brand[]): Brand[] {
  return brands
    .filter((b) => b.isEmergent && b.img)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, EMERGENTES_MAX);
}

export function toEmergente(brand: Brand, products: Map<string, Product>): Emergente {
  const when = shortDate(brand.createdAt);
  return {
    id: brand.id,
    name: brand.name,
    url: brand.url,
    img: brand.img ?? "",
    date: when?.date ?? null,
    dateTime: when?.dateTime ?? null,
    products: brand.previewProducts
      .filter((p) => p.imageUrl)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        imageUrl: p.imageUrl ?? "",
        price: price(p.price, p.currency),
        name: products.get(p.id)?.name ?? null,
      })),
  };
}
