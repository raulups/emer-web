"use client";

import { useEffect, useRef } from "react";
import { observe } from "@/lib/motion/in-view";

/**
 * Línea en bucle del diseño (keyframes `emLine` en globals.css). Es un bucle CSS del compositor:
 * no pasa por el ticker. Se pausa fuera de pantalla y con movimiento reducido queda fija.
 */
export function LoopLine({ width, className = "" }: { width: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return observe(el, (visible) => {
      el.toggleAttribute("data-paused", !visible);
    });
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden="true"
      data-paused=""
      className={`loop-line ${className}`}
      style={{ width }}
    />
  );
}
