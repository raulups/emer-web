"use client";

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { CardVM, ViewCols } from "@/lib/marketplace/types";
import { subscribe } from "@/lib/motion/ticker";
import s from "./marketplace-page.module.css";
import { ProductCard } from "./product-card";
import { GridSkeleton } from "./skeletons";

type Props = {
  items: readonly CardVM[];
  view: ViewCols;
  hrefFor: (item: CardVM) => string;
  onOpen: (item: CardVM, opener: HTMLElement) => void;
  hasMore: boolean;
  loadingMore: boolean;
  moreError: boolean;
  onMore: () => void;
};

const SAFETY_MS = 700;
const IN_AT = 0.94;

/**
 * Cuadrícula con entrada escalonada (#15). Las cards nacen visibles; solo se ocultan para animar
 * si la pestaña está visible, y el revelado no depende solo del IntersectionObserver: se comprueba
 * en `scroll`, en el ticker (cada 700 ms) y al volverse invisible la pestaña se muestran todas.
 */
export function ProductGrid({
  items,
  view,
  hrefFor,
  onOpen,
  hasMore,
  loadingMore,
  moreError,
  onMore,
}: Props) {
  const grid = useRef<HTMLUListElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const arm = useRef<(() => void) | null>(null);

  useGSAP(
    () => {
      const list = grid.current;
      if (!list) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const waiting = new Set<HTMLElement>();

        const reveal = (el: HTMLElement, col: number) => {
          waiting.delete(el);
          const delay = Math.min(col, 5) * 0.08;
          gsap.to(el, { opacity: 1, duration: 0.9, ease: "standard", delay });
          gsap.to(el, {
            y: 0,
            duration: 1.2,
            ease: "outExpo",
            delay,
            onComplete: () => {
              gsap.set(el, { clearProps: "transform,opacity" });
            },
          });
        };

        const check = () => {
          if (waiting.size === 0) return;
          const cols = getComputedStyle(list).gridTemplateColumns.split(" ").length || 1;
          const vh = window.innerHeight;
          for (const el of [...waiting]) {
            const r = el.getBoundingClientRect();
            if (r.top < vh * IN_AT && r.bottom > 0) reveal(el, Number(el.dataset.i ?? 0) % cols);
          }
        };

        const showAll = () => {
          for (const el of waiting) gsap.set(el, { clearProps: "transform,opacity" });
          waiting.clear();
        };

        const armNew = () => {
          if (document.visibilityState !== "visible") return;
          for (const el of list.querySelectorAll<HTMLElement>("[data-rv]:not([data-armed])")) {
            el.dataset.armed = "";
            gsap.set(el, { opacity: 0, y: 40 });
            waiting.add(el);
          }
          check();
        };
        arm.current = armNew;
        armNew();

        const onVisibility = () => {
          if (document.visibilityState !== "visible") showAll();
        };
        let acc = 0;
        const off = subscribe(
          (_t, dt) => {
            acc += dt;
            if (acc < SAFETY_MS) return;
            acc = 0;
            check();
          },
          { el: list },
        );
        window.addEventListener("scroll", check, { passive: true });
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
          arm.current = null;
          off();
          window.removeEventListener("scroll", check);
          document.removeEventListener("visibilitychange", onVisibility);
        };
      });
    },
    { scope: grid },
  );

  // Piezas añadidas por el scroll infinito: se arman igual que las primeras.
  // biome-ignore lint/correctness/useExhaustiveDependencies: se re-arma al cambiar el nº de piezas
  useEffect(() => {
    arm.current?.();
  }, [items.length]);

  // Centinela del scroll infinito: se vuelve a observar tras cada carga para no quedarse parado.
  // biome-ignore lint/correctness/useExhaustiveDependencies: se re-observa al cambiar el nº de piezas
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || loadingMore || moreError) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onMore();
      },
      { rootMargin: "700px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loadingMore, moreError, onMore, items.length]);

  return (
    <>
      <ul
        ref={grid}
        className={s.grid}
        data-testid="mk-grid"
        data-cols={view}
        style={{ "--cols": view } as React.CSSProperties}
      >
        {items.map((item, i) => (
          <li key={item.id} className={s.cell} data-rv="" data-i={i}>
            <ProductCard item={item} href={hrefFor(item)} index={i} onOpen={onOpen} />
          </li>
        ))}
        {loadingMore && <GridSkeleton count={4} />}
      </ul>
      {moreError && (
        <p className={s.moreError} role="alert">
          <span>NO HEMOS PODIDO CARGAR MÁS.</span>
          <button type="button" onClick={onMore}>
            REINTENTAR ↻
          </button>
        </p>
      )}
      <div ref={sentinel} className={s.sentinel} aria-hidden="true" />
    </>
  );
}
