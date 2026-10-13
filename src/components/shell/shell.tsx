"use client";

import { type ReactNode, useState } from "react";
import styles from "./shell.module.css";
import { type View, ViewSwitch } from "./view-switch";

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
    setView(next);
    setHover(null);
  };

  return (
    <div className={styles.shell}>
      <ViewSwitch view={view} hover={hover} onSelect={select} onHover={setHover} />
      <main id="contenido" className={styles.main} data-view={view}>
        {view === "market" ? marketplace : <div className={styles.bleed}>{explora}</div>}
      </main>
    </div>
  );
}
