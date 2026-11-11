import { clamp01, lerpBy } from "@/lib/motion/math";
import { write } from "@/lib/motion/write";

/** Scroll (en pantallas) que tarda la línea en aparecer al entrar en una sección y en irse al salir. */
const FADE = 0.12;
/** Suavizado del avance de Destacados (cambia a saltos, por marca). */
const FOLLOW = 0.12;

/** Tramo de scroll de una sección: empieza en `start` y acaba en `end` (scrollY). */
export type Span = { start: number; end: number };

type Frame = {
  /** scrollY real. */
  y: number;
  vh: number;
  deltaMs: number;
  /** Destacados: scrollY en el que la sección siguiente empieza a taparla. */
  firstExit: number;
  /** Las secciones que avanzan con el scroll, en orden. */
  spans: readonly Span[];
};

/**
 * Línea de avance común de Explora: una sola, fija abajo. En cada sección aparece (se dibuja de
 * izquierda a derecha), se llena con su avance y, al acabar, se va hacia la derecha; la siguiente
 * no aparece hasta que la anterior se ha ido. En Destacados (carrusel) sigue la marca a la vista,
 * que la sección publica en `data-progress`. Solo `transform` y `opacity`.
 */
export function createProgressHint(line: HTMLElement, fill: HTMLElement, pop: HTMLElement) {
  let popProgress = 0;

  return ({ y, vh, deltaMs, firstExit, spans }: Frame) => {
    const fade = Math.max(1, vh * FADE);
    const target = Number(pop.dataset.progress) || 0;
    popProgress = lerpBy(popProgress, target, FOLLOW, deltaMs);
    if (Math.abs(target - popProgress) < 0.0005) popProgress = target;

    let shown = 0;
    let progress = 0;
    let leaving = false;
    if (y < firstExit + fade) {
      shown = pop.dataset.ready === "true" ? clamp01((firstExit + fade - y) / fade) : 0;
      progress = popProgress;
      leaving = y > firstExit;
    } else {
      for (const { start, end } of spans) {
        const on = Math.min(clamp01((y - start - fade) / fade), clamp01((end + fade - y) / fade));
        if (on <= 0) continue;
        shown = on;
        progress = end > start ? clamp01((y - start) / (end - start)) : 1;
        leaving = y > end;
        break;
      }
    }

    write(line, "opacity", shown.toFixed(3));
    write(line, "transform-origin", leaving ? "100% 50%" : "0 50%");
    write(line, "transform", shown >= 1 ? "none" : `scaleX(${shown.toFixed(4)})`);
    write(fill, "transform", `scaleX(${progress.toFixed(4)})`);
  };
}
