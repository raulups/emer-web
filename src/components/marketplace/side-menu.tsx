"use client";

import type { Ref } from "react";
import type { Brand, ProductFacets } from "@/lib/data";
import { BrandCard } from "./brand-card";
import { ExpandableList } from "./expandable-list";
import { OptionRow } from "./option-row";
import styles from "./side-menu.module.css";

type Props = {
  id: string;
  visible: boolean;
  categories: ProductFacets["categories"];
  /** «Ver todo»: productos con el resto de filtros, sin el de categoría. */
  allCount: number;
  brands: readonly Brand[];
  cat: string | null;
  selectedBrands: readonly string[];
  filterCount: number;
  canClear: boolean;
  cardBrand: Brand | null;
  filtersButtonRef: Ref<HTMLButtonElement>;
  onCategory: (id: string | null) => void;
  onToggleBrand: (id: string) => void;
  onHoverBrand: (id: string | null) => void;
  onOpenFilters: () => void;
  onClear: () => void;
};

/** Menú lateral (README §3): categorías y MARCAS (5 filas, «Ver más» abre 8 con scroll), FILTROS (n) + BORRAR y ficha. */
export function SideMenu(props: Props) {
  const { visible, categories, cat, filterCount, canClear, cardBrand } = props;

  return (
    <aside
      id={props.id}
      className={styles.aside}
      data-visible={visible || undefined}
      aria-label="Menú del catálogo"
      inert={!visible}
    >
      <div className={styles.inner} data-lenis-prevent>
        <nav className={styles.group} aria-label="Categorías">
          <OptionRow
            label="Ver todo"
            count={props.allCount}
            selected={cat === null}
            onClick={() => props.onCategory(null)}
          />
          <ExpandableList
            items={categories}
            itemKey={(category) => category.id}
            label="Más categorías"
            gap={14}
            inset
            renderItem={(category) => (
              <OptionRow
                label={category.name}
                count={category.count}
                selected={cat === category.id}
                onClick={() => props.onCategory(category.id)}
              />
            )}
          />
        </nav>

        <ExpandableList
          heading="MARCAS"
          label="Marcas"
          items={props.brands}
          itemKey={(brand) => brand.id}
          gap={14}
          inset
          renderItem={(brand) => (
            <OptionRow
              label={brand.name}
              count={brand.product_count}
              selected={props.selectedBrands.includes(brand.id)}
              multiple
              onClick={() => props.onToggleBrand(brand.id)}
              onMouseEnter={() => props.onHoverBrand(brand.id)}
              onMouseLeave={() => props.onHoverBrand(null)}
            />
          )}
        />

        <div className={styles.filters}>
          <button
            ref={props.filtersButtonRef}
            type="button"
            className={styles.filtersButton}
            aria-haspopup="dialog"
            onClick={props.onOpenFilters}
          >
            FILTROS{filterCount > 0 ? ` (${filterCount})` : ""}
          </button>
          {canClear && (
            <button type="button" className={styles.clear} onClick={props.onClear}>
              BORRAR
            </button>
          )}
        </div>

        <div className={styles.slot}>{cardBrand && <BrandCard brand={cardBrand} />}</div>
      </div>
    </aside>
  );
}
