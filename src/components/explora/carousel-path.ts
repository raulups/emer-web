/**
 * Recorrido del carrusel de Destacados (como el de a24.raviklaassens.com): las fotos van por una
 * diagonal que sube hacia la derecha. La activa (desfase 0) queda en el centro; las anteriores
 * encogen y se apilan abajo a la izquierda y la siguiente asoma, más grande, arriba a la derecha.
 * Todo en fracciones de la pantalla, para que valga en cualquier tamaño.
 */
export const PATH = {
  /** Centro x: 0.53 + 0.26·o + 0.03·o² (fracción del ancho). */
  x: [0.53, 0.26, 0.03],
  /** Centro y: 0.51 − 0.16·o − 0.035·o² (fracción del alto). */
  y: [0.51, -0.16, -0.035],
  /** Escala por paso (la siguiente, ×1.2; la anterior, ÷1.2). */
  scale: 1.2,
  /** Desfase a partir del cual las de atrás siguen en línea recta y se apagan. */
  back: -2,
  /** Avance horizontal por paso más allá de `back` (fracción del ancho). */
  backStep: 0.14,
  /** Pasos que tarda en apagarse una foto más allá de `back`. */
  fade: 1,
  /** Más allá de este desfase la foto ya está fuera de pantalla (arriba a la derecha). */
  front: 2.6,
  /** Inclinación 3D común a todas (grados) y giro extra por paso. */
  tilt: { x: 38, y: -30, z: 12, zStep: -3 },
  perspective: 1100,
} as const;

export type Placement = {
  x: number;
  y: number;
  scale: number;
  rotateZ: number;
  opacity: number;
  /** Las de delante tapan a las de detrás. */
  z: number;
};

const poly = ([a, b, c]: readonly number[], o: number) =>
  (a ?? 0) + (b ?? 0) * o + (c ?? 0) * o * o;

/** Dónde va una foto con desfase `o` (índice − posición) en una pantalla de `width`×`height`. */
export function placeCard(o: number, width: number, height: number): Placement {
  const behind = Math.min(0, o - PATH.back);
  const along = Math.max(o, PATH.back);
  const x = (poly(PATH.x, along) + behind * PATH.backStep) * width;
  const y = poly(PATH.y, along) * height;
  const fadeOut = Math.min(1, -behind / PATH.fade);
  return {
    x,
    y,
    scale: PATH.scale ** o,
    rotateZ: PATH.tilt.z + o * PATH.tilt.zStep,
    opacity: o > PATH.front ? 0 : 1 - fadeOut,
    z: Math.round((o + 10) * 10),
  };
}

/**
 * Hover: la foto bajo el ratón se endereza (pierde casi toda la inclinación común) y gira hacia el
 * cursor, como una tarjeta que se sigue con la mirada.
 */
export const HOVER = {
  /** Fracción de la inclinación común que se quita con el ratón encima. */
  straighten: 0.85,
  /** Giro máximo (grados) hacia el cursor en cada eje. */
  follow: 12,
  /** Desplazamiento máximo (px) hacia el cursor. */
  shift: 10,
  /** Escala extra con el ratón encima. */
  lift: 0.04,
  /** Suavizado (por frame a 60 Hz) de la entrada / salida y del seguimiento. */
  lerp: 0.12,
} as const;

/** Hover de una foto: `amount` 0–1 y posición del cursor en ella, de −1 a 1 por eje. */
export type Hover = { amount: number; px: number; py: number };

export const NO_HOVER: Hover = { amount: 0, px: 0, py: 0 };

/** `transform` de una foto colocada (centrada en su punto con `translate(-50%,-50%)`). */
export function cardTransform(p: Placement, hover: Hover = NO_HOVER): string {
  const { tilt, perspective } = PATH;
  const { amount: h, px, py } = hover;
  const keep = 1 - HOVER.straighten * h;
  const rx = tilt.x * keep - py * HOVER.follow * h;
  const ry = tilt.y * keep + px * HOVER.follow * h;
  const rz = p.rotateZ * keep;
  const x = p.x + px * HOVER.shift * h;
  const y = p.y + py * HOVER.shift * h;
  const scale = p.scale * (1 + HOVER.lift * h);
  return (
    `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) ` +
    `scale(${scale.toFixed(4)}) perspective(${perspective}px) ` +
    `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`
  );
}

/**
 * Posición del cursor en una foto colocada, de −1 a 1 por eje (sin la inclinación: la caja no
 * cambia al enderezarse, así el hover no parpadea en los bordes). `null` si está fuera.
 */
export function pointerIn(
  p: Placement,
  cardW: number,
  cardH: number,
  x: number,
  y: number,
): { px: number; py: number } | null {
  const halfW = (cardW * p.scale) / 2;
  const halfH = (cardH * p.scale) / 2;
  const px = (x - p.x) / Math.max(1, halfW);
  const py = (y - p.y) / Math.max(1, halfH);
  return Math.abs(px) <= 1 && Math.abs(py) <= 1 ? { px, py } : null;
}

/** Siguiente índice tras un paso de `dir` (±1), sin salirse de la lista. */
export const stepIndex = (index: number, dir: number, total: number): number =>
  Math.max(0, Math.min(total - 1, index + Math.sign(dir)));
