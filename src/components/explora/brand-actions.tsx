"use client";

import Link from "next/link";
import { type MouseEvent, type PointerEvent, useRef } from "react";
import { bus } from "@/lib/bus";
import type { ExploraBrand } from "@/lib/explora-data";
import styles from "./brand-actions.module.css";

/** Más de esto entre pulsar y soltar es un arrastre, no un clic. */
const DRAG_PX = 8;

/**
 * Qué botones lleva una marca (regla única para todos los carruseles de Explora):
 * «Ver marca» si tiene productos; «Ir a la tienda» si tiene web. El que quede es el principal.
 */
export function brandActions(brand: Pick<ExploraBrand, "count" | "url">) {
  const market = (brand.count ?? 0) > 0;
  const store = Boolean(brand.url);
  return { market, store, primary: market ? "market" : store ? "store" : null } as const;
}

type Props = {
  brand: Pick<ExploraBrand, "id" | "name" | "count" | "url">;
  /** `line`: sobre fondo blanco (Populares, Emergentes). `overlay`: sobre la foto (Catálogo). */
  tone?: "line" | "overlay";
  className?: string;
};

/**
 * Botones de una marca: «Ver marca» (Marketplace filtrado por la marca) e «Ir a la tienda» (su
 * web, en otra pestaña). Mismo alto con uno, dos o ningún botón, para que el carrusel no salte.
 */
export function BrandActions({ brand, tone = "line", className }: Props) {
  const { market, store, primary } = brandActions(brand);
  const down = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (event: PointerEvent) => {
    down.current = { x: event.clientX, y: event.clientY };
  };
  /** Un arrastre (selección, swipe con ratón) que acaba sobre el botón no navega. */
  const dragged = (event: MouseEvent) => {
    const start = down.current;
    down.current = null;
    return (
      start !== null &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_PX &&
      event.detail > 0
    );
  };

  // «Ver marca»: el href es la URL real (nueva pestaña, sin JS). Un clic normal cambia de vista
  // dentro del Shell y aplica el filtro: navegar de /web a /web?brand= dejaría el Shell en Explora.
  const openMarketplace = (event: MouseEvent<HTMLAnchorElement>) => {
    if (dragged(event)) {
      event.preventDefault();
      return;
    }
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    bus.emit("market:filters", { brands: [brand.id] });
    bus.emit("view", "market");
  };
  const openStore = (event: MouseEvent<HTMLAnchorElement>) => {
    if (dragged(event)) event.preventDefault();
  };

  return (
    <div
      className={`${styles.actions} ${className ?? ""}`}
      data-tone={tone}
      data-empty={primary === null || undefined}
    >
      {market && (
        <Link
          className={styles.button}
          data-primary={primary === "market" || undefined}
          href={`/marketplace?brand=${brand.id}`}
          draggable={false}
          onPointerDown={onPointerDown}
          onClick={openMarketplace}
        >
          Ver marca
        </Link>
      )}
      {store && brand.url && (
        <a
          className={styles.button}
          data-primary={primary === "store" || undefined}
          href={brand.url}
          target="_blank"
          rel="noopener noreferrer"
          draggable={false}
          onPointerDown={onPointerDown}
          onClick={openStore}
        >
          <span className={styles.storeText}>Ir a la tienda</span>
          <span className="sr-only"> de {brand.name} (se abre en otra pestaña)</span>
          <svg
            className={styles.icon}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <path d="M5 11 11 5M6 5h5v5" />
          </svg>
        </a>
      )}
    </div>
  );
}
