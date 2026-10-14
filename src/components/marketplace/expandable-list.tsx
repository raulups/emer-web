"use client";

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import styles from "./expandable-list.module.css";

/** Filas visibles con la lista recogida y con la lista abierta (a partir de ahí, scroll). */
const VISIBLE = 5;
const OPEN_ROWS = 8;
/** Escalonado de las filas que entran al abrir (máx. 12 pasos). */
const ROW_STAGGER_MS = 35;
const MAX_STAGGER_STEPS = 12;

type Props<T> = {
  items: readonly T[];
  itemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Nombre accesible de la lista cuando no lleva `heading`. */
  label: string;
  heading?: string;
  /** Separación entre filas, en px. */
  gap: number;
  /** Hueco a la izquierda para la línea de selección (filas de OptionRow). */
  inset?: boolean;
};

/**
 * Lista de 5 filas con «Ver más · N»: al abrir se ven 8, las demás entran escalonadas y se activa el
 * scroll propio con un indicador de 1px. «Ver menos» la recoge y sube suavemente.
 */
export function ExpandableList<T>({
  items,
  itemKey,
  renderItem,
  label,
  heading,
  gap,
  inset = false,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const scroller = useRef<HTMLUListElement>(null);
  const thumb = useRef<HTMLSpanElement>(null);
  const headingId = useId();
  const extra = items.length - VISIBLE;

  // Indicador: alto = parte visible, posición = scroll. Se escribe en el DOM, sin estado.
  const syncThumb = useCallback(() => {
    const list = scroller.current;
    const bar = thumb.current;
    if (!list || !bar) return;
    const scrollable = list.scrollHeight > list.clientHeight + 1;
    bar.style.opacity = scrollable ? "1" : "0";
    bar.style.height = `${Math.min(1, list.clientHeight / list.scrollHeight) * 100}%`;
    bar.style.transform = `translateY(${(list.scrollTop / list.clientHeight) * 100}%)`;
  }, []);

  useEffect(() => {
    const list = scroller.current;
    if (!list) return;
    syncThumb();
    const observer = new ResizeObserver(syncThumb);
    observer.observe(list);
    return () => observer.disconnect();
  }, [syncThumb]);

  const toggleOpen = () => {
    if (open) scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
    setOpen(!open);
  };

  return (
    <div
      className={styles.group}
      data-open={open || undefined}
      style={{ "--gap": `${gap}px`, "--rows": VISIBLE, "--open-rows": OPEN_ROWS } as CSSProperties}
    >
      {heading && (
        <span className={styles.heading} id={headingId}>
          {heading}
        </span>
      )}
      <div className={styles.frame}>
        <ul
          ref={scroller}
          className={styles.list}
          data-lenis-prevent
          data-inset={inset || undefined}
          aria-labelledby={heading ? headingId : undefined}
          aria-label={heading ? undefined : label}
          onScroll={syncThumb}
          onTransitionEnd={syncThumb}
        >
          {items.map((item, i) => {
            const hidden = !open && i >= VISIBLE;
            const step = Math.min(i - VISIBLE, MAX_STAGGER_STEPS);
            return (
              <li
                key={itemKey(item)}
                className={styles.item}
                data-hidden={hidden || undefined}
                style={
                  {
                    "--delay": open && i >= VISIBLE ? `${step * ROW_STAGGER_MS}ms` : "0ms",
                  } as CSSProperties
                }
                inert={hidden}
              >
                {renderItem(item)}
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
