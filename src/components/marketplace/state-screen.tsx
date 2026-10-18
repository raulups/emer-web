"use client";

import type { CSSProperties } from "react";
import button from "@/components/ui/button.module.css";
import styles from "./state-screen.module.css";

export type FilterChip = { key: string; label: string; onRemove: () => void };

type Props =
  | { kind: "empty"; chips: readonly FilterChip[]; onClear: () => void }
  | { kind: "error"; onRetry?: () => void; heading?: "h1" | "h2" };

const MARQUEE_REPEAT = 4;

/**
 * Pantallas del Marketplace sin productos. Vacío: un 0 gigante en contorno, los filtros activos
 * (cada uno se quita aparte) y BORRAR FILTROS. Error: SIN CONEXIÓN en una cinta que corre y
 * REINTENTAR. Entradas y cinta solo con `transform`/`opacity`; sin movimiento, estáticas.
 */
export function StateScreen(props: Props) {
  if (props.kind === "empty") {
    return (
      <div className={styles.screen} data-kind="empty" role="status">
        <span className={styles.zero} aria-hidden="true">
          0
        </span>
        <div className={styles.copy}>
          <p className={styles.eyebrow} style={delay(0)}>
            SIN RESULTADOS
          </p>
          <h2 className={styles.title} style={delay(1)}>
            NADA POR AQUÍ
          </h2>
          <p className={styles.text} style={delay(2)}>
            Prueba con otra talla o quita algún filtro.
          </p>
          {props.chips.length > 0 && (
            <ul className={styles.chips} style={delay(3)} aria-label="Filtros activos">
              {props.chips.map((chip) => (
                <li key={chip.key}>
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
          )}
          <button
            type="button"
            className={`${button.box} ${styles.primary}`}
            style={delay(4)}
            onClick={props.onClear}
          >
            BORRAR FILTROS
          </button>
        </div>
      </div>
    );
  }

  const Heading = props.heading ?? "h2";
  const retry = props.onRetry ?? (() => window.location.reload());
  const band = Array.from({ length: MARQUEE_REPEAT }, (_, i) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: copias fijas de la misma frase
    <span key={i} className={styles.phrase}>
      SIN CONEXIÓN <span className={styles.sep}>✕</span>
    </span>
  ));

  return (
    <div className={styles.screen} data-kind="error" role="alert">
      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.band}>
          {band}
          {band}
        </div>
      </div>
      <div className={styles.copy}>
        <Heading className={styles.title} style={delay(0)}>
          SIN CONEXIÓN
        </Heading>
        <p className={styles.text} style={delay(1)}>
          No hemos podido cargar los productos. Si el servidor estaba dormido, tarda unos segundos
          en despertar.
        </p>
        <button type="button" className={styles.primary} style={delay(2)} onClick={retry}>
          REINTENTAR
        </button>
      </div>
    </div>
  );
}

const delay = (step: number) => ({ "--step": step }) as CSSProperties;
