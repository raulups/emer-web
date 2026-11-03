import { clamp01, easeOutCubic } from "@/lib/motion/math";
import { PATH, type Placement, placeCard } from "./carousel-path";

/**
 * Entrada de Destacados: las fotos aparecen apiladas como una baraja en el centro (donde queda la
 * activa) y se reparten de arriba abajo hasta su sitio en la diagonal: primero la de encima (la
 * última marca), que sale disparada fuera de pantalla, y al final la primera, que se queda en el
 * centro. Hasta que acaba no se puede mover el carrusel. Tiempos en segundos.
 */
export const DEAL = {
  /** La baraja sube y aparece. */
  riseS: 0.55,
  riseY: 48,
  /** Escala de la baraja respecto a la foto activa. */
  deckScale: 0.86,
  /** Grosor de la baraja: cada foto, más arriba que la de debajo (px). */
  thickness: 1.6,
  /** Desorden de la baraja: giro máximo (grados) y desplazamiento máximo (px). */
  jitterDeg: 4,
  jitterPx: 5,
  /** Pausa con la baraja quieta antes de repartir. */
  holdS: 0.15,
  /** Separación entre una foto y la siguiente (con muchas marcas se acorta hasta caber en `spreadS`). */
  stepS: 0.13,
  spreadS: 1.3,
  /** Vuelo de cada foto y asentado de la primera. */
  flyS: 0.95,
  settleS: 0.7,
  /** Por debajo de las fotos ya repartidas y de la ficha. */
  deckZ: 150,
} as const;

/** Curva del vuelo: sale rápida de la baraja y frena al llegar. */
const throwEase = (t: number) => 1 - (1 - t) ** 4;

/** Pseudoaleatorio estable por índice, de −1 a 1 (la baraja siempre se desordena igual). */
const jitter = (i: number, seed: number) => {
  const v = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
};

const stepOf = (total: number) =>
  total > 1 ? Math.min(DEAL.stepS, DEAL.spreadS / (total - 1)) : 0;

/** Cuándo empieza a moverse la foto `i`: de la de encima (última) a la primera. */
const startOf = (i: number, total: number) =>
  DEAL.riseS + DEAL.holdS + (total - 1 - i) * stepOf(total);

/** Duración total de la entrada. */
export function dealDuration(total: number): number {
  const lastFly = total > 1 ? startOf(1, total) + DEAL.flyS : 0;
  return Math.max(lastFly, startOf(0, total) + DEAL.settleS);
}

/** Sitio de la foto `i` en la baraja (centrada donde queda la activa). */
function deckPlace(i: number, width: number, height: number): Placement {
  const center = placeCard(0, width, height);
  return {
    x: center.x + jitter(i, 1) * DEAL.jitterPx,
    y: center.y - i * DEAL.thickness + jitter(i, 2) * DEAL.jitterPx,
    scale: DEAL.deckScale,
    rotateZ: center.rotateZ + jitter(i, 3) * DEAL.jitterDeg,
    opacity: 1,
    z: DEAL.deckZ + i,
  };
}

/**
 * Dónde va la foto `i` a los `t` s de empezar la entrada. Las que acaban fuera de pantalla vuelan
 * hasta el borde y se apagan por el camino.
 */
export function dealCard(i: number, total: number, t: number, width: number, height: number) {
  const final = placeCard(Math.min(i, PATH.front + 0.4), width, height);
  const goal = i > PATH.front ? { ...final, opacity: 0 } : final;
  const deck = deckPlace(i, width, height);
  const rise = easeOutCubic(clamp01(t / DEAL.riseS));
  const duration = i === 0 ? DEAL.settleS : DEAL.flyS;
  const e = throwEase(clamp01((t - startOf(i, total)) / duration));
  const mix = (a: number, b: number) => a + (b - a) * e;
  return {
    x: mix(deck.x, goal.x),
    y: mix(deck.y + (1 - rise) * DEAL.riseY, goal.y),
    scale: mix(deck.scale * (0.85 + 0.15 * rise), goal.scale),
    rotateZ: mix(deck.rotateZ, goal.rotateZ),
    opacity: mix(deck.opacity * rise, goal.opacity),
    z: e < 1 ? deck.z : goal.z,
  } satisfies Placement;
}
