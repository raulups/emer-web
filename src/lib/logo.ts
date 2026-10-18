/**
 * Logos de marca normalizados (solo cliente). Cada logo llega con su propio margen y fondo
 * (cuadrado negro con el texto pequeño, fondo blanco con mucho aire, blanco sobre transparente…),
 * así que con `object-fit: contain` unos se ven mucho más pequeños que otros. Aquí se lee el
 * logo en un canvas (Supabase sirve con CORS abierto), se recorta al contenido, se detecta su
 * fondo y se devuelve un PNG recortado. El tamaño final lo decide `fitLogo` (mismo área visual).
 */

export type Logo = {
  /** PNG recortado al contenido (data URL). */
  src: string;
  /** Ancho / alto del contenido recortado. */
  ratio: number;
  /** Fondo de la caja: el del propio logo si es sólido; si es transparente, según su tinta. */
  background: string;
};

/** Lado máximo al que se analiza (suficiente para una caja de 64×40 a 3x). */
const ANALYZE = 320;
/** Diferencia mínima de color (0–255 por canal, sumada) para contar como contenido. */
const COLOR_TOLERANCE = 60;
const ALPHA_TOLERANCE = 24;

const cache = new Map<string, Promise<Logo | null>>();

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function analyze(url: string): Promise<Logo | null> {
  const img = await load(url);
  const scale = Math.min(1, ANALYZE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  // Lanza si el canvas quedó «tainted» (sin CORS): se usa el logo tal cual.
  const { data } = ctx.getImageData(0, 0, w, h);

  // Fondo: la media de las cuatro esquinas.
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map((i) => i * 4);
  const avg = (k: number) => corners.reduce((sum, i) => sum + (data[i + k] ?? 0), 0) / 4;
  const bg = [avg(0), avg(1), avg(2), avg(3)] as const;
  const transparent = bg[3] < 128;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  let ink = 0;
  let inkCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const a = data[i + 3] ?? 0;
      const content = transparent
        ? a > ALPHA_TOLERANCE
        : a > ALPHA_TOLERANCE &&
          Math.abs(r - bg[0]) + Math.abs(g - bg[1]) + Math.abs(b - bg[2]) > COLOR_TOLERANCE;
      if (!content) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      ink += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      inkCount++;
    }
  }
  if (maxX < minX || maxY < minY) return null;

  // Recorte al contenido, en la resolución original.
  const sx = minX / scale;
  const sy = minY / scale;
  const sw = (maxX - minX + 1) / scale;
  const sh = (maxY - minY + 1) / scale;
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(sw));
  out.height = Math.max(1, Math.round(sh));
  out.getContext("2d")?.drawImage(img, sx, sy, sw, sh, 0, 0, out.width, out.height);

  // Transparente: tinta clara (logo blanco) → caja oscura; si no, papel.
  const lightInk = inkCount > 0 && ink / inkCount > 200;
  const background = transparent
    ? lightInk
      ? "var(--black)"
      : "var(--paper)"
    : `rgb(${Math.round(bg[0])} ${Math.round(bg[1])} ${Math.round(bg[2])})`;

  return { src: out.toDataURL("image/png"), ratio: sw / sh, background };
}

/** Logo normalizado (en caché por URL); `null` si no se puede leer (se pinta el original). */
export function normalizeLogo(url: string): Promise<Logo | null> {
  let pending = cache.get(url);
  if (!pending) {
    pending = analyze(url).catch(() => null);
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Tamaño del logo dentro de una caja de `boxW × boxH`: mismo área visual para todos (`fill` de la
 * caja), sin salirse de ella. Así un logo muy ancho y uno cuadrado pesan lo mismo a la vista.
 */
export function fitLogo(
  ratio: number,
  boxW: number,
  boxH: number,
  fill = 0.42,
): { width: number; height: number } {
  const area = boxW * boxH * fill;
  let width = Math.sqrt(area * ratio);
  let height = width / ratio;
  const k = Math.min(1, boxW / width, boxH / height);
  width *= k;
  height *= k;
  return { width: Math.round(width), height: Math.round(height) };
}
