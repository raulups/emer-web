import abrigosYChaquetas from "@/icons/abrigos-y-chaquetas.svg";
import accesorios from "@/icons/accesorios.svg";
import banadores from "@/icons/banadores.svg";
import bolsosYMochilas from "@/icons/bolsos-y-mochilas.svg";
import calzado from "@/icons/calzado.svg";
import camisas from "@/icons/camisas.svg";
import camisetas from "@/icons/camisetas.svg";
import gorrasYGorros from "@/icons/gorras-y-gorros.svg";
import jerseysYPunto from "@/icons/jerseys-y-punto.svg";
import pantalones from "@/icons/pantalones.svg";
import polos from "@/icons/polos.svg";
import ropaInteriorYCalcetines from "@/icons/ropa-interior-y-calcetines.svg";
import shortsYFaldas from "@/icons/shorts-y-faldas.svg";
import sudaderas from "@/icons/sudaderas.svg";
import tops from "@/icons/tops.svg";

/** Import estático de un SVG: Next da `{ src, width, height }` (o la URL, según el empaquetador). */
type SvgImport = string | { src: string };

const urlOf = (icon: SvgImport): string => (typeof icon === "string" ? icon : icon.src);

/**
 * Iconos de los tipos de prenda (`src/icons/`), por el nombre de la categoría en minúsculas, sin
 * tildes y con guiones (el mismo que el del archivo).
 */
const ICONS: Record<string, SvgImport> = {
  "abrigos-y-chaquetas": abrigosYChaquetas,
  accesorios,
  banadores,
  "bolsos-y-mochilas": bolsosYMochilas,
  calzado,
  camisas,
  camisetas,
  "gorras-y-gorros": gorrasYGorros,
  "jerseys-y-punto": jerseysYPunto,
  pantalones,
  polos,
  "ropa-interior-y-calcetines": ropaInteriorYCalcetines,
  "shorts-y-faldas": shortsYFaldas,
  sudaderas,
  tops,
};

/** «Bañadores» → «banadores»; «Gorras y gorros» → «gorras-y-gorros». */
export function categorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** URL del icono de una categoría por su nombre; `null` si no hay. */
export function categoryIcon(name: string): string | null {
  const icon = ICONS[categorySlug(name)];
  return icon ? urlOf(icon) : null;
}
