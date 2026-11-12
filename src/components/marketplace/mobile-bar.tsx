"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import button from "@/components/ui/button.module.css";
import type { Brand, ProductFacets } from "@/lib/data";
import { nextColumns } from "@/lib/grid";
import { type Filters, toggle } from "@/lib/marketplace";
import { BrandGrid } from "./brand-grid";
import { BrandSearch, matchBrands } from "./brand-search";
import { CategoryGrid } from "./category-grid";
import { FilterFields } from "./filter-fields";
import styles from "./mobile-bar.module.css";

export type Sheet = "categories" | "brands" | "filters";

const plural = (n: number, word: string, none: string) =>
  n === 0 ? none : `${n} ${word}${n === 1 ? "" : "S"}`;

type BarProps = {
  /** Nombre de la categoría elegida (null = todas). */
  category: string | null;
  brandCount: number;
  filterCount: number;
  columns: number;
  open: Sheet | null;
  onOpen: (sheet: Sheet) => void;
  onColumns: (columns: number) => void;
};

/**
 * Barra inferior del Marketplace en móvil: CATEGORÍA, MARCAS y FILTROS abren su hoja; el último
 * botón cambia los productos por fila (1 → 2 → 3).
 */
export function MobileBar(props: BarProps) {
  const items: { sheet: Sheet; label: string; value: string; active: boolean }[] = [
    {
      sheet: "categories",
      label: "CATEGORÍA",
      value: props.category ?? "TODO",
      active: props.category !== null,
    },
    {
      sheet: "brands",
      label: "MARCAS",
      value: plural(props.brandCount, "ELEGIDA", "TODAS"),
      active: props.brandCount > 0,
    },
    {
      sheet: "filters",
      label: "FILTROS",
      value: plural(props.filterCount, "ACTIVO", "NINGUNO"),
      active: props.filterCount > 0,
    },
  ];

  return (
    <nav className={styles.bar} aria-label="Catálogo">
      {items.map((item) => (
        <button
          key={item.sheet}
          type="button"
          className={styles.item}
          aria-haspopup="dialog"
          aria-expanded={props.open === item.sheet}
          data-active={item.active || undefined}
          onClick={() => props.onOpen(item.sheet)}
        >
          <span className={styles.label}>{item.label}</span>
          <span className={styles.value}>{item.value}</span>
        </button>
      ))}
      <button
        type="button"
        className={styles.columns}
        aria-label={`Productos por fila: ${props.columns}. Cambiar`}
        onClick={() => props.onColumns(nextColumns("mobile", props.columns))}
      >
        <span className={styles.icon} aria-hidden="true">
          {Array.from({ length: props.columns }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: columnas sin identidad
            <span key={i} className={styles.cell} />
          ))}
        </span>
      </button>
    </nav>
  );
}

type SheetsProps = {
  open: Sheet | null;
  onClose: () => void;
  filters: Filters;
  categories: ProductFacets["categories"];
  allCount: number;
  brands: readonly Brand[];
  colors: ProductFacets["colors"];
  priceRange: { min: number; max: number };
  saleCount: number;
  total: number;
  loading: boolean;
  onChange: (next: Partial<Filters>) => void;
  onClear: () => void;
};

/**
 * Hojas inferiores de la barra: categorías con su icono (elegir cierra), marcas (con buscador) y filtros (VER n
 * cierra).
 */
export function MobileSheets(props: SheetsProps) {
  const { open, onClose, filters, onChange } = props;
  const [query, setQuery] = useState("");
  const brands = matchBrands(props.brands, query);

  const actions = (onClearSection: () => void) => (
    <div className={styles.actions}>
      <button type="button" className={button.box} onClick={onClearSection}>
        BORRAR
      </button>
      <button type="button" className={button.text} onClick={onClose}>
        {props.loading ? "BUSCANDO…" : `VER ${props.total}`}
      </button>
    </div>
  );

  const pick = (cat: string | null) => {
    onChange({ cat });
    onClose();
  };

  return (
    <>
      <BottomSheet open={open === "categories"} onClose={onClose} title="CATEGORÍAS">
        <CategoryGrid
          categories={props.categories}
          allCount={props.allCount}
          selected={filters.cat}
          onPick={pick}
        />
      </BottomSheet>

      <BottomSheet
        open={open === "brands"}
        onClose={onClose}
        title="MARCAS"
        footer={actions(() => onChange({ brands: [] }))}
      >
        <BrandGrid
          variant="sheet"
          brands={brands}
          selected={filters.brands}
          onToggle={(id) => onChange({ brands: toggle(filters.brands, id) })}
          tools={
            <BrandSearch
              value={query}
              onChange={setQuery}
              matches={brands.length}
              variant="sheet"
            />
          }
        />
      </BottomSheet>

      <BottomSheet
        open={open === "filters"}
        onClose={onClose}
        title="FILTROS"
        footer={actions(() => onChange({ sizes: [], colors: [], sale: false, lo: null, hi: null }))}
      >
        <FilterFields
          layout="stacked"
          filters={filters}
          colors={props.colors}
          priceRange={props.priceRange}
          saleCount={props.saleCount}
          onChange={onChange}
        />
      </BottomSheet>
    </>
  );
}
