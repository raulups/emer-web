"use client";

import { useEffect, useRef } from "react";
import button from "@/components/ui/button.module.css";
import type { ProductFacets } from "@/lib/data";
import type { Filters } from "@/lib/marketplace";
import { FilterFields } from "./filter-fields";
import styles from "./filter-panel.module.css";

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
        data-lenis-prevent
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

        <FilterFields
          filters={filters}
          colors={props.colors}
          priceRange={priceRange}
          saleCount={props.saleCount}
          onChange={onChange}
        />

        <div className={styles.actions}>
          <button type="button" className={button.box} onClick={props.onClear}>
            BORRAR
          </button>
          <button type="button" className={button.text} onClick={onClose}>
            VER {props.total}
          </button>
        </div>
      </div>
    </>
  );
}
