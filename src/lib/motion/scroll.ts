import Lenis, { type VirtualScrollData } from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { bus } from "./bus";

const EDGE = 4;
const SNAP_DURATION = 0.95;
const SNAP_COOLDOWN_MS = 520;
/** La inercia del trackpad sigue enviando rueda tras el snap: se espera a que se calme. */
const WHEEL_QUIET_MS = 180;
const STEP_THROTTLE_MS = 700;
const STEP_MIN_DELTA = 12;
const ANCHOR_DURATION = 1.2;

const expoOut = (t: number) => Math.min(1, 1.001 - 2 ** (-10 * t));
const cubicInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type ScrollTarget = number | string | HTMLElement;
type ScrollOpts = { offset?: number; duration?: number; immediate?: boolean };

// ---------- Estado del módulo ----------

let lenis: Lenis | null = null;

/** Hero registrado por la página actual (lo registra la propia sección con `registerHero`). */
let hero: HTMLElement | null = null;
let heroHeight = 0;

let snapping = false;
let lastStep = 0;
let lastWheel = 0;
let snapEnded = 0;
let cooldown: number | undefined;

// ---------- Helpers ----------

/**
 * Destino en scroll nativo. Como Lenis, descuenta el `scroll-padding-top` del documento
 * (64px por el header) y el `scroll-margin-top` del elemento.
 */
function resolveTop(target: ScrollTarget, offset = 0): number {
  if (typeof target === "number") return target + offset;
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return window.scrollY;
  const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
  const margin = Number.parseFloat(getComputedStyle(el).scrollMarginTop);
  return (
    el.getBoundingClientRect().top +
    window.scrollY +
    offset -
    (Number.isNaN(padding) ? 0 : padding) -
    (Number.isNaN(margin) ? 0 : margin)
  );
}

function stepHero(deltaX: number) {
  const now = performance.now();
  if (Math.abs(deltaX) <= STEP_MIN_DELTA || now - lastStep <= STEP_THROTTLE_MS) return;
  lastStep = now;
  bus.emit("hero:step", { dir: deltaX > 0 ? 1 : -1 });
}

function resetSnap() {
  window.clearTimeout(cooldown);
  snapping = false;
}

/** Libera el snap cuando han pasado 520 ms y la rueda lleva 180 ms quieta (fin de la inercia). */
function releaseWhenQuiet() {
  window.clearTimeout(cooldown);
  const now = performance.now();
  const wait = Math.max(SNAP_COOLDOWN_MS - (now - snapEnded), WHEEL_QUIET_MS - (now - lastWheel));
  if (wait <= 0) {
    snapping = false;
    return;
  }
  cooldown = window.setTimeout(releaseWhenQuiet, wait);
}

function snapTo(target: number) {
  if (!lenis) {
    window.scrollTo({ top: target, behavior: "auto" });
    return;
  }
  snapping = true;
  lenis.scrollTo(target, {
    duration: SNAP_DURATION,
    easing: cubicInOut,
    lock: true,
    onComplete: () => {
      snapEnded = performance.now();
      releaseWhenQuiet();
    },
  });
}

/** Devuelve false para que Lenis ignore el evento. En ese caso hay que cancelarlo a mano. */
function guard({ deltaX, deltaY, event }: VirtualScrollData): boolean {
  if (!event.type.includes("wheel")) return true; // táctil: lo gestiona el hero
  if (!lenis || !hero || !bus.isLoaded() || bus.isSearchOpen()) return true;

  const y = lenis.scroll;
  if (y > heroHeight + EDGE) return true;
  lastWheel = performance.now();

  const swallow = () => {
    if (event.cancelable) event.preventDefault();
    return false;
  };

  if (snapping) return swallow();

  const ax = Math.abs(deltaX);
  const ay = Math.abs(deltaY);

  if (ax > ay && y < EDGE) {
    stepHero(deltaX);
    return swallow();
  }

  if (ay < EDGE) return true;
  if (deltaY > 0 && y < heroHeight - EDGE) {
    snapTo(heroHeight);
    return swallow();
  }
  if (deltaY < 0 && y > EDGE) {
    snapTo(0);
    return swallow();
  }
  return true;
}

// ---------- API pública ----------

let locks = 0;
let syncScroll: (() => void) | null = null;

/**
 * Bloquea el scroll (Lenis y `overflow` de <html>) mientras haya un modal abierto.
 * Devuelve la función que lo libera; admite varios bloqueos a la vez.
 */
export function lockScroll(): () => void {
  locks += 1;
  document.documentElement.setAttribute("data-scroll-locked", "");
  syncScroll?.();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.documentElement.removeAttribute("data-scroll-locked");
    syncScroll?.();
  };
}

/**
 * Crea Lenis sobre `gsap.ticker`. Con movimiento reducido no se crea (scroll nativo, sin snap).
 * Si Lenis falla, cae a scroll nativo y fuerza `emer:loaded` para no bloquear la página.
 */
export function initScroll({ reduced }: { reduced: boolean }): () => void {
  if (reduced) return () => {};

  let instance: Lenis;
  try {
    instance = new Lenis({
      duration: 1.1,
      easing: expoOut,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
      virtualScroll: guard,
    });
  } catch (error) {
    console.error("[scroll] Lenis no pudo iniciarse, se usa scroll nativo", error);
    bus.emit("emer:loaded");
    return () => {};
  }

  lenis = instance;
  const onLenisScroll = () => ScrollTrigger.update();
  const raf = (time: number) => instance.raf(time * 1000);
  instance.on("scroll", onLenisScroll);
  gsap.ticker.add(raf);

  const sync = () => {
    if (bus.isLoaded() && !bus.isSearchOpen() && locks === 0) instance.start();
    else instance.stop();
  };
  syncScroll = sync;
  sync();
  const offs = [
    bus.onLoaded(sync),
    bus.on("emer:search:open", sync),
    bus.on("emer:search:close", sync),
  ];

  return () => {
    for (const off of offs) off();
    if (syncScroll === sync) syncScroll = null;
    resetSnap();
    gsap.ticker.remove(raf);
    instance.off("scroll", onLenisScroll);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

/**
 * Registra el hero de la página actual: habilita el snap con la rueda y AvPág/Espacio.
 * Sin Lenis (movimiento reducido) la rueda horizontal sigue cambiando de marca.
 */
export function registerHero(el: HTMLElement): () => void {
  hero = el;
  heroHeight = el.offsetHeight;
  // Lenis recalcula sus límites con 250 ms de debounce: tras navegar desde una página corta
  // (p. ej. la 404) seguiría creyendo que no hay scroll y recortaría el snap a 0.
  lenis?.resize();
  const resizeObserver = new ResizeObserver(() => {
    if (hero === el) heroHeight = el.offsetHeight;
  });
  resizeObserver.observe(el);

  const onNativeWheel = (event: WheelEvent) => {
    if (lenis) return; // con Lenis lo gestiona `guard`
    if (window.scrollY > EDGE || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    stepHero(event.deltaX);
  };
  el.addEventListener("wheel", onNativeWheel, { passive: true });

  return () => {
    el.removeEventListener("wheel", onNativeWheel);
    resizeObserver.disconnect();
    if (hero === el) {
      hero = null;
      heroHeight = 0;
      resetSnap();
    }
  };
}

/** Scroll actual sin forzar layout (con Lenis, su valor interno). */
export function getScrollY(): number {
  return lenis ? lenis.scroll : window.scrollY;
}

/** Altura del hero registrado (cacheada en resize). */
export function getHeroHeight(): number {
  return heroHeight;
}

export function scrollTo(target: ScrollTarget, opts?: ScrollOpts) {
  if (lenis) {
    lenis.scrollTo(target, {
      offset: opts?.offset ?? 0,
      duration: opts?.duration ?? ANCHOR_DURATION,
      immediate: opts?.immediate ?? false,
    });
    return;
  }
  window.scrollTo({ top: resolveTop(target, opts?.offset), behavior: "auto" });
}

/** Navegación a una sección desde la nav. El hueco del header lo da `scroll-padding-top`. */
export function scrollToSection(id: string) {
  scrollTo(`#${id}`, { duration: ANCHOR_DURATION });
}

/** Lo usa el swipe hacia arriba del hero en táctil. */
export function snapToContent() {
  if (!hero || snapping || heroHeight <= 0) return;
  snapTo(heroHeight);
}

/** AvPág/Espacio dentro del hero. Devuelve true si consumió la tecla. */
export function handleSnapKey(): boolean {
  if (!lenis || !hero || snapping || bus.isSearchOpen() || !bus.isLoaded()) return false;
  if (lenis.scroll >= heroHeight - EDGE) return false;
  snapTo(heroHeight);
  return true;
}
