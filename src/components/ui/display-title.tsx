import { type CSSProperties, Fragment } from "react";
import styles from "./type.module.css";

type Props = {
  /** Líneas de palabras; las que empiezan por `*` van en negrita condensada, el resto en serif. */
  lines: readonly (readonly string[])[];
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/**
 * Titular editorial: Instrument Serif y TeX Gyre Heros Condensed Bold en la misma línea, por la
 * línea base y justificadas a todo el ancho. Cada palabra sube desde su máscara cuando el titular
 * o un ancestro lleva `data-in` (lo pone la sección que lo contiene).
 */
export function DisplayTitle({ lines, as: Tag = "h2", className }: Props) {
  let i = 0;
  const label = lines
    .flat()
    .map((word) => word.replace(/^\*/, ""))
    .join(" ");

  return (
    <Tag className={`${styles.display} ${className ?? ""}`} aria-label={label}>
      {lines.map((line) => (
        <Fragment key={line.join(" ")}>
          <span
            className={styles.line}
            data-single={line.length === 1 || undefined}
            aria-hidden="true"
          >
            {line.map((word) => {
              const bold = word.startsWith("*");
              const index = i++;
              return (
                <Fragment key={`${word}-${index}`}>
                  <span className={styles.mask}>
                    <span
                      className={`${styles.word} ${bold ? styles.bold : styles.serif}`}
                      style={{ "--i": index } as CSSProperties}
                    >
                      {bold ? word.slice(1) : word}
                    </span>
                  </span>{" "}
                </Fragment>
              );
            })}
          </span>{" "}
        </Fragment>
      ))}
    </Tag>
  );
}
