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
import styles from "./mobile-bar.module.css";
import { MobileFilterFields } from "./mobile-filter-fields";
import { useHideOnScroll } from "./use-hide-on-scroll";

export type Sheet = "categories" | "brands" | "filters";

type BarProps = {
  /** Nombre de la categoría elegida (null = todas). */
  category: string | null;
  brandCount: number;
  filterCount: number;
  /** Hay algún filtro (categoría, marcas o filtros): enseña LIMPIAR FILTROS. */
  canClear: boolean;
  columns: number;
  open: Sheet | null;
  onOpen: (sheet: Sheet) => void;
  onColumns: (columns: number) => void;
  onClear: () => void;
};

type Item = {
  sheet: Sheet;
  text: string;
  /** Filtros activos del grupo; 0 = nada. */
  count: number;
  /** Nombre accesible completo («MARCAS: 2 elegidas»). */
  label: string;
};

/**
 * Barra de filtros flotante del Marketplace en móvil: caja blanca con borde negro, separada de los
 * lados y del borde de abajo. CATEGORÍA, MARCAS y FILTROS (mismo ancho) abren su hoja; con
 * filtros activos, el texto va en negrita con un cuadrado negro con el número. A la derecha,
 * VISTA alterna 1 ↔ 2 columnas. Encima, LIMPIAR FILTROS si hay alguno. Todo se esconde al bajar
 * y vuelve al subir (`useHideOnScroll`); con una hoja abierta, siempre a la vista.
 */
export function MobileBar(props: BarProps) {
  const dock = useRef<HTMLDivElement>(null);
  useHideOnScroll(dock, props.open !== null);
  const items: Item[] = [
    {
      sheet: "categories",
      text: "CATEGORÍA",
      count: props.category ? 1 : 0,
      label: `CATEGORÍA: ${props.category ?? "TODO"}`,
    },
    {
      sheet: "brands",
      text: "MARCAS",
      count: props.brandCount,
      label: `MARCAS: ${props.brandCount === 0 ? "TODAS" : `${props.brandCount} ELEGIDAS`}`,
    },
    {
      sheet: "filters",
      text: "FILTROS",
      count: props.filterCount,
      label: `FILTROS: ${props.filterCount === 0 ? "NINGUNO" : `${props.filterCount} ACTIVOS`}`,
    },
  ];

  return (
    <div ref={dock} className={styles.dock}>
      {props.canClear && (
        <button type="button" className={styles.clear} onClick={props.onClear}>
          LIMPIAR FILTROS
        </button>
      )}
      <nav className={styles.bar} aria-label="Catálogo">
        {items.map((item) => (
          <button
            key={item.sheet}
            type="button"
            className={styles.item}
            aria-haspopup="dialog"
            aria-expanded={props.open === item.sheet}
            aria-label={item.label}
            data-active={item.count > 0 || undefined}
            onClick={() => props.onOpen(item.sheet)}
          >
            <span aria-hidden="true">{item.text}</span>
            {item.count > 0 && (
              <span key={item.count} className={styles.count} aria-hidden="true">
                {item.count}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          className={styles.view}
          aria-label="Cambiar vista"
          onClick={() => props.onColumns(nextColumns("mobile", props.columns))}
        >
          {props.columns === 1 ? (
            <span className={styles.cell} data-wide="" aria-hidden="true" />
          ) : (
            <>
              <span className={styles.cell} aria-hidden="true" />
              <span className={styles.cell} aria-hidden="true" />
            </>
          )}
        </button>
      </nav>
    </div>
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
  total: number;
  loading: boolean;
  onChange: (next: Partial<Filters>) => void;
};

const pieces = (n: number) => `VER ${n.toLocaleString("es-ES")} ${n === 1 ? "PIEZA" : "PIEZAS"}`;

/**
 * Hojas inferiores de la barra: categorías con su icono (elegir cierra), marcas (con buscador) y
 * filtros (TALLA, PRECIO, COLOR, DESCUENTO; VER n PIEZAS cierra).
 */
export function MobileSheets(props: SheetsProps) {
  const { open, onClose, filters, onChange } = props;
  const [query, setQuery] = useState("");
  const brands = matchBrands(props.brands, query);
  const seeLabel = props.loading ? "BUSCANDO…" : `VER ${props.total}`;

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
        footer={
          <div className={styles.actions}>
            <button type="button" className={button.box} onClick={() => onChange({ brands: [] })}>
              BORRAR
            </button>
            <button type="button" className={button.text} onClick={onClose}>
              {seeLabel}
            </button>
          </div>
        }
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
        footer={
          <div className={styles.panelActions}>
            <button
              type="button"
              className={styles.reset}
              onClick={() =>
                onChange({
                  gender: null,
                  sizes: [],
                  colors: [],
                  sale: false,
                  discounts: [],
                  lo: null,
                  hi: null,
                })
              }
            >
              LIMPIAR
            </button>
            <button type="button" className={styles.see} onClick={onClose}>
              {props.loading ? "BUSCANDO…" : pieces(props.total)}
            </button>
          </div>
        }
      >
        <MobileFilterFields
          filters={filters}
          colors={props.colors}
          priceRange={props.priceRange}
          onChange={onChange}
        />
      </BottomSheet>
    </>
  );
}
