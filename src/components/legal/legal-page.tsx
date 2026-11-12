import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_PAGES, LEGAL_UPDATED } from "@/lib/legal";
import styles from "./legal-page.module.css";

type Props = {
  current: (typeof LEGAL_PAGES)[number]["href"];
  title: string;
  children: ReactNode;
};

/** Plantilla estática de las páginas legales: cabecera, índice entre ellas y texto corrido. */
export function LegalPage({ current, title, children }: Props) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/web">
          EMER
        </Link>
        <nav className={styles.nav} aria-label="Información legal">
          {LEGAL_PAGES.map((page) => (
            <Link
              key={page.href}
              className={styles.navLink}
              href={page.href}
              aria-current={page.href === current ? "page" : undefined}
            >
              {page.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="contenido" className={styles.main}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Última actualización: {LEGAL_UPDATED}</p>
        <div className={styles.body}>{children}</div>
      </main>
    </div>
  );
}
