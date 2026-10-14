import type { CSSProperties } from "react";
import styles from "./bracket-label.module.css";

/** Retardo por letra del stagger en hover. */
const LETTER_STAGGER_MS = 28;

type Props = {
  label: string;
  /** Muestra los corchetes (se abren desde el texto hacia fuera). */
  bracketed: boolean;
  /** Opacidad de las letras: 40 %, 80 % o 100 %. */
  level: "dim" | "hover" | "full";
  /** Letras a −2px. */
  raised: boolean;
  /** Línea inferior a `scaleX(1)`. */
  lined: boolean;
  /** Lado desde el que crece la línea. */
  origin: "left" | "right";
};

/**
 * Etiqueta del switch y del botón [ MENÚ ]: letras con stagger, corchetes animados y línea
 * inferior. Va dentro de un botón; el texto accesible es `label` (las letras se ocultan).
 */
export function BracketLabel({ label, bracketed, level, raised, lined, origin }: Props) {
  return (
    <span
      className={styles.root}
      data-bracketed={bracketed || undefined}
      data-level={level}
      data-raised={raised || undefined}
      data-lined={lined || undefined}
      data-origin={origin}
    >
      <span className={styles.word}>
        <span className={styles.open} aria-hidden="true">
          [
        </span>
        <span className="sr-only">{label}</span>
        {[...label].map((char, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: las letras de una etiqueta fija no cambian de orden
            key={i}
            className={styles.letter}
            style={{ "--delay": `${i * LETTER_STAGGER_MS}ms` } as CSSProperties}
            aria-hidden="true"
          >
            {char === " " ? " " : char}
          </span>
        ))}
        <span className={styles.close} aria-hidden="true">
          ]
        </span>
      </span>
      <span className={styles.line} aria-hidden="true" />
    </span>
  );
}
