import type Lenis from "lenis";
import { lerpTo } from "./math";

/**
 * Scroll suave con inercia (Lenis). Ajustar aquí la sensación:
 * - `lerp`: fracción del camino que recorre por frame a 60 Hz (más bajo = más inercia y más suave;
 *   0.1 es el valor por defecto de Lenis). Si se pone `duration`, manda sobre `lerp`.
 * - `wheelMultiplier`: distancia por golpe de rueda.
 * En táctil se deja el scroll nativo (`syncTouch: false`).
 */
export const SMOOTH_SCROLL = {
  lerp: 0.09,
  wheelMultiplier: 1,
  syncTouch: false,
} as const;

/** Duración (s) de los saltos programáticos (anclas, «ir a sección»). */
export const SCROLL_TO_DURATION = 1.2;

let lenis: Lenis | null = null;
let locked = false;

/** Lo llama `SmoothScroll` al crear/destruir la instancia global. */
export function setLenis(instance: Lenis | null): void {
  lenis = instance;
  if (instance && locked) instance.stop();
}

/** Instancia activa (null sin Lenis: «reducir movimiento» o antes de montarse). */
export const getLenis = (): Lenis | null => lenis;

/**
 * Siguiente valor del scroll suavizado de un bucle. Con Lenis, el `scrollY` ya llega con inercia
 * (corre antes en el mismo tick): se usa tal cual, porque suavizar otra vez añade retraso y separa
 * lo que pinta el bucle de lo que se mueve con el scroll real (`sticky`). Sin Lenis (táctil o
 * antes de montarse), lerp 0.14.
 */
export function followScroll(current: number, deltaMs: number): number {
  return lenis ? window.scrollY : lerpTo(current, window.scrollY, deltaMs);
}

/** Bloquea el scroll del usuario (p. ej. el loader de la Landing). Se recuerda si Lenis aún no existe. */
export function lockScroll(on: boolean): void {
  locked = on;
  if (on) lenis?.stop();
  else lenis?.start();
}

type ScrollToOptions = {
  /** Sin animación: salto directo (cambios de vista, montajes). */
  immediate?: boolean;
  duration?: number;
  easing?: (t: number) => number;
  onComplete?: () => void;
};

/**
 * Scroll programático a una posición. Con Lenis pasa por `lenis.scrollTo` (así no se pelea con su
 * inercia); sin él, scroll nativo.
 */
export function scrollToY(y: number, options: ScrollToOptions = {}): void {
  const { immediate = false, duration = SCROLL_TO_DURATION, easing, onComplete } = options;
  if (lenis) {
    lenis.scrollTo(y, { immediate, duration, easing, force: true, onComplete });
    return;
  }
  window.scrollTo({ top: y, behavior: immediate ? "instant" : "smooth" });
  onComplete?.();
}
