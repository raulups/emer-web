"use client";

import { type CSSProperties, useEffect, useRef } from "react";
import type { Product } from "@/lib/data";
import type { Device } from "@/lib/grid";
import { GridLoader } from "./grid-loader";
import { ProductCard } from "./product-card";
import styles from "./product-grid.module.css";
import { type FilterChip, StateScreen } from "./state-screen";

/** La siguiente página se pide antes de llegar al final. */
const LOAD_AHEAD = "0px 0px 1200px 0px";

type Props = {
  items: readonly Product[];
  brandNames: ReadonlyMap<string, string>;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  device: Device;
  /** Productos por fila (si caben: con poco ancho, menos). */
  columns: number;
  /** Palabras del loader (las categorías). */
  loaderWords: readonly string[];
  /** Filtros activos, para quitarlos desde la pantalla de «sin resultados». */
  chips: readonly FilterChip[];
  onClear: () => void;
};

export function ProductGrid(props: Props) {
  const { items, brandNames, loading, error, hasMore, onLoadMore } = props;
  const sentinel = useRef<HTMLDivElement>(null);

  // Se vuelve a observar con cada página: si el final sigue a la vista, pide la siguiente.
  const count = items.length;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || count === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: LOAD_AHEAD },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, count]);

  if (error) return <StateScreen kind="error" onRetry={props.onRetry} />;

  if (items.length === 0 && !loading) {
    return <StateScreen kind="empty" chips={props.chips} onClear={props.onClear} />;
  }

  return (
    <>
      <div className={styles.wrap} data-loading={loading || undefined}>
        <ul
          className={styles.grid}
          data-device={props.device}
          style={{ "--cols": props.columns } as CSSProperties}
          aria-busy={loading}
        >
          {items.map((product, i) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                brandName={brandNames.get(product.brand_id ?? "") ?? ""}
                // La primera fila carga sus fotos con prioridad (LCP).
                eager={i < props.columns}
              />
            </li>
          ))}
        </ul>
        {loading && (
          <div className={styles.loaderLayer}>
            <div className={styles.loaderSticky}>
              <GridLoader words={props.loaderWords} />
            </div>
          </div>
        )}
      </div>
      <div ref={sentinel} className={styles.sentinel} aria-hidden="true">
        {props.loadingMore && (
          <span className={styles.more}>
            MÁS PIEZAS
            <span className={styles.moreLine} />
          </span>
        )}
      </div>
    </>
  );
}
