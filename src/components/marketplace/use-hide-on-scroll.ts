"use client";

import { type RefObject, useEffect } from "react";
import { getLenis } from "@/lib/motion/scroll";

/** Recorrido mínimo (px) en un sentido antes de esconder o enseñar: evita parpadeos. */
const DELTA = 8;
/** Hasta aquí la barra siempre se ve. */
const TOP_ZONE = 80;

/**
 * Esconde un elemento fijo al bajar y lo enseña al subir (atributo `data-hidden`; la transición
 * es CSS, solo `transform`). Mientras `pinned`, siempre a la vista. Con Lenis escucha su evento de
 * scroll; sin él, `scroll` (pasivo). No anima por frame: solo cambia el atributo con el sentido.
 */
export function useHideOnScroll(ref: RefObject<HTMLElement | null>, pinned: boolean): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = window.scrollY;
    let hidden = false;
    const set = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      if (next) el.dataset.hidden = "";
      else delete el.dataset.hidden;
    };
    const onScroll = () => {
      const y = window.scrollY;
      if (pinned || y <= TOP_ZONE) {
        set(false);
        last = y;
        return;
      }
      if (Math.abs(y - last) < DELTA) return;
      set(y > last);
      last = y;
    };
    onScroll();
    const lenis = getLenis();
    const off = lenis
      ? lenis.on("scroll", onScroll)
      : (() => {
          window.addEventListener("scroll", onScroll, { passive: true });
          return () => window.removeEventListener("scroll", onScroll);
        })();
    return () => {
      off();
      delete el.dataset.hidden;
    };
  }, [ref, pinned]);
}
