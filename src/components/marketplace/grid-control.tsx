"use client";

import styles from "./grid-control.module.css";

type Props = {
  options: readonly number[];
  value: number;
  onChange: (columns: number) => void;
};

/** VISTA 2 3 [4] 5 6: productos por fila, fijo arriba a la derecha (espejo de [ MENÚ ]). */
export function GridControl({ options, value, onChange }: Props) {
  return (
    <fieldset className={styles.control}>
      <legend className="sr-only">Productos por fila</legend>
      <span className={styles.label} aria-hidden="true">
        VISTA
      </span>
      {options.map((n) => (
        <button
          key={n}
          type="button"
          className={styles.option}
          aria-pressed={n === value}
          aria-label={`${n} por fila`}
          onClick={() => onChange(n)}
        >
          <span className={styles.bracket} aria-hidden="true">
            [
          </span>
          {n}
          <span className={styles.bracket} aria-hidden="true">
            ]
          </span>
        </button>
      ))}
    </fieldset>
  );
}
