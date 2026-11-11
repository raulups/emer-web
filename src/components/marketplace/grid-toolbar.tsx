"use client";

import type { Ref } from "react";
import { ScrambleText } from "@/components/ui/scramble-text";
import { SORT_OPTIONS, type Sort } from "@/lib/marketplace";
import { type FilterChip, FilterChips } from "./filter-chips";
import { BracketChoice } from "./filter-choices";
import styles from "./grid-toolbar.module.css";

type Props = {
  ref?: Ref<HTMLDivElement>;
  total: number;
  loading: boolean;
  chips: readonly FilterChip[];
  sort: Sort;
  onSort: (sort: Sort) => void;
  onClear: () => void;
};

const pieces = (n: number) => `${n.toLocaleString("es-ES")} ${n === 1 ? "PIEZA" : "PIEZAS"}`;

/**
 * Barra fija sobre el grid: recuento de piezas (se baraja al cambiar), filtros activos (cada uno
 * se quita con un clic, BORRAR los quita todos) y ORDENAR a un clic. Lo que más se toca al
 * explorar el catálogo, siempre a la vista y sin abrir paneles.
 */
export function GridToolbar({ ref, total, loading, chips, sort, onSort, onClear }: Props) {
  return (
    <div ref={ref} className={styles.bar} data-loading={loading || undefined}>
      <p className={styles.count} aria-live="off">
        <ScrambleText text={loading ? "BUSCANDO…" : pieces(total)} hover={false} view={false} />
      </p>
      <div className={styles.filters}>
        <FilterChips chips={chips} />
        {chips.length > 0 && (
          <button type="button" className={styles.clear} onClick={onClear}>
            BORRAR
          </button>
        )}
      </div>
      <fieldset className={styles.sort}>
        <legend className={styles.sortLabel}>ORDENAR</legend>
        {SORT_OPTIONS.map((option) => (
          <BracketChoice
            key={option.value}
            label={option.short}
            ariaLabel={option.label}
            selected={sort === option.value}
            onToggle={() => onSort(option.value)}
          />
        ))}
      </fieldset>
    </div>
  );
}
