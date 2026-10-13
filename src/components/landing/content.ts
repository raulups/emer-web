/** Duración del contador del loader y pausa antes de abrir (README §1.1). */
export const INTRO_S = 1.8;
export const INTRO_HOLD_S = 0.25;
/** Autoscroll de [ AUTOMÁTICO ]: `max(12 s, distancia / 0.4 px·ms⁻¹)`. */
export const AUTO_MIN_MS = 12000;
export const AUTO_PX_PER_MS = 0.4;
/** Tiempo que dura la cortina blanca antes de navegar. */
export const CURTAIN_MS = 850;
export const EXIT_PROGRESS = 0.99;
/** Total de marcas si el backend no responde. */
export const FALLBACK_TOTAL = 41;
export const GOLDEN_ANGLE = 2.3998;

/** `[imagen, x %, y %, ancho vw, dx, dy, rotación]`: imágenes decorativas del hero (array DECO). */
export const DECO = [
  { name: "rally", x: 15, y: 26, w: 28, dx: -1, dy: -0.6, r: -2, width: 736, height: 736 },
  { name: "labios", x: 60, y: 10, w: 17, dx: 0.4, dy: -1, r: 5, width: 865, height: 545 },
  { name: "estrellas-col", x: 3, y: 62, w: 6, dx: -1, dy: 0.3, r: -6, width: 474, height: 842 },
  { name: "cerezas", x: 30, y: 78, w: 12, dx: -0.4, dy: 1, r: 12, width: 736, height: 736 },
  { name: "choque", x: 18, y: 92, w: 22, dx: -0.8, dy: 1, r: -4, width: 736, height: 736 },
  { name: "pistolera", x: 95, y: 36, w: 11, dx: 1, dy: -0.3, r: 2, width: 1199, height: 1500 },
  { name: "golondrinas-2", x: 90, y: 11, w: 8, dx: 0.8, dy: -1, r: 9, width: 348, height: 619 },
  { name: "movil", x: 36, y: 16, w: 6, dx: -0.3, dy: -1, r: -10, width: 1200, height: 1200 },
] as const;

export type ManifestoWord =
  | { text: string }
  | { image: "ojo-grito" | "manos"; width: number; height: number };

/** Cinco líneas fijas, sin reflujo. Las imágenes tienen su hueco y se destapan con clip-path. */
export const MANIFESTO: readonly (readonly ManifestoWord[])[] = [
  [{ text: "Rastreamos" }, { image: "ojo-grito", width: 735, height: 542 }],
  [{ text: "las" }, { text: "mejores" }, { text: "marcas" }],
  [{ text: "por" }, { text: "ti" }, { image: "manos", width: 735, height: 435 }],
  [{ text: "Tu" }, { text: "cartera" }, { text: "se" }, { text: "encarga" }],
  [{ text: "de" }, { text: "arder." }],
];
