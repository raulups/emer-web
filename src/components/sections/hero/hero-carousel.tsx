"use client";

import Image from "next/image";
import {
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { HERO_AUTOPLAY_MS } from "@/lib/config/hero";
import { EASE, gsap, useGSAP } from "@/lib/gsap";
import { bus } from "@/lib/motion/bus";
import { cursor } from "@/lib/motion/cursor";
import { isReduced, subscribeReduced } from "@/lib/motion/reduced";
import { getHeroHeight, getScrollY, registerHero } from "@/lib/motion/scroll";
import { initHeroKeys } from "@/lib/motion/shortcuts";
import { subscribe } from "@/lib/motion/ticker";
import type { HeroBrand, HeroProduct } from "./types";

const SWIPE_PX = 50;
const DRAG_PX = 10;
const ITEM_BASE_S = 0.62;
const ITEM_STEP_S = 0.09;
const EMPTY_DELAY_S = 0.66;
const NAME_DELAY_S = 0.28;
const SCROLL_PAUSE_RATIO = 0.02;
const NEW_TAB = "(se abre en una pestaña nueva)";

/** Vacía y reescribe en el siguiente tick para que el lector repita textos iguales. */
function announce(text: string) {
  const el = document.getElementById("announcer");
  if (!el) return;
  el.textContent = "";
  window.setTimeout(() => {
    el.textContent = text;
  }, 50);
}

const hoverNone = () => window.matchMedia("(hover: none)").matches;

function tileLabel(tile: HeroProduct, brandName: string): string {
  const what = tile.name ?? `Prenda de ${brandName}`;
  const where = tile.hrefIsBrand ? `ver en la tienda de ${brandName}` : "ver en su web";
  return [what, tile.price, where].filter(Boolean).join(", ");
}

export function HeroCarousel({ brands }: { brands: HeroBrand[] }) {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);
  const [firstId] = useState(() => brands[0]?.id);

  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const [failedTiles, setFailedTiles] = useState<ReadonlySet<string>>(() => new Set());
  const [activeId, setActiveId] = useState(firstId);
  const [ready, setReady] = useState(false);
  const [popId, setPopId] = useState<string | null>(null);
  const [mounted, setMounted] = useState<ReadonlySet<string>>(
    () => new Set(brands.slice(0, 2).map((b) => b.id)),
  );

  const list = useMemo(() => brands.filter((b) => !failed.has(b.id)), [brands, failed]);
  const n = list.length;
  const idx = Math.max(
    0,
    list.findIndex((b) => b.id === activeId),
  );
  const brand = list[idx];
  const tiles = useMemo(
    () => (brand ? brand.products.filter((p) => !failedTiles.has(p.id)) : []),
    [brand, failedTiles],
  );
  const popIndex = popId ? tiles.findIndex((t) => t.id === popId) : -1;
  const pop = popIndex >= 0 ? popIndex : null;

  // El popup conserva el último producto y posición mientras se desvanece.
  const lastPop = useRef<{ product: HeroProduct; index: number } | null>(null);
  const popTile = pop !== null ? tiles[pop] : undefined;
  if (pop !== null && popTile) lastPop.current = { product: popTile, index: pop };
  const shownPop = lastPop.current;
  const popPct = (((shownPop?.index ?? 0) + 0.5) / 4) * 100;

  const sectionRef = useRef<HTMLElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLHeadingElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const segFills = useRef<Array<HTMLSpanElement | null>>([]);
  const segButtons = useRef<Array<HTMLButtonElement | null>>([]);

  const listRef = useRef(list);
  const idxRef = useRef(idx);
  const activeIdRef = useRef(brand?.id);
  const readyRef = useRef(ready);
  const reducedRef = useRef(reduced);
  listRef.current = list;
  idxRef.current = idx;
  activeIdRef.current = brand?.id;
  readyRef.current = ready;
  reducedRef.current = reduced;

  const elapsed = useRef(0);
  const lastProgress = useRef(-1);
  const hovering = useRef(false);
  const focusWithin = useRef(false);
  const lastPointer = useRef("mouse");
  const tilePointerDown = useRef<number | null>(null);
  const dragAbort = useRef<AbortController | null>(null);
  const suppressClick = useRef(false);
  const refocusName = useRef(false);
  const popWasOpen = useRef(false);
  const prevActive = useRef<string | null>(null);
  const lastKenBurns = useRef("");

  const { contextSafe } = useGSAP({ scope: sectionRef });

  // ---------- Navegación ----------

  const go = useCallback((target: number, byUser: boolean) => {
    const current = listRef.current;
    if (current.length < 2) return;
    const nextIndex = ((target % current.length) + current.length) % current.length;
    const next = current[nextIndex];
    if (!next || next.id === activeIdRef.current) return;
    // Se actualizan ya para que el ticker no pinte un frame con el índice antiguo.
    idxRef.current = nextIndex;
    activeIdRef.current = next.id;
    elapsed.current = 0;
    lastProgress.current = -1;
    // Si el foco estaba en el bloque que se va a re-montar, se recupera en el nombre nuevo.
    if (bottomRef.current?.contains(document.activeElement)) refocusName.current = true;
    setPopId(null);
    setActiveId(next.id);
    if (byUser) announce(`${next.name}, marca ${nextIndex + 1} de ${current.length}`);
  }, []);

  const goRef = useRef(go);
  goRef.current = go;

  const currentId = brand?.id;
  const followingId = list[(idx + 1) % Math.max(1, n)]?.id;

  // Precarga progresiva: la marca activa y la siguiente.
  useEffect(() => {
    setMounted((prev) => {
      if ((!currentId || prev.has(currentId)) && (!followingId || prev.has(followingId))) {
        return prev;
      }
      const next = new Set(prev);
      if (currentId) next.add(currentId);
      if (followingId) next.add(followingId);
      return next;
    });
  }, [currentId, followingId]);

  // Foco tras cambiar de marca: al nombre nuevo, o al segmento activo si venía de ahí.
  useEffect(() => {
    if (!currentId) return;
    if (refocusName.current) {
      refocusName.current = false;
      nameRef.current?.focus({ preventScroll: true });
    }
    const active = document.activeElement;
    if (active instanceof HTMLButtonElement && segButtons.current.includes(active)) {
      segButtons.current[idxRef.current]?.focus({ preventScroll: true });
    }
  }, [currentId]);

  // ---------- Integración con el shell ----------

  useEffect(() => bus.onLoaded(() => setReady(true)), []);

  useEffect(() => bus.on("hero:step", ({ dir }) => goRef.current(idxRef.current + dir, true)), []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const cleanups = [registerHero(el), initHeroKeys(el)];
    // Marca de "hidratado y registrado" (el hero hidrata aparte, dentro de su Suspense).
    el.dataset.registered = "";
    return () => {
      delete el.dataset.registered;
      dragAbort.current?.abort();
      cursor.clear();
      for (const cleanup of cleanups) cleanup();
      // Las animaciones de capas y popup se limpian aquí (sus contextos se vacían en cada cambio).
      gsap.killTweensOf(
        el.querySelectorAll("[data-hero-layer], [data-hero-zoom], [data-hero-pop]"),
      );
    };
  }, []);

  // ---------- Autoplay (ticker; se pausa solo fuera de pantalla) ----------

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || n < 2) return;
    return subscribe(
      (_, dt) => {
        if (!readyRef.current) return;
        const paused =
          hovering.current ||
          focusWithin.current ||
          bus.isSearchOpen() ||
          getScrollY() > getHeroHeight() * SCROLL_PAUSE_RATIO;
        if (!paused) elapsed.current += dt;
        const progress = Math.min(1, elapsed.current / HERO_AUTOPLAY_MS);
        if (progress !== lastProgress.current) {
          lastProgress.current = progress;
          const fill = segFills.current[idxRef.current];
          if (fill) fill.style.transform = `scaleX(${progress})`;
        }
        if (progress >= 1) goRef.current(idxRef.current + 1, false);
      },
      { el },
    );
  }, [n]);

  // ---------- Coreografía ----------

  // Segmentos: pasados llenos, futuros vacíos; el activo lo rellena el autoplay.
  useGSAP(
    () => {
      segFills.current.forEach((fill, i) => {
        if (!fill) return;
        const full = i < idx || (i === idx && reduced);
        gsap.set(fill, { scaleX: full ? 1 : 0 });
      });
    },
    { scope: sectionRef, dependencies: [idx, reduced, n], revertOnUpdate: true },
  );

  // Capas: crossfade de 1.6s (200ms reducido) y Ken Burns de 10s en la activa.
  useGSAP(
    (context) => {
      context?.clear(); // no acumular tweens antiguos (la limpieza final está en el efecto de registro)
      const root = sectionRef.current;
      if (!root || !brand) return;
      const layers = new Map<string, HTMLElement>();
      for (const el of root.querySelectorAll<HTMLElement>("[data-hero-layer]")) {
        if (el.dataset.id) layers.set(el.dataset.id, el);
      }
      const zoomOf = (el: HTMLElement) => el.querySelector<HTMLElement>("[data-hero-zoom]");
      const resetZoom = (el: HTMLElement) => {
        const zoom = zoomOf(el);
        if (!zoom) return;
        gsap.killTweensOf(zoom);
        gsap.set(zoom, { scale: reducedRef.current ? 1 : 1.06 });
      };

      const cur = layers.get(brand.id);
      const prevId = prevActive.current;
      const prev = prevId && prevId !== brand.id ? (layers.get(prevId) ?? null) : null;
      const duration = reduced ? 0.2 : 1.6;

      for (const el of layers.values()) {
        if (el === cur || el === prev) continue;
        gsap.killTweensOf(el);
        gsap.set(el, { autoAlpha: 0, zIndex: 0 });
        resetZoom(el);
      }
      if (!cur) return;

      gsap.set(cur, { zIndex: 2 });
      if (prev) {
        gsap.set(prev, { zIndex: 1 });
        gsap.to(cur, { autoAlpha: 1, duration, ease: EASE.standard, overwrite: "auto" });
        gsap.to(prev, {
          autoAlpha: 0,
          duration,
          ease: EASE.standard,
          overwrite: "auto",
          onComplete: () => resetZoom(prev),
        });
      } else {
        gsap.set(cur, { autoAlpha: 1 });
      }

      // El Ken Burns solo (re)arranca si cambia la marca, el fin de carga o la preferencia.
      const key = `${brand.id}|${ready}|${reduced}`;
      const zoom = zoomOf(cur);
      if (zoom && key !== lastKenBurns.current) {
        gsap.killTweensOf(zoom);
        if (reduced) gsap.set(zoom, { scale: 1 });
        else if (ready)
          gsap.fromTo(zoom, { scale: 1.06 }, { scale: 1, duration: 10, ease: EASE.kenBurns });
        else gsap.set(zoom, { scale: 1.06 });
      }
      lastKenBurns.current = key;
      prevActive.current = brand.id;
    },
    { scope: sectionRef, dependencies: [brand?.id, reduced, ready] },
  );

  // Nombre e ítems: nodos nuevos en cada marca (key), entran con sus delays.
  useGSAP(
    () => {
      const root = sectionRef.current;
      if (!root) return;
      const name = root.querySelector("[data-hero-name]");
      const items = root.querySelectorAll<HTMLElement>("[data-hero-item]");

      // `y: 0` explícito: GSAP puede leer el translateY del CSS de carga como `y` en píxeles.
      if (!ready) {
        if (name)
          gsap.set(name, reduced ? { y: 0, yPercent: 0, opacity: 0 } : { y: 0, yPercent: 105 });
        gsap.set(items, { opacity: 0, y: reduced ? 0 : 12 });
        return;
      }

      if (reduced) {
        if (name)
          gsap.fromTo(
            name,
            { y: 0, yPercent: 0, opacity: 0 },
            { opacity: 1, duration: 0.2, ease: EASE.standard },
          );
        gsap.fromTo(
          items,
          { opacity: 0, y: 0 },
          { opacity: 1, duration: 0.2, ease: EASE.standard },
        );
        return;
      }

      if (name)
        gsap.fromTo(
          name,
          { y: 0, yPercent: 105, opacity: 1 },
          { yPercent: 0, duration: 1.3, ease: EASE.outExpo, delay: NAME_DELAY_S },
        );
      for (const item of items) {
        const delay = Number(item.dataset.delay ?? ITEM_BASE_S);
        gsap.fromTo(item, { opacity: 0 }, { opacity: 1, duration: 1, ease: EASE.standard, delay });
        gsap.fromTo(item, { y: 12 }, { y: 0, duration: 1.2, ease: EASE.outExpo, delay });
      }
    },
    { scope: sectionRef, dependencies: [brand?.id, ready, reduced], revertOnUpdate: true },
  );

  // Popup de producto y atenuado de los tiles no activos.
  useGSAP(
    (context) => {
      context?.clear();
      const el = popRef.current;
      const grid = gridRef.current;
      if (!el || !grid) {
        popWasOpen.current = false;
        return;
      }
      const tileImages = grid.querySelectorAll<HTMLElement>("[data-hero-tile-img]");

      if (pop !== null) {
        const pct = ((pop + 0.5) / 4) * 100;
        if (popWasOpen.current) {
          // Ya abierto: `left` salta (render) y el desplazamiento se desliza, como en el diseño.
          gsap.to(el, { xPercent: -pct, duration: 0.6, ease: EASE.outExpo, overwrite: "auto" });
        } else {
          gsap.set(el, { xPercent: -pct });
          gsap.fromTo(
            el,
            { opacity: 0, y: reduced ? 0 : 14 },
            {
              opacity: 1,
              y: 0,
              duration: reduced ? 0.35 : 0.6,
              ease: reduced ? EASE.standard : EASE.outExpo,
              overwrite: "auto",
            },
          );
        }
        tileImages.forEach((tile, i) => {
          gsap.to(tile, {
            opacity: i === pop ? 1 : 0.45,
            duration: 0.4,
            ease: EASE.standard,
            overwrite: "auto",
          });
        });
      } else if (popWasOpen.current) {
        gsap.to(el, {
          opacity: 0,
          y: reduced ? 0 : 14,
          duration: 0.35,
          ease: EASE.standard,
          overwrite: "auto",
        });
        gsap.to(tileImages, { opacity: 1, duration: 0.4, ease: EASE.standard, overwrite: "auto" });
      }
      popWasOpen.current = pop !== null;
    },
    { scope: sectionRef, dependencies: [pop, reduced, brand?.id] },
  );

  // ---------- Handlers ----------

  const fadeInLayer = contextSafe((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const layerId = img.closest<HTMLElement>("[data-hero-layer]")?.dataset.id;
    // Si la capa no está a la vista (precarga), se muestra sin animar.
    if (layerId !== activeIdRef.current) {
      gsap.set(img, { opacity: 1 });
      return;
    }
    gsap.to(img, { opacity: 1, duration: reducedRef.current ? 0.2 : 1.6, ease: EASE.standard });
  });

  const markFailed = (id: string) => {
    if (id === activeIdRef.current) {
      // Si falla la marca activa, se pasa a la siguiente (no a la primera).
      const current = listRef.current;
      const i = current.findIndex((b) => b.id === id);
      const next = current[(i + 1) % current.length];
      if (next && next.id !== id) {
        elapsed.current = 0;
        setActiveId(next.id);
      }
    }
    setFailed((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  };

  const hideTile = (id: string) =>
    setFailedTiles((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    lastPointer.current = event.pointerType;
    suppressClick.current = false;
    // En táctil, tocar fuera de los productos cierra el popup.
    if (event.pointerType !== "mouse" && !gridRef.current?.contains(event.target as Node)) {
      setPopId(null);
    }
    if (event.button !== 0) return;

    dragAbort.current?.abort();
    const abort = new AbortController();
    dragAbort.current = abort;
    const section = event.currentTarget;
    const start = { x: event.clientX, y: event.clientY, id: event.pointerId };
    let moved = false;

    const finish = () => {
      abort.abort();
      section.classList.remove("select-none");
      if (moved) cursor.clear();
    };

    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerId !== start.id || moved) return;
        if (Math.abs(e.clientX - start.x) > DRAG_PX) {
          moved = true;
          section.classList.add("select-none");
          cursor.set("drag");
        }
      },
      { passive: true, signal: abort.signal },
    );
    window.addEventListener(
      "pointerup",
      (e) => {
        if (e.pointerId !== start.id) return;
        finish();
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (moved) suppressClick.current = true;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_PX) {
          goRef.current(idxRef.current + (dx < 0 ? 1 : -1), true);
        }
      },
      { signal: abort.signal },
    );
    window.addEventListener(
      "pointercancel",
      (e) => {
        if (e.pointerId === start.id) finish();
      },
      { signal: abort.signal },
    );
  };

  // Tras un arrastre, el click que dispara el navegador no debe abrir enlaces.
  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const onTileClick = (event: ReactMouseEvent<HTMLAnchorElement>, i: number, id: string) => {
    // Pantallas táctiles: el primer toque abre el popup y el segundo navega. Solo si hubo un
    // toque real en ese tile (los lectores de pantalla generan clicks sin pointerdown).
    const touched = tilePointerDown.current === i;
    tilePointerDown.current = null;
    if (touched && lastPointer.current !== "mouse" && hoverNone() && popId !== id) {
      event.preventDefault();
      setPopId(id);
    }
  };

  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && popId !== null) {
      event.stopPropagation();
      setPopId(null);
    }
  };

  const onGridBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPopId(null);
  };

  if (!brand) return null;

  return (
    <section
      ref={sectionRef}
      id="marcas"
      data-section="MARCAS"
      data-cursor="hero"
      aria-roledescription="carrusel"
      aria-label="Marcas destacadas"
      onPointerDown={onPointerDown}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") hovering.current = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") hovering.current = false;
      }}
      onFocus={() => {
        focusWithin.current = true;
      }}
      onBlur={(e) => {
        focusWithin.current = e.currentTarget.contains(e.relatedTarget as Node | null);
      }}
      onClickCapture={onClickCapture}
      className="relative h-svh min-h-[560px] touch-pan-y touch-pinch-zoom overflow-hidden bg-hero text-paper"
    >
      {/* Capas de fondo */}
      <div aria-hidden="true" className="absolute inset-0">
        {list.map((b) => {
          const isFirst = b.id === firstId;
          return (
            <div
              key={b.id}
              data-hero-layer=""
              data-id={b.id}
              className="absolute inset-0"
              style={{
                backgroundColor: b.color,
                opacity: isFirst ? 1 : 0,
                visibility: isFirst ? "visible" : "hidden",
              }}
            >
              <div
                data-hero-zoom=""
                className="absolute inset-0"
                style={{ transform: "scale(1.06)" }}
              >
                {mounted.has(b.id) && (
                  <Image
                    src={b.img}
                    alt=""
                    fill
                    sizes="100vw"
                    draggable={false}
                    loading={isFirst ? "eager" : "lazy"}
                    fetchPriority={isFirst ? "high" : "auto"}
                    className="object-cover"
                    // La primera no hace fade: es el LCP y no debe esperar a la hidratación.
                    style={isFirst ? undefined : { opacity: 0 }}
                    onLoad={isFirst ? undefined : fadeInLayer}
                    onError={() => markFailed(b.id)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[5] bg-[linear-gradient(180deg,rgba(0,0,0,0.28),transparent_18%,transparent_52%,rgba(0,0,0,0.62))]"
      />

      <div className="absolute inset-0 z-[6]">
        <button
          type="button"
          data-js-only=""
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => bus.emit("emer:search:open")}
          className="absolute top-[22px] left-1/2 flex -translate-x-1/2 items-center gap-4 py-2 text-[12px] font-normal tracking-[0.32em] text-paper"
        >
          <span>BUSCAR</span>
          <span aria-hidden="true" className="hidden font-[inherit] opacity-55 lg:inline">
            ⌘K
          </span>
        </button>

        {/* biome-ignore lint/a11y/useSemanticElements: patrón APG de carrusel (diapositiva = role group); un fieldset no aplica. */}
        <div
          key={brand.id}
          ref={bottomRef}
          role="group"
          aria-roledescription="diapositiva"
          aria-label={`${idx + 1} de ${n}`}
          className="absolute inset-x-hero bottom-16 flex flex-wrap items-end justify-between gap-x-12 gap-y-7"
        >
          <div className="flex min-w-0 max-w-full flex-col gap-[18px]">
            <h2 ref={nameRef} tabIndex={-1} className="overflow-hidden pb-[0.03em] outline-none">
              <span
                data-hero-name=""
                className="block whitespace-nowrap text-display-l tracking-[0.005em]"
              >
                {brand.name}
              </span>
            </h2>
            {brand.url && (
              <a
                data-hero-item=""
                data-delay={ITEM_BASE_S}
                href={brand.url}
                target="_blank"
                rel="noopener"
                draggable={false}
                className="group flex items-center gap-3.5 self-start text-paper hover:text-paper"
              >
                <span aria-hidden="true" className="h-px w-9 bg-paper" />
                <span className="border-b border-transparent pb-[3px] text-[10px] font-normal tracking-[0.3em] transition-[border-color] duration-300 group-hover:border-paper">
                  IR A LA TIENDA <span aria-hidden="true">↗</span>
                </span>
                <span className="sr-only">{NEW_TAB}</span>
              </a>
            )}
          </div>

          {/* biome-ignore lint/a11y/noStaticElementInteractions: solo cierra el popup decorativo (aria-hidden) con ratón y Esc; con teclado se abre y cierra con el foco de los enlaces. */}
          <div
            ref={gridRef}
            onMouseLeave={() => setPopId(null)}
            onKeyDown={onGridKeyDown}
            onBlur={onGridBlur}
            className="relative grid w-[min(100%,clamp(300px,40vw,580px))] grid-cols-4 gap-2.5"
          >
            {tiles.length > 0 && (
              <div
                ref={popRef}
                data-hero-pop=""
                aria-hidden="true"
                className="absolute bottom-[calc(100%+18px)] z-30 grid w-[min(400px,86vw)] grid-cols-[44%_minmax(0,1fr)] border border-ink bg-paper text-ink opacity-0"
                style={{ left: `${popPct}%` }}
              >
                <span className="relative block aspect-[3/4] bg-skeleton">
                  {shownPop && (
                    <Image
                      src={shownPop.product.imageUrl}
                      alt=""
                      fill
                      sizes="176px"
                      draggable={false}
                      className="object-cover"
                    />
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-2.5 border-l border-ink px-4 pt-[18px] pb-4">
                  <span className="text-[8px] font-normal uppercase tracking-[0.24em] text-muted">
                    {brand.name}
                  </span>
                  {shownPop?.product.name && (
                    <span className="text-[17px] leading-[1.25] [overflow-wrap:anywhere] [text-wrap:pretty]">
                      {shownPop.product.name}
                    </span>
                  )}
                  {shownPop?.product.price && (
                    <span className="text-[13px] font-normal">{shownPop.product.price}</span>
                  )}
                  <span className="mt-auto border-t border-ink pt-2.5 text-[8.5px] font-normal tracking-[0.26em]">
                    VER EN SU WEB ↗
                  </span>
                </span>
              </div>
            )}

            {tiles.map((tile, i) => {
              const content = (
                <>
                  <span
                    data-hero-tile-img=""
                    className="relative block aspect-[3/4] overflow-hidden bg-surface-dark"
                  >
                    <Image
                      src={tile.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 760px) 145px, 25vw"
                      draggable={false}
                      className="object-cover"
                      onError={() => hideTile(tile.id)}
                    />
                  </span>
                  <span className="text-[9.5px] font-normal tracking-[0.12em]">{tile.price}</span>
                </>
              );
              const onEnter = (e: ReactPointerEvent) => {
                if (e.pointerType === "mouse") setPopId(tile.id);
              };
              return tile.href ? (
                <a
                  key={tile.id}
                  data-hero-item=""
                  data-delay={ITEM_BASE_S + i * ITEM_STEP_S}
                  data-cursor="prod"
                  href={tile.href}
                  target="_blank"
                  rel="noopener"
                  draggable={false}
                  aria-label={`${tileLabel(tile, brand.name)} ${NEW_TAB}`}
                  onPointerEnter={onEnter}
                  onPointerDown={(e) => {
                    tilePointerDown.current = e.pointerType === "mouse" ? null : i;
                  }}
                  onFocus={() => {
                    // Con toque el foco llega antes del click: el popup lo abre onTileClick.
                    if (lastPointer.current === "mouse") setPopId(tile.id);
                  }}
                  onClick={(e) => onTileClick(e, i, tile.id)}
                  className="flex flex-col gap-2 text-paper hover:text-paper"
                >
                  {content}
                </a>
              ) : (
                <div
                  key={tile.id}
                  data-hero-item=""
                  data-delay={ITEM_BASE_S + i * ITEM_STEP_S}
                  data-cursor="prod"
                  role="img"
                  aria-label={tileLabel(tile, brand.name)}
                  onPointerEnter={onEnter}
                  className="flex flex-col gap-2"
                >
                  {content}
                </div>
              );
            })}

            {tiles.length > 0 && brand.url && (
              <a
                data-hero-item=""
                data-delay={ITEM_BASE_S + tiles.length * ITEM_STEP_S}
                href={brand.url}
                target="_blank"
                rel="noopener"
                draggable={false}
                className="group flex flex-col gap-2 text-paper hover:text-paper"
              >
                <span className="flex aspect-[3/4] items-end border border-white/85 p-2.5 transition-colors duration-300 group-hover:bg-paper group-hover:text-ink">
                  <span className="text-[8.5px] font-normal tracking-[0.24em] md:whitespace-nowrap">
                    VER TODO <span aria-hidden="true">→</span>
                  </span>
                </span>
                <span aria-hidden="true" className="text-[9.5px] opacity-0">
                  ·
                </span>
                <span className="sr-only">{NEW_TAB}</span>
              </a>
            )}

            {tiles.length === 0 && (
              <p
                data-hero-item=""
                data-delay={EMPTY_DELAY_S}
                className="col-span-4 border-t border-white/85 pt-3.5 text-[15px] italic leading-[1.4] [text-wrap:pretty]"
              >
                Sus prendas aún no están en Emer. Mientras tanto, están en su tienda.
              </p>
            )}
          </div>
        </div>

        {n > 1 && (
          <nav
            data-hero-segments=""
            aria-label="Marcas"
            className="absolute inset-x-hero bottom-[26px] flex gap-2"
          >
            {list.map((b, i) => (
              <button
                key={b.id}
                ref={(el) => {
                  segButtons.current[i] = el;
                }}
                type="button"
                aria-label={`Ir a ${b.name}`}
                aria-current={i === idx ? "true" : undefined}
                onClick={() => go(i, true)}
                className="relative h-4 flex-1"
              >
                <span className="absolute inset-x-0 top-1/2 h-px overflow-hidden bg-white/35">
                  <span
                    ref={(el) => {
                      segFills.current[i] = el;
                    }}
                    className="absolute inset-0 origin-left bg-paper"
                    style={{ transform: "scaleX(0)" }}
                  />
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}
