"use client";

import { type ReactNode, useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { bus } from "@/lib/bus";
import { scrollToY } from "@/lib/motion/scroll";
import styles from "./shell.module.css";
import { type View, ViewSwitch } from "./view-switch";

type Direction = "forward" | "back";

/**
 * Cambio de vista con slide horizontal: View Transitions (el navegador anima las capturas de la
 * vista saliente y la entrante con transform). Sin soporte o con «reducir movimiento», cambia sin
 * animar. Las reglas del slide están en `globals.css` (`html[data-slide]`).
 */
function slide(direction: Direction, change: () => void) {
  const root = document.documentElement;
  const transition = document.startViewTransition?.bind(document);
  if (!transition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    change();
    return;
  }
  root.dataset.slide = direction;
  transition(() => flushSync(change)).finished.finally(() => {
    delete root.dataset.slide;
  });
}

type Props = {
  marketplace: ReactNode;
  explora: ReactNode;
};

/**
 * Shell de la web (README §2). Abre en MARKETPLACE; EXPLORA va a sangre (sube los 76px del shell).
 * Las vistas llegan como slots para que puedan ser componentes de servidor.
 */
export function Shell({ marketplace, explora }: Props) {
  const [view, setView] = useState<View>("market");
  const [hover, setHover] = useState<View | null>(null);

  const select = (next: View) => {
    if (next === view) return;
    const change = () => {
      setView(next);
      setHover(null);
      scrollToY(0, { immediate: true });
    };
    slide(next === "explora" ? "forward" : "back", change);
  };

  // Enlaces de otras secciones (footer): cambian de vista o, en la misma, suben al principio.
  useEffect(() =>
    bus.on("view", (next) => {
      if (next !== view) select(next);
      else scrollToY(0);
    }),
  );

  return (
    <div className={styles.shell}>
      <ViewSwitch view={view} hover={hover} onSelect={select} onHover={setHover} />
      <main id="contenido" className={styles.main} data-view={view}>
        {view === "market" ? marketplace : <div className={styles.bleed}>{explora}</div>}
      </main>
    </div>
  );
}
