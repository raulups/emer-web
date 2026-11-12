"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BracketLabel } from "@/components/ui/bracket-label";
import { LEGAL_PAGES } from "@/lib/legal";
import { scrollToY } from "@/lib/motion/scroll";
import { AppPrompt } from "./app-prompt";
import styles from "./mobile-shell.module.css";

/**
 * Shell de móvil: en lugar del switch MARKETPLACE / EXPLORA, una sola etiqueta [ MARKETPLACE ]
 * arriba al centro (sube al principio). No es fija: se va con el scroll, igual que la barra de
 * ORDENAR que tiene debajo. Los menús van en la barra inferior del Marketplace.
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
      <footer className={styles.footer}>
        <nav className={styles.legal} aria-label="Información legal">
          {LEGAL_PAGES.map((page) => (
            <Link key={page.href} className={styles.legalLink} href={page.href}>
              {page.label}
            </Link>
          ))}
        </nav>
      </footer>
      <AppPrompt />
    </div>
  );
}
