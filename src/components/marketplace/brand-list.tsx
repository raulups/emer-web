"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import type { Brand } from "@/lib/data";
import styles from "./brand-list.module.css";
import { OptionRow } from "./option-row";

/** Marcas visibles con la lista recogida. */
const VISIBLE = 6;
/** Escalonado de las filas que entran al abrir (máx. 12 pasos). */
const ROW_STAGGER_MS = 35;
const MAX_STAGGER_STEPS = 12;

type Props = {
  brands: readonly Brand[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
};

/** MARCAS: selección múltiple, «Ver más · N» y scroll propio con indicador de 1px. */
export function BrandList({ brands, selected, onToggle, onHover }: Props) {
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLUListElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const extra = brands.length - VISIBLE;

  // Indicador: alto = parte visible, posición = scroll. Se escribe en el DOM, sin estado.
  const syncThumb = useCallback(() => {
    const list = scroller.current;
    const bar = thumb.current;
    if (!list || !bar) return;
    const ratio = list.clientHeight / list.scrollHeight;
    bar.style.height = `${Math.min(1, ratio) * 100}%`;
    bar.style.transform = `translateY(${(list.scrollTop / list.clientHeight) * 100}%)`;
  }, []);

  useEffect(() => {
    if (open) syncThumb();
  }, [open, syncThumb]);

  const toggleOpen = () => {
    if (open) scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
    setOpen(!open);
  };

  return (
    <div className={styles.group}>
      <span className={styles.heading} id="marcas-label">
        MARCAS
      </span>
      <div className={styles.frame} data-open={open || undefined}>
        <ul
          ref={scroller}
          className={styles.list}
          aria-labelledby="marcas-label"
          onScroll={syncThumb}
          onTransitionEnd={syncThumb}
        >
          {brands.map((brand, i) => {
            const hidden = !open && i >= VISIBLE;
            const step = Math.min(i - VISIBLE, MAX_STAGGER_STEPS);
            return (
              <li
                key={brand.id}
                className={styles.item}
                data-hidden={hidden || undefined}
                style={
                  {
                    "--delay": open && i >= VISIBLE ? `${step * ROW_STAGGER_MS}ms` : "0ms",
                  } as CSSProperties
                }
                inert={hidden}
              >
                <OptionRow
                  label={brand.name}
                  count={brand.product_count}
                  selected={selected.includes(brand.id)}
                  multiple
                  onClick={() => onToggle(brand.id)}
                  onMouseEnter={() => onHover(brand.id)}
                  onMouseLeave={() => onHover(null)}
                />
              </li>
            );
          })}
        </ul>
        <span className={styles.track} aria-hidden="true">
          <span ref={thumb} className={styles.thumb} />
        </span>
      </div>
      {extra > 0 && (
        <button type="button" className={styles.more} aria-expanded={open} onClick={toggleOpen}>
          {open ? "Ver menos" : `Ver más · ${extra}`}
        </button>
      )}
    </div>
  );
}
