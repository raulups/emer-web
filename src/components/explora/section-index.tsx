import { ScrambleText } from "@/components/ui/scramble-text";
import styles from "./section-index.module.css";

export type IndexItem = { id: string; label: string };

/**
 * Índice discreto de Explora, fijo a la derecha: casi transparente hasta que se pasa el ratón o el
 * foco entra. El bucle de `explora.tsx` marca la sección actual (`data-on`) y hace el scroll al
 * pulsar (`data-go` con el id de la sección).
 */
export function SectionIndex({ items }: { items: readonly IndexItem[] }) {
  return (
    <nav className={styles.index} data-index aria-label="Secciones de Explora">
      <ol className={styles.list}>
        {items.map((item, i) => (
          <li key={item.id}>
            <button type="button" className={styles.item} data-go={item.id} data-scramble-hover>
              <ScrambleText text={item.label} view={false} className={styles.label} />
              <span className={styles.num} aria-hidden="true">
                A — {i + 1}
              </span>
              <span className={styles.tick} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
