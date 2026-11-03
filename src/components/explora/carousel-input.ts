/**
 * Entrada del carrusel de Destacados: rueda, teclado y gesto táctil se convierten en pasos de ±1
 * mientras `active()` (la página está arriba del todo). Fuera de eso no toca nada y el scroll
 * sigue siendo de Lenis / nativo.
 */
export const INPUT = {
  /** Sin eventos de rueda durante esto (ms), el siguiente es un gesto nuevo. */
  gapMs: 160,
  /** Rueda acumulada que cuenta como un paso. */
  wheelPx: 24,
  /** Un golpe que crece así sobre el anterior es un gesto nuevo aunque siga la inercia. */
  spike: 1.6,
  spikeMinPx: 12,
  spikeAfterMs: 250,
  /** Recorrido mínimo de un swipe. */
  swipePx: 40,
} as const;

const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight", "PageDown", " "]);
const PREV_KEYS = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);

type Options = {
  active: () => boolean;
  step: (dir: 1 | -1) => void;
};

/** Lenis ignora los eventos marcados así (no se mueve mientras el carrusel se queda la rueda). */
type LenisEvent = Event & { lenisStopPropagation?: boolean };

/** Atajos de una tecla solo con el foco neutro (regla 13 de CLAUDE.md). */
const neutralFocus = () => {
  const active = document.activeElement;
  return !active || active === document.body || active.tagName === "MAIN";
};

const sign = (value: number): 1 | -1 => (value > 0 ? 1 : -1);

/** Escucha la entrada y devuelve la limpieza. */
export function bindCarouselInput({ active, step }: Options): () => void {
  let lastEvent = Number.NEGATIVE_INFINITY;
  let lastStep = Number.NEGATIVE_INFINITY;
  let lastAbs = 0;
  let armed = false;
  let acc = 0;

  const onWheel = (event: WheelEvent) => {
    const now = event.timeStamp;
    const gap = now - lastEvent;
    lastEvent = now;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    const abs = Math.abs(delta);
    const spike =
      abs > lastAbs * INPUT.spike && abs > INPUT.spikeMinPx && now - lastStep > INPUT.spikeAfterMs;
    lastAbs = abs;
    if (event.ctrlKey || !active()) {
      // El gesto que trae la página hasta arriba no avanza el carrusel: hace falta otro.
      armed = false;
      acc = 0;
      return;
    }
    if (gap > INPUT.gapMs || spike) {
      armed = true;
      acc = 0;
    }
    if (event.cancelable) event.preventDefault();
    (event as LenisEvent).lenisStopPropagation = true;
    if (!armed) return;
    acc += delta;
    if (Math.abs(acc) < INPUT.wheelPx) return;
    const dir = sign(acc);
    armed = false;
    acc = 0;
    lastStep = now;
    step(dir);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || !active() || !neutralFocus()) return;
    const next = NEXT_KEYS.has(event.key) && !(event.key === " " && event.shiftKey);
    const prev = PREV_KEYS.has(event.key) || (event.key === " " && event.shiftKey);
    if (!next && !prev) return;
    event.preventDefault();
    if (!event.repeat) step(next ? 1 : -1);
  };

  let start: { x: number; y: number } | null = null;
  const onTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    start =
      touch && event.touches.length === 1 && active()
        ? { x: touch.clientX, y: touch.clientY }
        : null;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (start && event.cancelable) event.preventDefault();
  };
  const onTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0];
    const from = start;
    start = null;
    if (!from || !touch) return;
    const dx = from.x - touch.clientX;
    const dy = from.y - touch.clientY;
    const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    if (Math.abs(delta) >= INPUT.swipePx) step(sign(delta));
  };

  // En captura: corre antes que el listener de Lenis (también en `window`).
  const wheelOptions = { capture: true, passive: false } as const;
  window.addEventListener("wheel", onWheel, wheelOptions);
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: false });
  window.addEventListener("touchend", onTouchEnd, { passive: true });
  return () => {
    window.removeEventListener("wheel", onWheel, wheelOptions);
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchmove", onTouchMove);
    window.removeEventListener("touchend", onTouchEnd);
  };
}
