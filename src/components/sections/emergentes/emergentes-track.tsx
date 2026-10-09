"use client";

import Image from "next/image";
import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { LoopLine } from "@/components/ui/loop-line";
import { pad2 } from "@/lib/format";
import { ScrollTrigger, useGSAP } from "@/lib/gsap";
import { bus } from "@/lib/motion/bus";
import { isReduced, subscribeReduced } from "@/lib/motion/reduced";
import { getScrollY, scrollTo, scrollToSection } from "@/lib/motion/scroll";
import { scheduleScrollRefresh, trackSection } from "@/lib/motion/sections";
import { subscribe } from "@/lib/motion/ticker";
import { DECOS, type Emergente, PANEL_SIZES } from "./data";
import s from "./emergentes.module.css";

const SMOOTH = 0.12;
const POP_LERP = 0.25;
const OPEN_MS = 950;
const CLOSE_MS = 380;
const CLOSE_PANEL_DELAY = 260;
const CLOSE_POP_DELAY = 160;
const FRAME_MS = 1000 / 60;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const NEW_TAB = " (se abre en una pestaña nueva)";
const POP_ID = "em-pop";

type Mode = "track" | "static" | "reduced";

type Geometry = {
  vw: number;
  vh: number;
  over: number;
  panelLeft: number[];
  panelW: number[];
  clipLeft: number[];
  clipTop: number[];
  clipW: number[];
  clipH: number[];
  deco: Array<{ l: number; t: number; w: number; h: number }>;
  popW: number;
  popH: number;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Lerp por frame normalizado a 60 Hz. */
const lerpK = (k: number, dt: number) => 1 - (1 - k) ** (dt / FRAME_MS);

const subscribeFine = (onChange: () => void) => {
  const query = window.matchMedia(FINE_POINTER);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isFine = () => window.matchMedia(FINE_POINTER).matches;

export function EmergentesTrack({ brands: all }: { brands: Emergente[] }) {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);
  const fine = useSyncExternalStore(subscribeFine, isFine, () => false);
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const brands = useMemo(() => all.filter((b) => !failed.has(b.id)), [all, failed]);
  const n = brands.length;

  const [mode, setMode] = useState<Mode>("track");
  const [active, setActive] = useState<number | null>(null);
  const [shown, setShown] = useState<number | null>(null);

  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const decoRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const outroCtaRef = useRef<HTMLAnchorElement>(null);
  const panels = useRef<Array<HTMLElement | null>>([]);
  const hits = useRef<Array<HTMLButtonElement | null>>([]);
  const clips = useRef<Array<HTMLDivElement | null>>([]);
  const reveals = useRef<Array<HTMLDivElement | null>>([]);
  const inners = useRef<Array<HTMLDivElement | null>>([]);
  const pars = useRef<Array<HTMLDivElement | null>>([]);
  const decoEls = useRef<Array<HTMLElement | null>>([]);
  const ghostEls = useRef<Array<HTMLImageElement | null>>([]);

  const geo = useRef<Geometry | null>(null);
  const progress = useRef(0);
  const triggerStart = useRef(0);
  const lastHeight = useRef("");
  const activeRef = useRef<number | null>(null);
  const modeRef = useRef<Mode>("track");
  const closeTimer = useRef<number | undefined>(undefined);
  const focusCta = useRef(false);
  /** Al devolver el foco al panel tras Esc, ese foco no debe reabrir el popup. */
  const skipFocusOpen = useRef(false);
  /** Los índices cambian si falla una imagen: el popup en curso se descarta sin animar. */
  const popReset = useRef(false);
  const pointer = useRef({ x: -1, y: -1 });

  // ---------- Medidas (solo en resize / cambios de contenido): primero lecturas, luego escrituras ----------

  const measure = useCallback(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!section || !pin || !track) return;
    const vw = pin.clientWidth;
    const vh = pin.clientHeight;
    const over = Math.max(0, track.scrollWidth - vw);
    const isReducedNow = isReduced();

    const g: Geometry = {
      vw,
      vh,
      over,
      panelLeft: [],
      panelW: [],
      clipLeft: [],
      clipTop: [],
      clipW: [],
      clipH: [],
      deco: [],
      popW: popRef.current?.offsetWidth ?? 0,
      popH: popRef.current?.offsetHeight ?? 0,
    };
    const trackLeft = track.offsetLeft;
    panels.current.forEach((panel, i) => {
      const clip = clips.current[i];
      if (!panel || !clip) return;
      g.panelLeft[i] = trackLeft + panel.offsetLeft;
      g.panelW[i] = panel.offsetWidth;
      g.clipLeft[i] = trackLeft + panel.offsetLeft + clip.offsetLeft;
      g.clipTop[i] = track.offsetTop + panel.offsetTop + clip.offsetTop;
      g.clipW[i] = clip.offsetWidth;
      g.clipH[i] = clip.offsetHeight;
    });
    decoEls.current.forEach((el, i) => {
      if (el)
        g.deco[i] = { l: el.offsetLeft, t: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
    });
    geo.current = g;

    const nextMode: Mode = isReducedNow ? "reduced" : over > 0 ? "track" : "static";
    modeRef.current = nextMode;
    setMode(nextMode);
    const height = isReducedNow ? "" : `${over > 0 ? vh + over : vh}px`;
    if (height !== lastHeight.current) {
      section.style.height = height;
      lastHeight.current = height;
      scheduleScrollRefresh();
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const track = trackRef.current;
    if (!section || !pin || !track) return;
    const cleanup = trackSection(section, "emergentes");
    // Pin y track: el pin mide 100svh, así que la barra de URL móvil no dispara medidas.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(pin);
    resizeObserver.observe(track);
    document.fonts?.ready.then(measure);
    return () => {
      cleanup();
      resizeObserver.disconnect();
    };
  }, [measure]);

  // Medida inicial y al cambiar la preferencia o el número de paneles.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `reduced` y `n` cambian el layout.
  useEffect(() => {
    measure();
  }, [measure, reduced, n]);

  // Tamaño del popup cuando cambia su contenido.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shown` cambia el contenido y la altura.
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (geo.current && pop) {
      geo.current.popW = pop.offsetWidth;
      geo.current.popH = pop.offsetHeight;
    }
  }, [shown]);

  // ---------- Progreso del recorrido (ScrollTrigger: sin lecturas de layout por frame) ----------

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section || reduced) return;
      ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progress.current = self.progress;
        },
        onRefresh: (self) => {
          progress.current = self.progress;
          triggerStart.current = self.start;
        },
      });
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  // ---------- Puntero (para el hover de los decorados, que no capturan eventos) ----------

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !fine) return;
    const onMove = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    const onLeave = () => {
      pointer.current = { x: -1, y: -1 };
    };
    section.addEventListener("pointermove", onMove, { passive: true });
    section.addEventListener("pointerleave", onLeave, { passive: true });
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, [fine]);

  // ---------- Reloj: recorrido, revelado, parallax, decorados y popup ----------

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || reduced) return;

    let cp = progress.current;
    let first = true;
    let lastCount = "";
    const lastReveal: string[] = [];
    const k: number[] = DECOS.map(() => 0);
    let po = 0;
    let popCh: number | null = null;
    let lastCh: number | null = null;
    let ppx: number | null = null;
    let ppy = 0;
    let popHidden = false;
    let popSettled = false;
    let lastClip = "";
    let lastShadow = "";
    let lastPe = "";

    const seg = (a: number, b: number, p = 3) => {
      const t = clamp((po - a) / (b - a), 0, 1);
      return 1 - (1 - t) ** p;
    };

    const hidePop = () => {
      const pop = popRef.current;
      const dot = dotRef.current;
      const line = lineRef.current;
      if (pop) {
        pop.style.opacity = "0";
        pop.style.pointerEvents = "none";
      }
      if (dot) dot.style.transform = "scale(0)";
      if (line) {
        line.setAttribute("x2", line.getAttribute("x1") ?? "0");
        line.setAttribute("y2", line.getAttribute("y1") ?? "0");
      }
      lastPe = "none";
      popHidden = true;
      popSettled = false;
    };

    const unsubscribe = subscribe(
      (t, dt) => {
        const g = geo.current;
        const track = trackRef.current;
        if (!g || !track) return;

        const target = modeRef.current === "track" ? progress.current : 0;
        let moved = first;
        if (first) cp = target;
        else if (Math.abs(target - cp) * g.over > 0.1) {
          cp += (target - cp) * lerpK(SMOOTH, dt);
          moved = true;
        } else if (cp !== target) {
          cp = target;
          moved = true;
        }
        first = false;
        const x = -cp * g.over;

        if (moved) {
          track.style.transform = `translate3d(${x}px,0,0)`;
          if (fillRef.current) fillRef.current.style.transform = `scaleX(${cp})`;
          if (decoRef.current) decoRef.current.style.transform = `translate3d(${x * 0.78}px,0,0)`;
          let cur = 0;
          for (let i = 0; i < g.panelLeft.length; i++) {
            const left = (g.panelLeft[i] ?? 0) + x;
            const e = clamp((g.vw - left) / (g.vw * 0.45), 0, 1);
            const ee = 1 - (1 - e) ** 3;
            const off = Math.round((1 - ee) * 1000) / 10;
            const value = off <= 0 ? "none" : `${off}%`;
            if (value !== lastReveal[i]) {
              lastReveal[i] = value;
              const reveal = reveals.current[i];
              const inner = inners.current[i];
              if (reveal) reveal.style.transform = off <= 0 ? "none" : `translateY(${off}%)`;
              if (inner) inner.style.transform = off <= 0 ? "none" : `translateY(${-off}%)`;
            }
            const par = pars.current[i];
            if (par) {
              const center = left + (g.panelW[i] ?? 0) / 2;
              par.style.transform = `translate(${(center - g.vw / 2) * -0.1}px,0) scale(${1.15 - 0.15 * ee})`;
            }
            if (left < g.vw * 0.5) cur = i;
          }
          const count = `${pad2(cur + 1)} / ${pad2(g.panelLeft.length)}`;
          if (count !== lastCount && countRef.current) {
            countRef.current.textContent = count;
            lastCount = count;
          }
        }

        // Decorados: rotación ligada al recorrido + hover (elevación, escala, copia y jitter).
        // Posición del pin en pantalla sin leer layout: fijado arriba mientras dura el recorrido.
        const sy = getScrollY();
        const start = triggerStart.current;
        const pinTop = start - sy + clamp(sy - start, 0, g.over);
        const px = pointer.current.x;
        const py = pointer.current.y - pinTop;
        let hover = -1;
        if (pointer.current.x >= 0) {
          for (let i = 0; i < g.deco.length; i++) {
            const box = g.deco[i];
            if (!box) continue;
            const left = box.l + x * 0.78;
            if (px >= left && px <= left + box.w && py >= box.t && py <= box.t + box.h) hover = i;
          }
        }
        for (let i = 0; i < DECOS.length; i++) {
          const prev = k[i] ?? 0;
          const ki = prev + ((hover === i ? 1 : 0) - prev) * lerpK(0.12, dt);
          k[i] = ki < 0.001 ? 0 : ki;
          if (!moved && ki === 0 && prev === 0) continue;
          const el = decoEls.current[i];
          if (!el) continue;
          const r = DECOS[i]?.r ?? 0;
          const jitter = ki > 0.02 ? Math.sin(t / 38 + i) * 0.7 * ki : 0;
          const rot = r * (1 - ki) + cp * (i % 2 ? 6 : -6) * (1 - ki) + jitter;
          el.style.transform = `translateY(${-10 * ki}px) rotate(${rot}deg) scale(${1 + 0.08 * ki})`;
          const ghost = ghostEls.current[i];
          if (ghost) {
            ghost.style.opacity = String(0.4 * ki);
            ghost.style.transform = `translate(${12 * ki}px,${9 * ki}px)`;
          }
        }

        // Popup en 4 tramos (punto → línea → barra → persiana).
        const pop = popRef.current;
        const bar = barRef.current;
        const body = bodyRef.current;
        const dot = dotRef.current;
        const line = lineRef.current;
        if (!pop || !bar || !body || !dot || !line) return;

        if (popReset.current) {
          popReset.current = false;
          po = 0;
          popCh = null;
          lastCh = null;
        }
        const ch = activeRef.current;
        if (ch !== lastCh) {
          if (ch !== null) {
            if (popCh !== ch) {
              po = 0;
              ppx = null;
            }
            popCh = ch;
          }
          lastCh = ch;
          popSettled = false;
        }
        po = clamp(po + (ch !== null ? dt / OPEN_MS : -dt / CLOSE_MS), 0, 1);
        if (popCh === null || po <= 0 || g.clipLeft[popCh] === undefined) {
          if (!popHidden) hidePop();
          return;
        }
        popHidden = false;

        const e1 = seg(0, 0.2);
        const ax = (g.clipLeft[popCh] ?? 0) + x + (g.clipW[popCh] ?? 0) * 0.68;
        const ay = (g.clipTop[popCh] ?? 0) + (g.clipH[popCh] ?? 0) * 0.3;
        dot.style.transform = `translate(${ax}px,${ay}px) scale(${e1 * (1 + Math.sin(t / 420) * 0.06)})`;
        // Abierto del todo y quieto: solo late el punto.
        if (popSettled && po >= 1 && !moved) return;

        const e2 = seg(0.12, 0.42);
        const e3 = seg(0.36, 0.6, 4);
        const e4 = seg(0.45, 1, 3);
        const W = g.vw;
        const H = g.vh;
        const sc = Math.min(1, (H - 96) / Math.max(1, g.popH));
        const pw = g.popW * sc;
        const ph = g.popH * sc;
        const right = ax + 90 + pw < W - 16;
        const tx = clamp(right ? ax + 90 : ax - 90 - pw, 16, W - pw - 16);
        const ty = clamp(ay - ph * 0.22, 80, H - ph - 28);
        if (ppx === null) {
          ppx = tx;
          ppy = ty;
        }
        const lk = lerpK(POP_LERP, dt);
        ppx += (tx - ppx) * lk;
        ppy += (ty - ppy) * lk;
        const converged = Math.abs(tx - ppx) < 0.05 && Math.abs(ty - ppy) < 0.05;
        if (converged) {
          ppx = tx;
          ppy = ty;
        }
        const ex = right ? ppx : ppx + pw;

        // EXCEPCIÓN documentada: atributos de la línea SVG.
        line.setAttribute("x1", String(ax));
        line.setAttribute("y1", String(ay));
        line.setAttribute("x2", String(ax + (ex - ax) * e2));
        line.setAttribute("y2", String(ay + (ppy - ay) * e2));
        pop.style.transform = `translate3d(${ppx}px,${ppy}px,0) scale(${sc})`;
        pop.style.opacity = e3 > 0 ? "1" : "0";
        bar.style.transformOrigin = right ? "0 50%" : "100% 50%";
        bar.style.transform = `scaleX(${e3})`;
        // EXCEPCIÓN documentada: persiana con clip-path y sombra (un elemento, sin bucle).
        const e4r = Math.round(e4 * 1000) / 1000;
        const clipValue =
          e4r >= 1 ? "none" : `inset(-2px -12px calc(${(1 - e4r) * 100}% - ${12 * e4r}px) -2px)`;
        if (clipValue !== lastClip) {
          body.style.clipPath = clipValue;
          lastClip = clipValue;
        }
        const shadow = `${8 * e4r}px ${8 * e4r}px 0 #000`;
        if (shadow !== lastShadow) {
          body.style.boxShadow = shadow;
          lastShadow = shadow;
        }
        const pe = e3 > 0 ? "auto" : "none";
        if (pe !== lastPe) {
          pop.style.pointerEvents = pe;
          lastPe = pe;
        }
        popSettled = po >= 1 && converged;
      },
      { el: section },
    );

    // Al salir (p. ej. movimiento reducido en caliente) no deben quedar estilos del reloj.
    return () => {
      unsubscribe();
      for (const el of [trackRef.current, fillRef.current, decoRef.current, barRef.current]) {
        el?.style.removeProperty("transform");
      }
      barRef.current?.style.removeProperty("transform-origin");
      for (const list of [reveals, inners, pars]) {
        for (const el of list.current) el?.style.removeProperty("transform");
      }
      decoEls.current.forEach((el, i) => {
        if (el) el.style.transform = `rotate(${DECOS[i]?.r ?? 0}deg)`;
      });
      for (const el of ghostEls.current) {
        el?.style.removeProperty("opacity");
        el?.style.removeProperty("transform");
      }
      const pop = popRef.current;
      pop?.style.removeProperty("transform");
      pop?.style.removeProperty("opacity");
      pop?.style.removeProperty("pointer-events");
      bodyRef.current?.style.removeProperty("clip-path");
      bodyRef.current?.style.removeProperty("box-shadow");
      dotRef.current?.style.removeProperty("transform");
      const line = lineRef.current;
      if (line) for (const attr of ["x1", "y1", "x2", "y2"]) line.setAttribute(attr, "0");
    };
  }, [reduced]);

  // ---------- Popup con movimiento reducido: aparece entero con opacidad ----------

  useLayoutEffect(() => {
    if (!reduced) return;
    const pop = popRef.current;
    const pin = pinRef.current;
    if (!pop || !pin) return;
    if (active === null) {
      pop.removeAttribute("data-open");
      return;
    }
    const clip = clips.current[active];
    if (!clip) return;
    const pr = pin.getBoundingClientRect();
    const r = clip.getBoundingClientRect();
    const W = pr.width;
    const ax = r.left - pr.left + r.width * 0.68;
    const ay = r.top - pr.top + r.height * 0.3;
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    const right = ax + 90 + pw < W - 16;
    const x = clamp(right ? ax + 90 : ax - 90 - pw, 16, W - pw - 16);
    const y = clamp(ay - ph * 0.22, 80, Math.max(80, pr.height - ph - 28));
    pop.style.transform = `translate3d(${x}px,${y}px,0)`;
    pop.setAttribute("data-open", "");
  }, [active, reduced]);

  // ---------- Apertura / cierre ----------

  const cancelClose = () => window.clearTimeout(closeTimer.current);

  const open = useCallback((i: number) => {
    window.clearTimeout(closeTimer.current);
    activeRef.current = i;
    setActive(i);
    setShown(i);
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    activeRef.current = null;
    setActive(null);
  }, []);

  const scheduleClose = (delay: number) => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(close, delay);
  };

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  /** Destino del foco dentro del popup: el CTA o, sin tienda, el propio cuerpo. */
  const focusPopup = useCallback(() => {
    (ctaRef.current ?? bodyRef.current)?.focus({ preventScroll: true });
  }, []);

  const focusHit = useCallback((i: number) => {
    skipFocusOpen.current = true;
    hits.current[i]?.focus({ preventScroll: true });
    skipFocusOpen.current = false;
  }, []);

  // Teclado: al abrir con Enter/Espacio, el foco pasa al popup.
  useEffect(() => {
    if (active === null) return;
    if (focusCta.current) {
      focusCta.current = false;
      focusPopup();
    }
  }, [active, focusPopup]);

  // Esc cierra el popup se haya abierto con hover, foco o toque.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || activeRef.current === null || bus.isSearchOpen()) return;
      const i = activeRef.current;
      const focused = document.activeElement;
      const focusInside =
        focused !== null &&
        (popRef.current?.contains(focused) || panels.current[i]?.contains(focused));
      close();
      if (focusInside) focusHit(i);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close, focusHit]);

  // Táctil: un toque fuera de los paneles y del popup lo cierra.
  useEffect(() => {
    const onDown = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "mouse" || activeRef.current === null) return;
      const target = event.target as Node;
      const inPanel = panels.current.some((p) => p?.contains(target));
      if (!inPanel && !popRef.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, [close]);

  // Movimiento reducido: el popup se posiciona una vez; al desplazar la fila se cierra.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !reduced) return;
    const onScroll = () => {
      if (activeRef.current !== null) close();
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [reduced, close]);

  /** Con el recorrido fijado, el foco de teclado lleva el scroll vertical hasta el elemento. */
  const bringIntoView = (centerX: number) => {
    const g = geo.current;
    const section = sectionRef.current;
    if (!g || !section || modeRef.current !== "track" || g.over <= 0) return;
    const p = clamp((centerX - g.vw / 2) / g.over, 0, 1);
    const top = section.getBoundingClientRect().top + getScrollY();
    scrollTo(top + p * g.over, { immediate: true });
  };

  const onPanelEnter = (event: PointerEvent, i: number) => {
    if (event.pointerType === "mouse") open(i);
  };
  const onPanelLeave = (event: PointerEvent) => {
    if (event.pointerType === "mouse") scheduleClose(CLOSE_PANEL_DELAY);
  };
  const onHitClick = (event: MouseEvent, i: number) => {
    // Activado con teclado: el foco pasa al popup (ya, si estaba abierto por el foco).
    if (event.detail === 0) {
      if (activeRef.current === i) focusPopup();
      else focusCta.current = true;
    }
    open(i);
  };
  const onHitFocus = (i: number) => {
    const g = geo.current;
    if (g) bringIntoView((g.panelLeft[i] ?? 0) + (g.panelW[i] ?? 0) / 2);
    if (!skipFocusOpen.current) open(i);
  };
  const onFocusOut = (event: FocusEvent) => {
    const next = event.relatedTarget as Node | null;
    const inside =
      next !== null &&
      (popRef.current?.contains(next) || hits.current.some((h) => h?.contains(next)));
    if (!inside) scheduleClose(CLOSE_POP_DELAY);
  };
  // Tab desde el popup sigue el orden visual: siguiente panel (o el outro) / vuelta al panel.
  const onPopKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Tab" || activeRef.current === null) return;
    const i = activeRef.current;
    event.preventDefault();
    close();
    if (event.shiftKey) focusHit(i);
    else (hits.current[i + 1] ?? outroCtaRef.current)?.focus({ preventScroll: true });
  };
  const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.setAttribute("data-loaded", "");
  };
  const onImageError = (id: string) => {
    close();
    popReset.current = true;
    setShown(null);
    setFailed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  const popBrand = shown !== null ? brands[shown] : undefined;
  const isOpen = active !== null;

  return (
    <section
      ref={sectionRef}
      id="emergentes"
      data-section="EMERGENTES"
      data-mode={mode}
      aria-labelledby="em-title"
      className={s.section}
    >
      <div ref={pinRef} className={s.pin}>
        <div ref={decoRef} className={s.deco} aria-hidden="true">
          {DECOS.map((d, i) => (
            <figure
              key={d.file}
              ref={(el) => {
                decoEls.current[i] = el;
              }}
              className={s.decoItem}
              style={{ left: d.l, top: d.t, width: d.w, transform: `rotate(${d.r}deg)` }}
            >
              {fine && (
                // biome-ignore lint/performance/noImgElement: decorados ya optimizados en WebP, posicionados en absoluto (sin CLS).
                <img
                  ref={(el) => {
                    ghostEls.current[i] = el;
                  }}
                  className={s.decoGhost}
                  src={`/assets/deco/${d.file}.webp`}
                  alt=""
                  width={d.iw}
                  height={d.ih}
                  loading="lazy"
                  decoding="async"
                />
              )}
              {/* biome-ignore lint/performance/noImgElement: ver arriba. */}
              <img
                className={s.decoImg}
                src={`/assets/deco/${d.file}.webp`}
                alt=""
                width={d.iw}
                height={d.ih}
                loading="lazy"
                decoding="async"
              />
            </figure>
          ))}
        </div>

        <div className={s.bar} aria-hidden="true">
          <span>EMERGENTES</span>
          <div className={s.progress}>
            <div ref={fillRef} className={s.progressFill} />
          </div>
          <span ref={countRef}>{`01 / ${pad2(n)}`}</span>
        </div>

        <div ref={trackRef} className={s.track}>
          <header className={s.intro}>
            <p className={s.eyebrow}>MARCAS</p>
            <h2 id="em-title" className={s.title}>
              Emer
              <br />
              gentes
            </h2>
            <p className={s.hint}>
              {mode === "reduced" ? "Desliza para recorrerlas →" : "Baja para recorrerlas ↓"}
            </p>
          </header>

          {brands.map((brand, i) => {
            const size = PANEL_SIZES[i % 3] ?? PANEL_SIZES[0];
            return (
              <article
                key={brand.id}
                ref={(el) => {
                  panels.current[i] = el;
                }}
                className={s.panel}
                data-active={active === i ? "" : undefined}
                style={{ width: size.w, height: size.h, marginTop: size.mt }}
                onPointerEnter={(e) => onPanelEnter(e, i)}
                onPointerLeave={onPanelLeave}
              >
                <div
                  ref={(el) => {
                    clips.current[i] = el;
                  }}
                  className={s.clip}
                >
                  <div
                    ref={(el) => {
                      reveals.current[i] = el;
                    }}
                    className={s.reveal}
                  >
                    <div
                      ref={(el) => {
                        inners.current[i] = el;
                      }}
                      className={s.clipInner}
                    >
                      <div
                        ref={(el) => {
                          pars.current[i] = el;
                        }}
                        className={s.par}
                      >
                        <Image
                          src={brand.img}
                          alt=""
                          fill
                          sizes="(min-width: 760px) 55vw, 80vw"
                          className={s.parImg}
                          onLoad={onImageLoad}
                          onError={() => onImageError(brand.id)}
                        />
                      </div>
                      <span className={s.veil} aria-hidden="true" />
                      <span className={s.num} aria-hidden="true">
                        {pad2(i + 1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={s.foot}>
                  <h3 className={s.name}>{brand.name}</h3>
                  {brand.date && (
                    <time className={s.date} dateTime={brand.dateTime ?? undefined}>
                      {brand.date}
                    </time>
                  )}
                </div>
                <button
                  ref={(el) => {
                    hits.current[i] = el;
                  }}
                  type="button"
                  className={s.hit}
                  aria-controls={POP_ID}
                  aria-expanded={active === i}
                  aria-label={`${brand.name}: ver sus prendas`}
                  onClick={(e) => onHitClick(e, i)}
                  onFocus={() => onHitFocus(i)}
                  onBlur={onFocusOut}
                />
              </article>
            );
          })}

          <footer className={s.outro}>
            <p className={s.outroTitle}>
              Y las que
              <br />
              vendrán.
            </p>
            {/* biome-ignore lint/a11y/useValidAnchor: enlace real a #catalogo (funciona sin JS); el onClick solo suaviza el scroll con Lenis. */}
            <a
              ref={outroCtaRef}
              href="#catalogo"
              className={s.outroCta}
              onFocus={() => bringIntoView(Number.POSITIVE_INFINITY)}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("catalogo");
              }}
            >
              VER TODAS LAS MARCAS <span aria-hidden="true">→</span>
            </a>
          </footer>
        </div>

        <svg className={s.line} aria-hidden="true">
          <line ref={lineRef} x1="0" y1="0" x2="0" y2="0" stroke="#000" strokeWidth="1.2" />
        </svg>
        <span ref={dotRef} className={s.dot} aria-hidden="true">
          <span className={s.dotRing} />
        </span>

        {/* biome-ignore lint/a11y/noStaticElementInteractions: delegación de hover (puntero) y de Tab/blur de sus controles; no es un control en sí. */}
        <div
          ref={popRef}
          id={POP_ID}
          className={s.pop}
          inert={!isOpen}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") cancelClose();
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") scheduleClose(CLOSE_POP_DELAY);
          }}
          onBlur={onFocusOut}
          onKeyDown={onPopKeyDown}
        >
          <div ref={barRef} className={s.popBar} />
          <div ref={bodyRef} className={s.popBody} tabIndex={-1}>
            <h4 id="em-pop-name" className={s.popName}>
              {popBrand?.name}
            </h4>
            {popBrand && popBrand.products.length > 0 ? (
              <ol className={s.prods}>
                {popBrand.products.map((product, j) => (
                  <li key={product.id} className={s.prod}>
                    <small className={s.prodIndex}>{pad2(j + 1)}</small>
                    <span className={s.prodImg}>
                      <Image
                        src={product.imageUrl}
                        alt={product.name ? "" : `Prenda de ${popBrand.name}`}
                        fill
                        sizes="150px"
                        className="object-cover"
                      />
                    </span>
                    <div className={s.prodMeta}>
                      {product.name && <p className={s.prodName}>{product.name}</p>}
                      {product.price && <p className={s.prodPrice}>{product.price}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={s.empty}>Su catálogo llega pronto. Mientras, está en su web.</p>
            )}
            {popBrand?.url && (
              <a ref={ctaRef} className={s.cta} href={popBrand.url} target="_blank" rel="noopener">
                IR A LA TIENDA <LoopLine width={56} />
                <span className="sr-only">{NEW_TAB}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
