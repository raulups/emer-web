"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
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

/** Colores en una fila (caben en 360px con VER MÁS); el resto, al abrir. */
const COLORS_VISIBLE = 8;

/** Colores claros (#f…, #e…) llevan borde negro para que se vean sobre blanco. */
const isLight = (hex: string) => /^#?[ef]/i.test(hex);

/** Hoja de FILTROS del móvil: TALLA, PRECIO, COLOR y DESCUENTO. */
export function MobileFilterFields({ filters, colors, priceRange, onChange }: Props) {
  // Un color elegido entre los ocultos abre la lista para que se vea marcado.
  const [moreColors, setMoreColors] = useState(() =>
    colors.slice(COLORS_VISIBLE).some((c) => filters.colors.includes(c.name)),
  );
  const shownColors = moreColors ? colors : colors.slice(0, COLORS_VISIBLE);
  const hiddenColors = colors.length - COLORS_VISIBLE;
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
            {shownColors.map((color) => {
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
            {hiddenColors > 0 && (
              <button
                type="button"
                className={styles.more}
                aria-expanded={moreColors}
                onClick={() => setMoreColors(!moreColors)}
              >
                {moreColors ? "VER MENOS" : `VER MÁS · ${hiddenColors}`}
              </button>
            )}
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
