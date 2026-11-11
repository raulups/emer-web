"use client";

import { type CSSProperties, type ReactNode, useState } from "react";
import { BrandLogo } from "@/components/ui/brand-logo";
import type { Brand } from "@/lib/data";
import styles from "./brand-grid.module.css";

/** Marcas a la vista con la rejilla recogida (tres filas de dos). */
const CLOSED_TILES = 6;
/** Escalonado de las que entran al abrir (máx. 12 pasos). */
const TILE_STAGGER_MS = 30;
const MAX_STAGGER_STEPS = 12;
/** Hueco útil del logo dentro de la casilla (px), por variante. */
const LOGO = { menu: { width: 66, height: 26 }, sheet: { width: 96, height: 36 } } as const;

type Props = {
  brands: readonly Brand[];
  selected: readonly string[];
  onToggle: (id: string) => void;
  onHover?: (id: string | null) => void;
  /** `menu`: menú lateral (6 casillas y «Ver más»). `sheet`: hoja de móvil (todas, más grandes). */
  variant?: "menu" | "sheet";
  /** Todas a la vista, sin «Ver más» (mientras se busca). */
  expanded?: boolean;
  /** Bajo el título: el buscador. */
  tools?: ReactNode;
};

/**
 * MARCAS: rejilla de dos columnas con el logo de cada marca (o su nombre si no tiene) en vez de
 * una lista de nombres. La seleccionada se enciende, su borde pasa a negro y lleva una marca en la
 * esquina. En el menú se ven seis y «Ver más» abre las demás, escalonadas.
 */
export function BrandGrid({
  brands,
  selected,
  onToggle,
  onHover,
  variant = "menu",
  expanded = false,
  tools,
}: Props) {
  const [opened, setOpened] = useState(false);
  const open = opened || expanded || variant === "sheet";
  const extra = brands.length - CLOSED_TILES;
  const logo = LOGO[variant];

  return (
    <div className={styles.group} data-variant={variant} data-open={open || undefined}>
      <span className={styles.heading}>
        MARCAS{selected.length > 0 ? ` · ${selected.length}` : ""}
      </span>
      {tools}
      <fieldset className={styles.grid}>
        <legend className="sr-only">Marcas</legend>
        {brands.map((brand, i) => {
          const hidden = !open && i >= CLOSED_TILES;
          const on = selected.includes(brand.id);
          const step = Math.min(Math.max(0, i - CLOSED_TILES), MAX_STAGGER_STEPS);
          return (
            <button
              key={brand.id}
              type="button"
              className={styles.tile}
              data-selected={on || undefined}
              data-hidden={hidden || undefined}
              aria-pressed={on}
              aria-label={`${brand.name}, ${brand.product_count}`}
              title={brand.name}
              inert={hidden}
              style={
                {
                  "--delay": open && i >= CLOSED_TILES ? `${step * TILE_STAGGER_MS}ms` : "0ms",
                } as CSSProperties
              }
              onClick={() => onToggle(brand.id)}
              onMouseEnter={onHover ? () => onHover(brand.id) : undefined}
              onMouseLeave={onHover ? () => onHover(null) : undefined}
            >
              {brand.logo ? (
                <BrandLogo
                  src={brand.logo}
                  width={logo.width}
                  height={logo.height}
                  className={styles.logo}
                />
              ) : (
                <span className={styles.name} aria-hidden="true">
                  {brand.name}
                </span>
              )}
              <span className={styles.count} aria-hidden="true">
                {brand.product_count}
              </span>
              <span className={styles.mark} aria-hidden="true" />
            </button>
          );
        })}
      </fieldset>
      {variant === "menu" && extra > 0 && !expanded && (
        <button
          type="button"
          className={styles.more}
          aria-expanded={opened}
          onClick={() => setOpened(!opened)}
        >
          {opened ? "Ver menos" : `Ver más · ${extra}`}
        </button>
      )}
    </div>
  );
}
