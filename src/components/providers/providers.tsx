"use client";

import { type ReactNode, useEffect, useSyncExternalStore } from "react";
import { Cursor } from "@/components/shell/cursor";
import { ScrollTrigger } from "@/lib/gsap";
import { bus } from "@/lib/motion/bus";
import { isReduced, onReducedChange, subscribeReduced } from "@/lib/motion/reduced";
import { initScroll } from "@/lib/motion/scroll";
import { initShortcuts } from "@/lib/motion/shortcuts";
import { setTickerReduced, startTicker } from "@/lib/motion/ticker";

/** Si 01-loader no emite `emer:loaded` en este tiempo, el shell lo fuerza. */
const LOADER_MAX_MS = 5_000;

/**
 * Infraestructura global (vive en el layout y no se desmonta al navegar): ticker, Lenis,
 * atajos del buscador, fin de carga y cursor. Lo que depende del DOM de una página
 * (hero, secciones) lo registra esa página: ver `HomeMotion`.
 */
export function Providers({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);

  useEffect(() => startTicker(), []);

  // Se lee la preferencia dentro del efecto (no el valor del servidor) para no crear
  // Lenis y destruirlo justo después cuando el usuario tiene movimiento reducido.
  useEffect(() => {
    setTickerReduced(isReduced());
    let stopScroll = initScroll({ reduced: isReduced() });
    const offChange = onReducedChange((value) => {
      stopScroll();
      setTickerReduced(value);
      stopScroll = initScroll({ reduced: value });
      ScrollTrigger.refresh();
    });
    return () => {
      offChange();
      stopScroll();
    };
  }, []);

  useEffect(() => initShortcuts(), []);

  useEffect(() => {
    let cancelled = false;
    const offLoaded = bus.onLoaded(() => {
      document.documentElement.classList.remove("is-loading");
      // Un solo refresh, cuando también estén las fuentes.
      (document.fonts?.ready ?? Promise.resolve()).then(() => {
        if (!cancelled) ScrollTrigger.refresh();
      });
    });

    let timeout: number | undefined;
    if (!bus.isLoaded()) {
      // Sin loader en el DOM (aún no existe 01-loader, páginas de error) no hay nada que esperar.
      if (!document.getElementById("loader")) bus.emit("emer:loaded");
      else timeout = window.setTimeout(() => bus.emit("emer:loaded"), LOADER_MAX_MS);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      offLoaded();
    };
  }, []);

  return (
    <>
      {children}
      <Cursor enabled={!reduced} />
    </>
  );
}
