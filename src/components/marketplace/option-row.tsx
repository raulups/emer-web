import type { MouseEventHandler } from "react";
import styles from "./option-row.module.css";

type Props = {
  label: string;
  selected: boolean;
  onClick: () => void;
  /** Recuento en superíndice (no se subraya). */
  count?: number;
  /** `menu`: menú lateral en mayúsculas; `panel`: ORDENAR POR del panel de filtros. */
  variant?: "menu" | "panel";
  /** Selección múltiple (marcas) o única (categorías, orden). */
  multiple?: boolean;
  onMouseEnter?: MouseEventHandler;
  onMouseLeave?: MouseEventHandler;
};

/**
 * Opción con línea de 18px a la izquierda cuando está seleccionada (0.6s). Hover y selección:
 * negrita 500; en hover además subrayado. La etiqueta reserva su ancho en negrita: no se mueve.
 */
export function OptionRow({
  label,
  selected,
  onClick,
  count,
  variant = "menu",
  multiple = false,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  return (
    <button
      type="button"
      className={styles.row}
      data-variant={variant}
      data-selected={selected || undefined}
      aria-pressed={multiple ? selected : undefined}
      aria-current={!multiple && selected ? "true" : undefined}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className={styles.line} aria-hidden="true" />
      <span className={styles.label} data-text={label}>
        {label}
      </span>
      {count !== undefined && (
        <span className={styles.count}>
          <span className="sr-only">, </span>
          {count}
        </span>
      )}
    </button>
  );
}
