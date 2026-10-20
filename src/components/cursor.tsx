"use client";

import { useEffect, useRef } from "react";
import styles from "./cursor.module.css";

const FINE_POINTER = "(pointer: fine)";
const ACTIVE_CLASS = "has-cursor";

/**
 * Cursor propio global: punto de 12px con `mix-blend-mode: difference` que sigue al ratón.
 * Solo con `pointer: fine`; el cursor del sistema se oculta únicamente mientras este está activo.
 * Sobre un elemento con `data-cursor="logo"` el punto se convierte en el logo de la marca
 * (`data-cursor-logo`, o su nombre en `data-cursor-label` si no tiene logo).
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = dot.current;
    const box = card.current;
    const img = logo.current;
    const text = label.current;
    if (!el || !box || !img || !text) return;
    const root = document.documentElement;
    const query = window.matchMedia(FINE_POINTER);
    let host: Element | null = null;

    const setHost = (next: Element | null) => {
      if (next === host) return;
      host = next;
      const src = next?.getAttribute("data-cursor-logo") ?? "";
      const name = next?.getAttribute("data-cursor-label") ?? "";
      if (src) {
        if (img.getAttribute("src") !== src) img.src = src;
        img.hidden = false;
        text.hidden = true;
      } else {
        img.hidden = true;
        text.hidden = false;
        text.textContent = name;
      }
      el.toggleAttribute("data-logo", next !== null);
      box.toggleAttribute("data-on", next !== null);
    };

    const move = (e: PointerEvent) => {
      const position = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      el.style.transform = position;
      box.style.transform = position;
      el.hidden = false;
      box.hidden = false;
      const target = e.target instanceof Element ? e.target : null;
      setHost(target?.closest('[data-cursor="logo"]') ?? null);
    };
    const hide = () => {
      el.hidden = true;
      box.hidden = true;
      setHost(null);
    };

    const enable = () => {
      root.classList.add(ACTIVE_CLASS);
      window.addEventListener("pointermove", move, { passive: true });
      root.addEventListener("pointerleave", hide);
    };
    const disable = () => {
      root.classList.remove(ACTIVE_CLASS);
      window.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", hide);
      hide();
    };

    const sync = () => (query.matches ? enable() : disable());
    sync();
    query.addEventListener("change", sync);

    return () => {
      query.removeEventListener("change", sync);
      disable();
    };
  }, []);

  // Capa propia en los View Transitions (nombre sin hash de CSS module; reglas en globals.css):
  // el cursor no viaja con el slide del Shell.
  return (
    <>
      <div
        ref={dot}
        className={styles.dot}
        style={{ viewTransitionName: "cursor" }}
        data-cursor
        aria-hidden="true"
        hidden
      />
      <div ref={card} className={styles.logo} aria-hidden="true" hidden>
        <span className={styles.logoCard}>
          {/* biome-ignore lint/performance/noImgElement: logo remoto de la marca, tamaño fijo */}
          <img ref={logo} className={styles.logoImage} alt="" width={96} height={96} hidden />
          <span ref={label} className={styles.logoLabel} hidden />
        </span>
      </div>
    </>
  );
}
