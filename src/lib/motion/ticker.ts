import gsap from "gsap";

/** `time` en segundos desde que arrancó el ticker; `deltaMs` desde el frame anterior. */
export type Tick = (time: number, deltaMs: number) => void;

/**
 * Único reloj de la web (`gsap.ticker`). Con `el`, el callback solo corre mientras ese elemento
 * está en pantalla (ampliada con `margin`, como el `rootMargin` de IntersectionObserver).
 * Devuelve la función que cancela la suscripción.
 */
export function subscribe(tick: Tick, el?: Element | null, margin?: string): () => void {
  let visible = !el;
  const observer = el
    ? new IntersectionObserver(
        ([entry]) => {
          visible = entry?.isIntersecting ?? false;
        },
        margin ? { rootMargin: margin } : undefined,
      )
    : null;
  if (el) observer?.observe(el);

  const listener: Tick = (time, deltaMs) => {
    if (visible) tick(time, deltaMs);
  };
  gsap.ticker.add(listener);

  return () => {
    gsap.ticker.remove(listener);
    observer?.disconnect();
  };
}
