"use client";

import { useEffect, useRef } from "react";
import styles from "./cursor.module.css";

const FINE_POINTER = "(pointer: fine)";
const ACTIVE_CLASS = "has-cursor";

/**
 * Cursor propio global: punto de 12px con `mix-blend-mode: difference` que sigue al ratón.
 * Solo con `pointer: fine`; el cursor del sistema se oculta únicamente mientras este está activo.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dot.current;
    if (!el) return;
    const root = document.documentElement;
    const query = window.matchMedia(FINE_POINTER);

    const move = (e: PointerEvent) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      el.hidden = false;
    };
    const hide = () => {
      el.hidden = true;
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
    <div
      ref={dot}
      className={styles.dot}
      style={{ viewTransitionName: "cursor" }}
      data-cursor
      aria-hidden="true"
      hidden
    />
  );
}
