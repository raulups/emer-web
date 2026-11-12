"use client";

import { type RefObject, useEffect } from "react";

/** Recorrido mínimo (px) en un sentido antes de esconder o enseñar: evita parpadeos. */
const DELTA = 10;
/** Arriba del todo la barra siempre se ve. */
const TOP_ZONE = 160;
/** Y también al final de la página (para «cargar más» y el pie). */
const BOTTOM_ZONE = 140;

/**
 * Esconde un elemento fijo al bajar y lo enseña al subir (atributo `data-hidden`; la transición
 * es CSS, solo `transform`). Mientras `pinned`, siempre a la vista. Escucha `scroll` (pasivo): no
 * anima por frame, solo cambia el atributo cuando cambia el sentido.
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
      const nearEnd = y + window.innerHeight >= document.documentElement.scrollHeight - BOTTOM_ZONE;
      if (pinned || y < TOP_ZONE || nearEnd) {
        set(false);
        last = y;
        return;
      }
      if (Math.abs(y - last) < DELTA) return;
      set(y > last);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      delete el.dataset.hidden;
    };
  }, [ref, pinned]);
}
