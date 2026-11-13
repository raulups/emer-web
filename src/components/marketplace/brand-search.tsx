"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import styles from "./brand-search.module.css";

/** Una búsqueda cuenta cuando se deja de escribir un momento. */
const SEARCH_DWELL_MS = 1_200;

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Marcas que coinciden (se enseña junto al campo cuando hay texto). */
  matches: number;
  /** `menu`: menú lateral (compacto); `sheet`: hoja de móvil (más alto). */
  variant?: "menu" | "sheet";
};

/** Buscar marca: campo de 1px de línea; al escribir, la lista se queda con las que coinciden. */
export function BrandSearch({ value, onChange, matches, variant = "menu" }: Props) {
  useEffect(() => {
    const term = value.trim().toLowerCase();
    if (!term) return;
    const timer = window.setTimeout(() => {
      track("search", { term, results_count: matches });
      if (matches === 0) track("search_no_results", { term });
    }, SEARCH_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [value, matches]);

  return (
    <label className={styles.field} data-variant={variant}>
      <span className="sr-only">Buscar marca</span>
      <input
        type="search"
        className={styles.input}
        value={value}
        placeholder="BUSCAR MARCA"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.stopPropagation();
            onChange("");
          }
        }}
      />
      {value && (
        <span className={styles.hint} aria-live="polite">
          {matches}
        </span>
      )}
    </label>
  );
}

/** Marcas cuyo nombre contiene `query` (sin acentos ni mayúsculas); sin texto, todas. */
export function matchBrands<T extends { name: string }>(brands: readonly T[], query: string): T[] {
  const q = fold(query);
  return q ? brands.filter((brand) => fold(brand.name).includes(q)) : [...brands];
}

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
