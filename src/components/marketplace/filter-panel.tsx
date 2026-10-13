"use client";

import { type ReactNode, useEffect, useRef } from "react";
import type { ProductFacets } from "@/lib/data";
import { type Filters, SIZE_OPTIONS, SORT_OPTIONS, type Sort, toggle } from "@/lib/marketplace";
import { ExpandableList } from "./expandable-list";
import { BracketChoice, ColorChoice } from "./filter-choices";
import styles from "./filter-panel.module.css";
import { OptionRow } from "./option-row";
import { PriceSlider } from "./price-slider";

type Props = {
  open: boolean;
  filters: Filters;
  colors: ProductFacets["colors"];
  priceRange: { min: number; max: number };
  saleCount: number;
  total: number;
  onChange: (next: Partial<Filters>) => void;
  onClear: () => void;
  onClose: () => void;
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

const FOCUSABLE = 'button:not([disabled]), [tabindex="0"]';

/** Tab y Mayús+Tab dan la vuelta dentro del panel (diálogo modal). */
function trapFocus(event: KeyboardEvent, container: HTMLElement | null) {
  const items = container ? [...container.querySelectorAll<HTMLElement>(FOCUSABLE)] : [];
  const first = items[0];
  const last = items.at(-1);
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && (active === first || !container?.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !container?.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

/** Panel de filtros (README §3): ordenar, talla, precio, color, ofertas, BORRAR y VER n. */
export function FilterPanel(props: Props) {
  const { open, filters, priceRange, onChange, onClose } = props;
  const closeButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") trapFocus(event, drawer.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const lo = filters.lo ?? priceRange.min;
  const hi = filters.hi ?? priceRange.max;
  const setPrice = (nextLo: number, nextHi: number) =>
    onChange({
      lo: nextLo <= priceRange.min ? null : nextLo,
      hi: nextHi >= priceRange.max ? null : nextHi,
    });

  return (
    <>
      <div
        className={styles.overlay}
        data-open={open || undefined}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={drawer}
        className={styles.drawer}
        data-open={open || undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        inert={!open}
      >
        <div className={styles.head}>
          <button
            ref={closeButton}
            type="button"
            className={styles.close}
            aria-label="Cerrar filtros"
            onClick={onClose}
          >
            ×
          </button>
        </div>

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
              gap={18}
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

        <div className={styles.actions}>
          <button type="button" className={styles.clear} onClick={props.onClear}>
            BORRAR
          </button>
          <button type="button" className={styles.apply} onClick={onClose}>
            VER {props.total}
          </button>
        </div>
      </div>
    </>
  );
}
