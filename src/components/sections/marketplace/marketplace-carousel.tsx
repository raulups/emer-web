"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  memo,
  type PointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { LoopLine } from "@/components/ui/loop-line";
import { RetryButton } from "@/components/ui/retry-button";
import { bus } from "@/lib/motion/bus";
import { isReduced, subscribeReduced } from "@/lib/motion/reduced";
import { trackSection } from "@/lib/motion/sections";
import { subscribe } from "@/lib/motion/ticker";
import { DECOS, type MarketItem, RING_SIZE, SLOTS, STEP } from "./data";
import s from "./marketplace.module.css";
import { MarketplaceCta, MarketplaceHead } from "./marketplace-head";

const IDLE = 0.06; // °/frame a 60 Hz
const INERTIA = 0.035;
const WHEEL_K = 0.012;
const DRAG_K = 0.05;
const MAX_V = 6;
const TARGET_LERP = 0.12;
const GAP = 64;
const CLOSE_CARD_DELAY = 220;
const CLOSE_POP_DELAY = 160;
/** Tras cerrar, el popup sigue a su tarjeta mientras se pliega (.65s). */
const FOLLOW_AFTER_CLOSE = 700;
const DRAG_THRESHOLD = 8;
/** La rueda solo gira el carrusel con el escenario centrado; si no, la página sigue bajando. */
const WHEEL_CENTER_TOLERANCE = 0.18;
const FRAME_MS = 1000 / 60;
const NEW_TAB = " (se abre en una pestaña nueva)";
const NEXT = "sugiere";

type Props = { state: "ready"; items: MarketItem[] } | { state: "empty" } | { state: "error" };

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerpK = (k: number, dt: number) => 1 - (1 - k) ** (dt / FRAME_MS);

/** Estado por slot fuera de React: cambiar un producto solo re-renderiza su tarjeta. */
type SlotStore = {
  get: (slot: number) => number;
  all: () => readonly number[];
  set: (slot: number, value: number) => void;
  subscribe: (slot: number, listener: () => void) => () => void;
};

function createSlotStore(poolSize: number): SlotStore {
  const values = Array.from({ length: SLOTS }, (_, j) => j % Math.max(1, poolSize));
  const listeners = new Map<number, Set<() => void>>();
  return {
    get: (slot) => values[slot] ?? 0,
    all: () => values,
    set(slot, value) {
      values[slot] = value;
      for (const listener of listeners.get(slot) ?? []) listener();
    },
    subscribe(slot, listener) {
      const set = listeners.get(slot) ?? new Set();
      set.add(listener);
      listeners.set(slot, set);
      return () => set.delete(listener);
    },
  };
}

/** Ángulo del anillo 0 que deja el slot de frente (el anillo 1 gira al revés y desfasado). */
function frontAngle(slot: number, current: number): number {
  const j = slot % RING_SIZE;
  const base = slot < RING_SIZE ? -j * STEP : STEP / 2 + j * STEP;
  return base + 360 * Math.round((current - base) / 360);
}

type CardProps = {
  slot: number;
  store: SlotStore;
  items: MarketItem[];
  hovered: boolean;
  register: (slot: number, el: HTMLAnchorElement | null) => void;
  onEnter: (event: PointerEvent, slot: number) => void;
  onLeave: (event: PointerEvent) => void;
  onFocus: (event: FocusEvent<HTMLAnchorElement>, slot: number) => void;
  onBlur: (event: FocusEvent) => void;
  onClick: (event: MouseEvent, slot: number) => void;
  onImageError: (index: number) => void;
};

const Card = memo(function Card({
  slot,
  store,
  items,
  hovered,
  register,
  onEnter,
  onLeave,
  onFocus,
  onBlur,
  onClick,
  onImageError,
}: CardProps) {
  const index = useSyncExternalStore(
    useCallback((listener: () => void) => store.subscribe(slot, listener), [store, slot]),
    () => store.get(slot),
    () => store.get(slot),
  );
  const item = items[index];
  if (!item) return null;
  return (
    <a
      ref={(el) => register(slot, el)}
      className={s.card}
      data-cursor="prod"
      data-hover={hovered ? "" : undefined}
      href={item.url}
      target="_blank"
      rel="noopener"
      draggable={false}
      style={{ "--j": slot % RING_SIZE } as CSSProperties}
      onPointerEnter={(e) => onEnter(e, slot)}
      onPointerLeave={onLeave}
      onFocus={(e) => onFocus(e, slot)}
      onBlur={onBlur}
      onClick={(e) => onClick(e, slot)}
    >
      <div className={s.lift}>
        <div className={s.img}>
          <div className={s.zoom}>
            <Image
              key={item.id}
              src={item.img}
              alt=""
              fill
              sizes="(min-width: 1700px) 310px, (min-width: 875px) 19vw, 160px"
              className={s.zoomImg}
              onLoad={(e: SyntheticEvent<HTMLImageElement>) =>
                e.currentTarget.setAttribute("data-loaded", "")
              }
              onError={() => onImageError(index)}
            />
          </div>
        </div>
        <p className={s.row}>
          <span className={s.name}>{item.name}</span>
          {item.price && <span className={s.price}>{item.price}</span>}
        </p>
        <p className={s.brand}>{item.brand}</p>
      </div>
      <span className="sr-only">
        {item.category ? `, ${item.category}` : ""}
        {NEW_TAB}
      </span>
    </a>
  );
});

function Carousel({ items, reduced }: { items: MarketItem[]; reduced: boolean }) {
  const [store] = useState(() => createSlotStore(items.length));
  const [hover, setHover] = useState<number | null>(null);
  const [last, setLast] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cards = useRef<Array<HTMLAnchorElement | null>>([]);
  const popRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const lenRef = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);

  const hoverRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const pausedRef = useRef(false);
  /** Ángulo al que ir (foco de teclado o botones); null = giro libre con inercia. */
  const target = useRef<number | null>(null);
  const focusInside = useRef(false);
  const velocity = useRef(0);
  const angle = useRef(0);
  const failed = useRef(new Set<number>());
  const visible = useRef<boolean[]>([]);
  const popSize = useRef({ w: 0, h: 0 });
  const closeTimer = useRef<number | undefined>(undefined);
  const pointerType = useRef("mouse");
  const drag = useRef({ x: 0, total: 0, active: false, moved: false });

  const register = useCallback((slot: number, el: HTMLAnchorElement | null) => {
    cards.current[slot] = el;
  }, []);

  // ---------- Apertura / cierre ----------

  const open = useCallback((slot: number) => {
    window.clearTimeout(closeTimer.current);
    hoverRef.current = slot;
    lastRef.current = slot;
    setHover(slot);
    setLast(slot);
  }, []);

  const close = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    hoverRef.current = null;
    setHover(null);
  }, []);

  const scheduleClose = useCallback(
    (delay: number) => {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(close, delay);
    },
    [close],
  );

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Esc cierra el popup sin mover el foco (WCAG 1.4.13).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && hoverRef.current !== null && !bus.isSearchOpen()) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  // ---------- Sustitución de productos (solo toca el slot) ----------

  const swap = useCallback(
    (slot: number) => {
      if (pausedRef.current || slot === hoverRef.current || slot === lastRef.current) return;
      const pool: number[] = [];
      for (let i = 0; i < items.length; i++) if (!failed.current.has(i)) pool.push(i);
      if (pool.length === 0) return;
      const used = new Set(store.all());
      let candidates = pool.filter((i) => !used.has(i));
      if (candidates.length === 0) {
        const shown = new Set(store.all().filter((_, k) => visible.current[k]));
        candidates = pool.filter((i) => !shown.has(i));
      }
      if (candidates.length === 0) candidates = pool;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      if (pick !== undefined && pick !== store.get(slot)) store.set(slot, pick);
    },
    [items.length, store],
  );

  const onImageError = useCallback((index: number) => {
    failed.current.add(index);
  }, []);

  // ---------- Tamaño del popup (cambia con su contenido) ----------

  useEffect(() => {
    const pop = popRef.current;
    if (!pop) return;
    popSize.current = { w: pop.offsetWidth, h: pop.offsetHeight };
    const resizeObserver = new ResizeObserver(([entry]) => {
      const box = entry?.borderBoxSize[0];
      if (box) popSize.current = { w: box.inlineSize, h: box.blockSize };
    });
    resizeObserver.observe(pop);
    return () => resizeObserver.disconnect();
  }, []);

  // ---------- Rueda: gira el carrusel con el escenario centrado; si no, la página sigue ----------

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduced) return;
    const onWheel = (event: WheelEvent) => {
      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight;
      const centered =
        Math.abs(rect.top + rect.height / 2 - vh / 2) < vh * WHEEL_CENTER_TOLERANCE ||
        (rect.top <= 0 && rect.bottom >= vh);
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!centered && !horizontal) return; // Lenis hace el scroll de la página
      event.preventDefault();
      event.stopPropagation();
      const d = horizontal ? event.deltaX : event.deltaY;
      velocity.current = clamp(velocity.current + d * WHEEL_K, -MAX_V, MAX_V);
      target.current = null;
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [reduced]);

  // ---------- Reloj: giro con inercia, visibilidad por coseno, sustitución y popup ----------

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || reduced) return;
    const lastOpacity: string[] = [];
    const lastPe: string[] = [];
    const swapped: boolean[] = [];
    let side = 0;
    let wasOpen = false;
    let closedAt = Number.NEGATIVE_INFINITY;

    const unsubscribe = subscribe(
      (t, dt) => {
        // Lecturas primero (posición del frame anterior, imperceptible): sin layout forzado.
        const isOpen = hoverRef.current !== null;
        if (wasOpen && !isOpen) closedAt = t;
        wasOpen = isOpen;
        const key = isOpen
          ? hoverRef.current
          : t - closedAt < FOLLOW_AFTER_CLOSE
            ? lastRef.current
            : null;
        const followed = key !== null ? cards.current[key] : null;
        const rr = followed ? stage.getBoundingClientRect() : null;
        const r = followed ? followed.getBoundingClientRect() : null;

        // Giro.
        const f = dt / FRAME_MS;
        let a = angle.current;
        if (target.current !== null) {
          const diff = target.current - a;
          a += diff * lerpK(TARGET_LERP, dt);
          velocity.current = 0;
          if (Math.abs(diff) < 0.05) {
            a = target.current;
            target.current = null;
          }
        } else {
          const still = isOpen || pausedRef.current || focusInside.current;
          velocity.current += ((still ? 0 : IDLE) - velocity.current) * lerpK(INERTIA, dt);
          a += velocity.current * f;
        }
        angle.current = a;

        for (let ri = 0; ri < 2; ri++) {
          const ang = ri ? -a + STEP / 2 : a;
          const ring = ringRefs.current[ri];
          if (ring)
            ring.style.transform = `translateZ(calc(var(--r) * -1)) rotateX(-4deg) rotateY(${ang}deg)`;
          for (let j = 0; j < RING_SIZE; j++) {
            const slot = ri * RING_SIZE + j;
            const c = Math.cos(((j * STEP + ang) * Math.PI) / 180);
            const card = cards.current[slot];
            if (card) {
              const opacity = c > 0 ? "1" : "0";
              if (opacity !== lastOpacity[slot]) {
                card.style.opacity = opacity;
                lastOpacity[slot] = opacity;
              }
              const pe = c > 0.35 ? "auto" : "none";
              if (pe !== lastPe[slot]) {
                card.style.pointerEvents = pe;
                lastPe[slot] = pe;
              }
            }
            visible.current[slot] = c > 0;
            // La tarjeta abierta se va hacia atrás (rueda, arrastre): se cierra su popup.
            if (slot === hoverRef.current && c < 0.35) close();
            if (c < -0.9 && !swapped[slot]) {
              swapped[slot] = true;
              swap(slot);
            }
            if (c > 0) swapped[slot] = false;
          }
        }

        // Popup: posición a partir de las lecturas del principio.
        const pop = popRef.current;
        const line = lineRef.current;
        if (!rr || !r || !pop || !line) return;
        const { w: pw, h: ph } = popSize.current;
        let sd = 1;
        let x = r.right - rr.left + GAP;
        if (x + pw > rr.width - 12) {
          sd = -1;
          x = r.left - rr.left - pw - GAP;
        }
        // Sin sitio a ningún lado (móvil): dentro del escenario, aunque tape la tarjeta.
        x = clamp(x, 12, Math.max(12, rr.width - pw - 12));
        const y = clamp(r.top - rr.top + r.height * 0.1, 0, Math.max(0, rr.height - ph));
        pop.style.transform = `translate3d(${x}px,${y}px,0)`;
        const lx0 = sd > 0 ? r.right - rr.left : x + pw;
        const lx1 = sd > 0 ? x : r.left - rr.left;
        const len = Math.max(0, lx1 - lx0);
        line.style.transform = `translate3d(${lx0}px,${y + 34}px,0)`;
        if (lenRef.current) lenRef.current.style.transform = `scaleX(${len})`;
        if (dotRef.current) dotRef.current.style.transform = `translateX(${sd > 0 ? 0 : len}px)`;
        if (sd !== side) {
          line.setAttribute("data-side", sd > 0 ? "right" : "left");
          side = sd;
        }
      },
      { el: stage },
    );

    return () => {
      unsubscribe();
      for (const ring of ringRefs.current) ring?.style.removeProperty("transform");
      for (const card of cards.current) {
        card?.style.removeProperty("opacity");
        card?.style.removeProperty("pointer-events");
      }
      popRef.current?.style.removeProperty("transform");
      lineRef.current?.style.removeProperty("transform");
      lenRef.current?.style.removeProperty("transform");
      dotRef.current?.style.removeProperty("transform");
    };
  }, [reduced, swap, close]);

  // ---------- Movimiento reducido: popup colocado al abrir, cerrado al desplazar la fila ----------

  useLayoutEffect(() => {
    if (!reduced || hover === null) return;
    const stage = stageRef.current;
    const card = cards.current[hover];
    const pop = popRef.current;
    if (!stage || !card || !pop) return;
    const rr = stage.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    let x = r.right - rr.left + GAP;
    if (x + pw > rr.width - 12) x = r.left - rr.left - pw - GAP;
    x = clamp(x, 12, Math.max(12, rr.width - pw - 12));
    const y = clamp(r.top - rr.top + r.height * 0.1, 0, Math.max(0, rr.height - ph));
    pop.style.transform = `translate3d(${x}px,${y}px,0)`;
  }, [hover, reduced]);

  useEffect(() => {
    if (!reduced) return;
    const rings = ringRefs.current.filter((el): el is HTMLDivElement => el !== null);
    const onScroll = (event: Event) => {
      // El scroll que provoca el propio foco (Tab a una tarjeta fuera de vista) no cierra.
      const ring = event.currentTarget as HTMLElement;
      if (hoverRef.current !== null && !ring.contains(document.activeElement)) close();
    };
    for (const ring of rings) ring.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      for (const ring of rings) ring.removeEventListener("scroll", onScroll);
    };
  }, [reduced, close]);

  // Táctil: un toque fuera de las tarjetas y del popup lo cierra.
  useEffect(() => {
    const onDown = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "mouse" || hoverRef.current === null) return;
      const node = event.target as Node;
      const inCard = cards.current.some((c) => c?.contains(node));
      if (!inCard && !popRef.current?.contains(node)) close();
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, [close]);

  // ---------- Handlers ----------

  const onEnter = useCallback(
    (event: PointerEvent, slot: number) => {
      if (event.pointerType === "mouse") open(slot);
    },
    [open],
  );
  const onLeave = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === "mouse") scheduleClose(CLOSE_CARD_DELAY);
    },
    [scheduleClose],
  );
  // Foco de teclado: el anillo gira hasta dejar la tarjeta de frente y se abre su popup.
  const onFocus = useCallback(
    (event: FocusEvent<HTMLAnchorElement>, slot: number) => {
      focusInside.current = true;
      if (!event.currentTarget.matches(":focus-visible")) return;
      target.current = frontAngle(slot, angle.current);
      open(slot);
    },
    [open],
  );
  const onBlur = useCallback(
    (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      const toCard = next !== null && cards.current.some((c) => c?.contains(next));
      if (!toCard) {
        focusInside.current = false;
        scheduleClose(CLOSE_POP_DELAY);
      }
    },
    [scheduleClose],
  );
  // Táctil: el primer toque abre el popup y el segundo navega; un arrastre no navega.
  // Teclado y lectores de pantalla (`detail === 0`) navegan siempre a la primera.
  const onClick = useCallback(
    (event: MouseEvent, slot: number) => {
      if (event.detail === 0) return;
      if (drag.current.moved) {
        event.preventDefault();
        drag.current.moved = false;
        return;
      }
      if (pointerType.current !== "mouse" && hoverRef.current !== slot) {
        event.preventDefault();
        open(slot);
      }
    },
    [open],
  );

  const onStagePointerDown = (event: PointerEvent) => {
    pointerType.current = event.pointerType;
    drag.current.moved = false;
    if (event.pointerType === "mouse" || reduced) return;
    drag.current = { x: event.clientX, total: 0, active: true, moved: false };
  };
  const onStagePointerMove = (event: PointerEvent) => {
    const d = drag.current;
    if (!d.active || event.pointerType === "mouse") return;
    const dx = event.clientX - d.x;
    d.x = event.clientX;
    d.total += Math.abs(dx);
    if (d.total > DRAG_THRESHOLD) d.moved = true;
    velocity.current = clamp(velocity.current + dx * DRAG_K, -MAX_V, MAX_V);
    target.current = null;
  };
  const onStagePointerEnd = () => {
    drag.current.active = false;
  };
  const onStageLeave = (event: PointerEvent) => {
    if (event.pointerType === "mouse") close();
  };

  /** Botones ←/→: giran una tarjeta (alternativa al arrastre y a la rueda, WCAG 2.5.7). */
  const stepBy = (dir: 1 | -1) => {
    const base = target.current ?? Math.round(angle.current / STEP) * STEP;
    target.current = base - dir * STEP;
  };
  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const popItem = last !== null ? items[store.get(last)] : undefined;
  const isOpen = hover !== null;

  return (
    <>
      <div className={s.controls}>
        <button type="button" className={s.control} aria-pressed={paused} onClick={togglePause}>
          {paused ? "Reanudar giro" : "Pausar giro"}
        </button>
        <button type="button" className={s.control} onClick={() => stepBy(-1)}>
          <span aria-hidden="true">←</span>
          <span className="sr-only">Girar hacia la izquierda</span>
        </button>
        <button type="button" className={s.control} onClick={() => stepBy(1)}>
          <span aria-hidden="true">→</span>
          <span className="sr-only">Girar hacia la derecha</span>
        </button>
      </div>
      <div
        ref={stageRef}
        className={s.stage}
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerEnd}
        onPointerCancel={onStagePointerEnd}
        onPointerLeave={onStageLeave}
      >
        {[0, 1].map((ri) => (
          <div
            key={ri}
            ref={(el) => {
              ringRefs.current[ri] = el;
            }}
            className={s.ring}
            data-ring={ri}
          >
            {Array.from({ length: RING_SIZE }, (_, j) => {
              const slot = ri * RING_SIZE + j;
              return (
                <Card
                  key={slot}
                  slot={slot}
                  store={store}
                  items={items}
                  hovered={hover === slot}
                  register={register}
                  onEnter={onEnter}
                  onLeave={onLeave}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  onClick={onClick}
                  onImageError={onImageError}
                />
              );
            })}
          </div>
        ))}

        <div
          ref={lineRef}
          className={s.popLine}
          data-open={isOpen ? "" : undefined}
          aria-hidden="true"
        >
          <span ref={lenRef} className={s.lnLen}>
            <span className={s.ln} />
          </span>
          <span ref={dotRef} className={s.dotPos}>
            <span className={s.dot} />
          </span>
        </div>

        {/* Refuerzo visual del hover: la tarjeta ya expone nombre, precio, marca, categoría y enlace. */}
        <div
          ref={popRef}
          className={s.pop}
          data-open={isOpen ? "" : undefined}
          aria-hidden="true"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") window.clearTimeout(closeTimer.current);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") scheduleClose(CLOSE_POP_DELAY);
          }}
        >
          <div className={s.popTop}>
            <p className={s.popBrand}>{popItem?.brand}</p>
            <p className={s.popRow}>
              <span className={s.popName}>{popItem?.name}</span>
              <span className={s.popPrice}>{popItem?.price}</span>
            </p>
          </div>
          <div className={s.popMid}>
            <div className={s.popImg}>
              {popItem && (
                <Image
                  key={popItem.id}
                  src={popItem.img}
                  alt=""
                  fill
                  sizes="180px"
                  className="object-cover"
                />
              )}
            </div>
            <div className={s.popInfo}>
              <small className={s.popCat}>{popItem?.category}</small>
              <strong className={s.popBig}>{popItem?.price}</strong>
            </div>
          </div>
          <a className={s.popCta} href={popItem?.url} target="_blank" rel="noopener" tabIndex={-1}>
            IR A LA TIENDA <LoopLine width={44} />
          </a>
        </div>
      </div>
    </>
  );
}

/** 06-marketplace: carrusel 3D de dos anillos de prendas que giran en sentidos opuestos. */
export function MarketplaceCarousel(props: Props) {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    return trackSection(section, "marketplace");
  }, []);

  return (
    <section
      ref={sectionRef}
      id="marketplace"
      data-section="MARKETPLACE"
      data-mode={reduced ? "reduced" : "orbit"}
      aria-labelledby="mk-title"
      className={s.section}
    >
      <div className={s.deco} aria-hidden="true">
        {DECOS.map((d) => (
          // biome-ignore lint/performance/noImgElement: decorados ya optimizados en WebP, posicionados en absoluto (sin CLS).
          <img
            key={d.file}
            className={s.decoImg}
            src={`/assets/deco-negro/${d.file}.webp`}
            alt=""
            width={d.iw}
            height={d.ih}
            loading="lazy"
            decoding="async"
            style={{
              ...d.pos,
              width: d.w,
              transform: "tf" in d ? d.tf : undefined,
              opacity: "opacity" in d ? d.opacity : undefined,
            }}
          />
        ))}
      </div>

      {props.state === "ready" && (
        <a href={`#${NEXT}`} className={s.skip}>
          Saltar el marketplace
        </a>
      )}

      <MarketplaceHead withHint={props.state === "ready"} />

      {props.state === "ready" ? (
        <>
          <Carousel items={props.items} reduced={reduced} />
          <MarketplaceCta />
        </>
      ) : (
        <div className={s.empty}>
          <p className={s.emptyText}>
            {props.state === "error"
              ? "No hemos podido cargar las prendas."
              : "Las prendas llegan pronto."}
          </p>
          {props.state === "error" && <RetryButton className={s.retry} subject="prendas" />}
        </div>
      )}
    </section>
  );
}
