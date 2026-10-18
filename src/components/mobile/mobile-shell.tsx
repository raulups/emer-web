"use client";

import type { ReactNode } from "react";
import { BracketLabel } from "@/components/ui/bracket-label";
import { scrollToY } from "@/lib/motion/scroll";
import { AppPrompt } from "./app-prompt";
import styles from "./mobile-shell.module.css";

/**
 * Shell de móvil: en lugar del switch MARKETPLACE / EXPLORA, una sola etiqueta [ MARKETPLACE ]
 * arriba al centro (sube al principio). Los menús van en la barra inferior del Marketplace.
 */
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <button
        type="button"
        className={styles.title}
        aria-label="Marketplace: volver arriba"
        onClick={() => scrollToY(0)}
      >
        <BracketLabel
          label="Marketplace"
          bracketed
          level="full"
          raised={false}
          lined
          origin="right"
        />
      </button>
      <main id="contenido" className={styles.main}>
        {children}
      </main>
      <AppPrompt />
    </div>
  );
}
