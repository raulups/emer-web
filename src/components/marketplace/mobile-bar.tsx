"use client";

import { type ReactNode, useRef, useState } from "react";
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
  /** Texto bajo el icono: fijo, o lo elegido (la categoría). */
  text: string;
  /** Contador (marcas elegidas, filtros activos); 0 = nada. */
  count: number;
  active: boolean;
  /** Nombre accesible completo («MARCAS: 2 elegidas»). */
  label: string;
  icon: ReactNode;
};

/** Iconos de trazo fino (24×24, `currentColor`). */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.svg}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="square"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICONS = {
  categories: (
    <Icon>
      <rect x="4" y="4" width="6.5" height="6.5" />
      <rect x="13.5" y="4" width="6.5" height="6.5" />
      <rect x="4" y="13.5" width="6.5" height="6.5" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" />
    </Icon>
  ),
  brands: (
    <Icon>
      <path d="M4 4h8l8 8-8 8-8-8z" />
      <circle cx="8.5" cy="8.5" r="1.2" />
    </Icon>
  ),
  filters: (
    <Icon>
      <path d="M4 7h16M4 17h16" />
      <rect x="7" y="5" width="3" height="4" fill="var(--paper)" />
      <rect x="14" y="15" width="3" height="4" fill="var(--paper)" />
    </Icon>
  ),
} as const;

/**
 * Barra inferior del Marketplace en móvil: navegación pegada al borde de abajo (con el hueco de la
 * zona segura), fondo blanco y una línea fina arriba. CATEGORÍA, MARCAS y FILTROS abren su hoja;
 * cada botón es un icono con su texto debajo. Lo elegido pasa a tinta (la categoría enseña su
 * nombre) y los contadores van en una pastilla sobre el icono; la hoja abierta se marca con una
 * raya arriba. El último botón cambia los productos por fila (1 → 2 → 3). Se esconde al bajar y
 * vuelve al subir (`useHideOnScroll`); con una hoja abierta, siempre a la vista.
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
      icon: ICONS.categories,
    },
    {
      sheet: "brands",
      text: "MARCAS",
      count: props.brandCount,
      active: props.brandCount > 0,
      label: `MARCAS: ${props.brandCount === 0 ? "TODAS" : `${props.brandCount} ELEGIDAS`}`,
      icon: ICONS.brands,
    },
    {
      sheet: "filters",
      text: "FILTROS",
      count: props.filterCount,
      active: props.filterCount > 0,
      label: `FILTROS: ${props.filterCount === 0 ? "NINGUNO" : `${props.filterCount} ACTIVOS`}`,
      icon: ICONS.filters,
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
          <span className={styles.glyph} aria-hidden="true">
            {item.icon}
            {item.count > 0 && (
              <span key={item.count} className={styles.count}>
                {item.count}
              </span>
            )}
          </span>
          <span className={styles.text} aria-hidden="true">
            {item.text}
          </span>
        </button>
      ))}
      <button
        type="button"
        className={styles.item}
        aria-label={`Productos por fila: ${props.columns}. Cambiar`}
        onClick={() => props.onColumns(nextColumns("mobile", props.columns))}
      >
        <span className={styles.glyph} aria-hidden="true">
          <span className={styles.grid}>
            {Array.from({ length: props.columns }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: columnas sin identidad
              <span key={i} className={styles.cell} />
            ))}
          </span>
        </span>
        <span className={styles.text} aria-hidden="true">
          VISTA {props.columns}
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
        footer={actions(() =>
          onChange({ gender: null, sizes: [], colors: [], sale: false, lo: null, hi: null }),
        )}
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
