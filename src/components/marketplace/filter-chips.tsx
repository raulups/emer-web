import styles from "./filter-chips.module.css";

export type FilterChip = { key: string; label: string; onRemove: () => void };

type Props = {
  chips: readonly FilterChip[];
  /** `bar`: en la barra del grid (una fila). `screen`: pantalla de «sin resultados» (centrado). */
  variant?: "bar" | "screen";
  className?: string;
};

/** Filtros activos: cada uno es una caja con × que lo quita. */
export function FilterChips({ chips, variant = "bar", className }: Props) {
  if (chips.length === 0) return null;
  return (
    <ul
      className={`${styles.chips} ${className ?? ""}`}
      data-variant={variant}
      aria-label="Filtros activos"
    >
      {chips.map((chip) => (
        <li key={chip.key} className={styles.item}>
          <button
            type="button"
            className={styles.chip}
            aria-label={`Quitar ${chip.label}`}
            onClick={chip.onRemove}
          >
            {chip.label}
            <span className={styles.x} aria-hidden="true">
              ×
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
