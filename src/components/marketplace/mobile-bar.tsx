"use client";

import { useRef, useState } from "react";
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
import { useHideOnScroll } from "./use-hide-on-scroll";

export type Sheet = "categories" | "brands" | "filters";

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

type Item = {
  sheet: Sheet;
  /** Lo que se lee en la barra: la etiqueta o, en CATEGORÍA, el tipo elegido. */
  text: string;
  /** Contador (marcas elegidas, filtros activos); 0 = nada. */
  count: number;
  active: boolean;
  /** Nombre accesible completo («MARCAS: 2 elegidas»). */
  label: string;
};

/**
 * Barra inferior del Marketplace en móvil: una pieza negra flotante (con aire a los lados y abajo
 * por las esquinas redondeadas de la pantalla) con CATEGORÍA, MARCAS y FILTROS, que abren su
 * hoja, y el botón de productos por fila (1 → 2 → 3). Una línea por botón: CATEGORÍA enseña el
 * tipo elegido; MARCAS y FILTROS, un contador en un cuadro blanco. Lo activo va subrayado. Se
 * esconde al bajar y vuelve al subir (`useHideOnScroll`); con una hoja abierta, siempre a la vista.
 */
export function MobileBar(props: BarProps) {
  const nav = useRef<HTMLElement>(null);
  useHideOnScroll(nav, props.open !== null);
  const items: Item[] = [
    {
      sheet: "categories",
      text: props.category ?? "CATEGORÍA",
      count: 0,
      active: props.category !== null,
      label: `CATEGORÍA: ${props.category ?? "TODO"}`,
    },
    {
      sheet: "brands",
      text: "MARCAS",
      count: props.brandCount,
      active: props.brandCount > 0,
      label: `MARCAS: ${props.brandCount === 0 ? "TODAS" : `${props.brandCount} ELEGIDAS`}`,
    },
    {
      sheet: "filters",
      text: "FILTROS",
      count: props.filterCount,
      active: props.filterCount > 0,
      label: `FILTROS: ${props.filterCount === 0 ? "NINGUNO" : `${props.filterCount} ACTIVOS`}`,
    },
  ];

  return (
    <nav ref={nav} className={styles.bar} aria-label="Catálogo">
      {items.map((item) => (
        <button
          key={item.sheet}
          type="button"
          className={styles.item}
          aria-haspopup="dialog"
          aria-expanded={props.open === item.sheet}
          aria-label={item.label}
          data-active={item.active || undefined}
          onClick={() => props.onOpen(item.sheet)}
        >
          <span className={styles.text} aria-hidden="true">
            {item.text}
          </span>
          {item.count > 0 && (
            <span key={item.count} className={styles.count} aria-hidden="true">
              {item.count}
            </span>
          )}
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
