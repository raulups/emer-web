"use client";

import type { ReactNode } from "react";
import type { ProductFacets } from "@/lib/data";
import { type Filters, SIZE_OPTIONS, SORT_OPTIONS, type Sort, toggle } from "@/lib/marketplace";
import { ExpandableList } from "./expandable-list";
import { BracketChoice, ColorChoice } from "./filter-choices";
import styles from "./filter-fields.module.css";
import { OptionRow } from "./option-row";
import { PriceSlider } from "./price-slider";

type Props = {
  filters: Filters;
  colors: ProductFacets["colors"];
  priceRange: { min: number; max: number };
  saleCount: number;
  onChange: (next: Partial<Filters>) => void;
  /** `columns`: etiqueta a la izquierda (panel de escritorio); `stacked`: encima (hoja de móvil). */
  layout?: "columns" | "stacked";
};

function Section({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h3 id={id} className={styles.label}>
        {label}
      </h3>
      <div className={styles.options}>{children}</div>
    </section>
  );
}

/** Campos de filtro (README §3): ordenar, talla, precio, color y ofertas. */
export function FilterFields(props: Props) {
  const { filters, priceRange, onChange } = props;
  const lo = filters.lo ?? priceRange.min;
  const hi = filters.hi ?? priceRange.max;
  const setPrice = (nextLo: number, nextHi: number) =>
    onChange({
      lo: nextLo <= priceRange.min ? null : nextLo,
      hi: nextHi >= priceRange.max ? null : nextHi,
    });

  return (
    <div className={styles.fields} data-layout={props.layout ?? "columns"}>
      <Section id="filtro-orden" label="ORDENAR POR">
        {SORT_OPTIONS.map((option) => (
          <OptionRow
            key={option.value}
            label={option.label}
            variant="panel"
            selected={filters.sort === option.value}
            onClick={() => onChange({ sort: option.value as Sort })}
          />
        ))}
      </Section>

      <Section id="filtro-talla" label="TALLA">
        {SIZE_OPTIONS.map((size) => (
          <BracketChoice
            key={size.value}
            label={size.label}
            selected={filters.sizes.includes(size.value)}
            onToggle={() => onChange({ sizes: toggle(filters.sizes, size.value) })}
          />
        ))}
      </Section>

      <Section id="filtro-precio" label="PRECIO">
        <PriceSlider
          min={priceRange.min}
          max={priceRange.max}
          lo={lo}
          hi={hi}
          onChange={setPrice}
        />
      </Section>

      {props.colors.length > 0 && (
        <Section id="filtro-color" label="COLOR">
          <ExpandableList
            items={props.colors}
            itemKey={(color) => color.name}
            label="Colores"
            gap={14}
            renderItem={(color) => (
              <ColorChoice
                name={color.name}
                hex={color.hex ?? "#fff"}
                selected={filters.colors.includes(color.name)}
                onToggle={() => onChange({ colors: toggle(filters.colors, color.name) })}
              />
            )}
          />
        </Section>
      )}

      <Section id="filtro-ofertas" label="OFERTAS">
        <BracketChoice
          label={`SOLO OFERTAS · ${props.saleCount}`}
          selected={filters.sale}
          onToggle={() => onChange({ sale: !filters.sale })}
        />
      </Section>
    </div>
  );
}
