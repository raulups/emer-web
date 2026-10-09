import { gsap } from "@/lib/gsap";
import { observe } from "./in-view";

/** `time` y `dt` en milisegundos. `dt` ya viene acotado a 50 ms. */
export type TickFn = (time: number, dt: number) => void;

type Sub = {
  fn: TickFn;
  essential: boolean;
  visible: boolean;
  active: boolean;
};

const MAX_DT = 50;
const subs = new Set<Sub>();
let reduced = false;
let running = true;
let started = false;

function refresh(sub: Sub) {
  sub.active = sub.visible && (!reduced || sub.essential);
}

function tick(time: number, deltaMs: number) {
  if (!running) return;
  const t = time * 1000;
  const dt = Math.min(deltaMs, MAX_DT);
  for (const sub of subs) if (sub.active) sub.fn(t, dt);
}

function onVisibility() {
  running = !document.hidden;
  if (document.hidden) gsap.ticker.sleep();
  else gsap.ticker.wake();
}

/**
 * Arranca el reloj único (gsap.ticker). Ningún otro módulo debe usar
 * requestAnimationFrame ni setInterval para animar.
 */
export function startTicker(): () => void {
  if (started) return () => {};
  started = true;
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.add(tick);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    gsap.ticker.remove(tick);
    document.removeEventListener("visibilitychange", onVisibility);
    gsap.ticker.wake();
    running = true;
    started = false;
  };
}

export function setTickerReduced(value: boolean) {
  reduced = value;
  for (const sub of subs) refresh(sub);
}

/**
 * Suscribe una función al reloj único.
 * - `el`: se pausa sola cuando el elemento sale de pantalla.
 * - `essential`: sigue activa con movimiento reducido (p. ej. la línea de progreso).
 */
export function subscribe(
  fn: TickFn,
  opts: { el?: Element; essential?: boolean } = {},
): () => void {
  const sub: Sub = { fn, essential: opts.essential ?? false, visible: !opts.el, active: false };
  refresh(sub);
  subs.add(sub);

  const unobserve = opts.el
    ? observe(opts.el, (visible) => {
        sub.visible = visible;
        refresh(sub);
      })
    : () => {};

  return () => {
    subs.delete(sub);
    unobserve();
  };
}
