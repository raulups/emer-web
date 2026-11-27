"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ProductFacets } from "@/lib/data";
import { price } from "@/lib/format";
import { DISCOUNT_OPTIONS, type Filters, SIZE_OPTIONS, toggle } from "@/lib/marketplace";
import styles from "./mobile-filter-fields.module.css";
import { PriceSlider } from "./price-slider";

type Props = {
  filters: Filters;
  colors: ProductFacets["colors"];
  priceRange: { min: number; max: number };
  onChange: (next: Partial<Filters>) => void;
};

function Section({
  id,
  label,
  aside,
  children,
}: {
  id: string;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.head}>
        <h3 id={id} className={styles.label}>
          {label}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Square({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.square}
      data-selected={selected || undefined}
      aria-pressed={selected}
      onClick={onToggle}
    >
      {label}
    </button>
  );
}

/** Colores claros (#f…, #e…) llevan borde negro para que se vean sobre blanco. */
const isLight = (hex: string) => /^#?[ef]/i.test(hex);

/** Hoja de FILTROS del móvil: TALLA, PRECIO, COLOR y DESCUENTO. */
export function MobileFilterFields({ filters, colors, priceRange, onChange }: Props) {
  const lo = filters.lo ?? priceRange.min;
  const hi = filters.hi ?? priceRange.max;
  const setPrice = (nextLo: number, nextHi: number) =>
    onChange({
      lo: nextLo <= priceRange.min ? null : nextLo,
      hi: nextHi >= priceRange.max ? null : nextHi,
    });

  return (
    <div className={styles.fields}>
      <Section id="m-filtro-talla" label="TALLA">
        <div className={styles.row}>
          {SIZE_OPTIONS.map((size) => (
            <Square
              key={size.value}
              label={size.label}
              selected={filters.sizes.includes(size.value)}
              onToggle={() => onChange({ sizes: toggle(filters.sizes, size.value) })}
            />
          ))}
        </div>
      </Section>

      <Section
        id="m-filtro-precio"
        label="PRECIO"
        aside={
          <span className={styles.value} aria-live="polite">
            {price(lo)} — {price(hi)}
          </span>
        }
      >
        <PriceSlider
          min={priceRange.min}
          max={priceRange.max}
          lo={lo}
          hi={hi}
          onChange={setPrice}
          variant="square"
          showValue={false}
        />
      </Section>

      {colors.length > 0 && (
        <Section id="m-filtro-color" label="COLOR">
          <div className={styles.swatches}>
            {colors.map((color) => {
              const hex = color.hex ?? "#fff";
              return (
                <button
                  key={color.name}
                  type="button"
                  className={styles.swatch}
                  style={
                    {
                      "--swatch": hex,
                      "--swatch-border": isLight(hex) ? "var(--black)" : hex,
                    } as CSSProperties
                  }
                  data-selected={filters.colors.includes(color.name) || undefined}
                  aria-pressed={filters.colors.includes(color.name)}
                  aria-label={color.name}
                  title={color.name}
                  onClick={() => onChange({ colors: toggle(filters.colors, color.name) })}
                />
              );
            })}
          </div>
        </Section>
      )}

      <Section id="m-filtro-descuento" label="DESCUENTO">
        <div className={styles.row}>
          {DISCOUNT_OPTIONS.map((option) => (
            <Square
              key={option.value}
              label={option.label}
              selected={filters.discounts.includes(option.value)}
              onToggle={() =>
                onChange({
                  discounts: filters.discounts.includes(option.value)
                    ? filters.discounts.filter((d) => d !== option.value)
                    : [...filters.discounts, option.value],
                })
              }
            />
          ))}
        </div>
      </Section>
    </div>
  );
}
