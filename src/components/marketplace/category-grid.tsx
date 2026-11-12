"use client";

import type { CSSProperties } from "react";
import styles from "./category-grid.module.css";
import { categoryIcon } from "./category-icons";

type Category = { id: string; name: string; count: number };

type Props = {
  categories: readonly Category[];
  /** Piezas de todo el catálogo («Ver todo»). */
  allCount: number;
  /** Categoría elegida (null = todas). */
  selected: string | null;
  onPick: (id: string | null) => void;
};

/** Retraso de entrada por casilla (cascada al abrir la hoja). */
const STAGGER_MS = 25;
const MAX_STAGGER_STEPS = 12;

/**
 * Tipos de prenda en la hoja de móvil: cuadrícula de casillas con el icono arriba y el nombre
 * debajo (centrado, en varias líneas si hace falta) y el recuento. La elegida lleva borde negro y la marca de
 * la esquina, como las marcas. El icono se pinta con `mask` sobre `currentColor`.
 */
export function CategoryGrid({ categories, allCount, selected, onPick }: Props) {
  const items = [{ id: null, name: "Ver todo", count: allCount }, ...categories];
  return (
    <nav className={styles.grid} aria-label="Categorías">
      {items.map((item, i) => {
        const on = item.id === selected;
        const icon = item.id === null ? null : categoryIcon(item.name);
        return (
          <button
            key={item.id ?? "all"}
            type="button"
            className={styles.tile}
            data-selected={on || undefined}
            aria-current={on ? "true" : undefined}
            aria-label={`${item.name}, ${item.count}`}
            onClick={() => onPick(item.id)}
            style={
              {
                "--delay": `${Math.min(i, MAX_STAGGER_STEPS) * STAGGER_MS}ms`,
                "--icon": icon ? `url("${icon}")` : undefined,
              } as CSSProperties
            }
          >
            {item.id === null ? (
              <span className={styles.all} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
              </span>
            ) : (
              <span className={styles.icon} data-empty={!icon || undefined} aria-hidden="true" />
            )}
            <span className={styles.name} aria-hidden="true">
              {item.name}
            </span>
            <span className={styles.count} aria-hidden="true">
              {item.count}
            </span>
            <span className={styles.mark} aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
