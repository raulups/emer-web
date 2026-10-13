import type { CSSProperties } from "react";
import styles from "./filter-choices.module.css";

type BracketChoiceProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
};

/** TALLA / OFERTAS: la opción seleccionada va entre corchetes que se abren hacia fuera. */
export function BracketChoice({ label, selected, onToggle }: BracketChoiceProps) {
  return (
    <button
      type="button"
      className={styles.choice}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onToggle}
    >
      <span className={styles.open} aria-hidden="true">
        [
      </span>
      <span className={styles.label} data-text={label}>
        {label}
      </span>
      <span className={styles.close} aria-hidden="true">
        ]
      </span>
    </button>
  );
}

type ColorChoiceProps = {
  name: string;
  hex: string;
  selected: boolean;
  onToggle: () => void;
};

/** Colores claros (#f…, #e…) llevan borde negro para que se vean sobre blanco. */
function isLight(hex: string): boolean {
  return /^#?[ef]/i.test(hex);
}

/** COLOR: cuadrado de 10px; seleccionado, outline a 3px y escala 1.1. */
export function ColorChoice({ name, hex, selected, onToggle }: ColorChoiceProps) {
  return (
    <button
      type="button"
      className={styles.color}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onToggle}
    >
      <span
        className={styles.swatch}
        style={{ "--swatch": hex, "--swatch-border": isLight(hex) ? "#000" : hex } as CSSProperties}
        aria-hidden="true"
      />
      <span className={styles.label} data-text={name}>
        {name}
      </span>
    </button>
  );
}
