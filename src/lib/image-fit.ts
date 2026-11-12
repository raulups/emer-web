/**
 * Encaje de las fotos de producto en los marcos 3:4 (tarjeta, popup, miniaturas).
 *
 * Las tiendas mezclan formatos: 2:3, 4:5 y cuadradas. Con `object-fit: cover` una foto más ancha
 * que el marco pierde los laterales (las mangas). Al cargar, si la foto es más ancha que 3:4 y sus
 * filas de arriba y abajo son lisas (foto de estudio), se enseña entera (`contain`) y el hueco se
 * pinta con el color de esos bordes, así no se nota. Las fotos con fondo (calle, modelo) siguen
 * recortadas: ahí una banda sí se notaría. Las más altas que 3:4 también: pierden solo aire.
 *
 * Leer los píxeles necesita CORS: solo se pide (`crossOrigin`) a los hosts que lo permiten
 * (Shopify envía `access-control-allow-origin: *`). Con otros hosts, la foto se queda como está.
 */

/** Proporción del marco (ancho / alto). */
const FRAME_RATIO = 3 / 4;
/** Margen para no tocar fotos casi 3:4 (el recorte sería de un par de píxeles). */
const RATIO_TOLERANCE = 1.03;
/** Ancho de la copia reducida en la que se miran los bordes. */
const SAMPLE_WIDTH = 40;
/** Diferencia máxima por canal (0–255) para considerar lisa una fila. */
const FLAT_TOLERANCE = 14;
/** Hosts que permiten leer sus píxeles (CORS abierto). */
const CORS_HOSTS = new Set(["cdn.shopify.com"]);

type Fit = { contain: true; top: string; bottom: string } | { contain: false };

/** Resultados por URL: la misma foto sale en la tarjeta, el popup y el fantasma del vuelo. */
const cache = new Map<string, Fit>();

/** `crossOrigin` para la `<img>` de `src`: solo con hosts con CORS (si no, la foto no cargaría). */
export function fitCrossOrigin(src: string): "anonymous" | undefined {
  try {
    return CORS_HOSTS.has(new URL(src, "http://local").hostname) ? "anonymous" : undefined;
  } catch {
    return undefined;
  }
}

/** Color medio de una fila de píxeles si es lisa; `null` si tiene detalle. */
function flatRow(data: Uint8ClampedArray, width: number, row: number): string | null {
  const sum = [0, 0, 0];
  const min = [255, 255, 255];
  const max = [0, 0, 0];
  for (let x = 0; x < width; x++) {
    const i = (row * width + x) * 4;
    for (let c = 0; c < 3; c++) {
      const v = data[i + c] ?? 0;
      sum[c] = (sum[c] ?? 0) + v;
      min[c] = Math.min(min[c] ?? 255, v);
      max[c] = Math.max(max[c] ?? 0, v);
    }
  }
  for (let c = 0; c < 3; c++) {
    if ((max[c] ?? 0) - (min[c] ?? 0) > FLAT_TOLERANCE) return null;
  }
  const [r, g, b] = sum.map((v) => Math.round(v / width));
  return `rgb(${r} ${g} ${b})`;
}

function measure(img: HTMLImageElement): Fit {
  const ratio = img.naturalWidth / img.naturalHeight;
  if (!(ratio > FRAME_RATIO * RATIO_TOLERANCE) || !img.crossOrigin) return { contain: false };
  const width = SAMPLE_WIDTH;
  const height = Math.max(2, Math.round(width / ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { contain: false };
  try {
    ctx.drawImage(img, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    // Segunda fila desde cada borde: la primera a veces trae un filo del JPEG.
    const top = flatRow(data, width, 1);
    const bottom = flatRow(data, width, height - 2);
    return top && bottom ? { contain: true, top, bottom } : { contain: false };
  } catch {
    // Lienzo «contaminado» (sin CORS): se deja recortada.
    return { contain: false };
  }
}

function apply(img: HTMLImageElement, fit: Fit): void {
  if (!fit.contain) {
    delete img.dataset.fit;
    img.style.removeProperty("background");
    return;
  }
  img.dataset.fit = "contain";
  // Mitad de arriba con el color del borde superior y mitad de abajo con el inferior: solo se ven
  // las bandas, la foto tapa el centro.
  img.style.background = `linear-gradient(${fit.top} 50%, ${fit.bottom} 50%)`;
}

/** Clave de caché: la foto sin el ancho pedido (la tarjeta y el popup piden tamaños distintos). */
function keyOf(src: string): string {
  try {
    const url = new URL(src, "http://local");
    url.searchParams.delete("width");
    return url.toString();
  } catch {
    return src;
  }
}

/** Ajusta una foto ya cargada (`onLoad`, o al montar si llegó antes de hidratar). */
export function fitImage(img: HTMLImageElement): void {
  if (!img.complete || img.naturalWidth === 0) return;
  const key = keyOf(img.currentSrc || img.src);
  const known = cache.get(key);
  const fit = known ?? measure(img);
  if (!known) cache.set(key, fit);
  apply(img, fit);
}

/** `ref` para las `<img>`: cubre las fotos que terminaron de cargar antes de hidratar. */
export function fitRef(img: HTMLImageElement | null): void {
  if (img) fitImage(img);
}

/** `onLoad` para las `<img>`. */
export function fitOnLoad(event: { currentTarget: HTMLImageElement }): void {
  fitImage(event.currentTarget);
}

/** Copia el encaje de `from` en `to` (el fantasma del popup hereda el de la tarjeta). */
export function copyFit(from: HTMLImageElement, to: HTMLImageElement): void {
  to.crossOrigin = from.crossOrigin;
  if (from.dataset.fit) to.dataset.fit = from.dataset.fit;
  else delete to.dataset.fit;
  to.style.background = from.style.background;
}
