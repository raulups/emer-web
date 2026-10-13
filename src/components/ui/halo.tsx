import type { CSSProperties } from "react";
import styles from "./halo.module.css";

/**
 * Halo blur detrás de textos fijos sobre contenido (README → Recursos comunes).
 * El padre necesita `position` e `isolation: isolate`. `spread`: extensión lateral en px.
 */
export function Halo({ spread = 110 }: { spread?: number }) {
  return (
    <div
      className={styles.halo}
      style={{ "--halo-spread": `${spread}px` } as CSSProperties}
      aria-hidden="true"
    />
  );
}
