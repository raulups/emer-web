"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/lib/data";
import { ProductCard } from "./product-card";
import styles from "./product-grid.module.css";

/** La siguiente página se pide antes de llegar al final. */
const LOAD_AHEAD = "0px 0px 1200px 0px";
/** Tarjetas de la primera fila (y algo más): sus fotos cargan con prioridad. */
const EAGER_CARDS = 4;

type Props = {
  items: readonly Product[];
  brandNames: ReadonlyMap<string, string>;
  loading: boolean;
  error: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
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

  if (error) {
    return (
      <div className={styles.message} role="alert">
        <p className={styles.title}>SIN CONEXIÓN</p>
        <p className={styles.text}>No hemos podido cargar los productos.</p>
        <button type="button" className={styles.retry} onClick={props.onRetry}>
          REINTENTAR
        </button>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className={styles.message}>
        <p className={styles.title}>SIN RESULTADOS</p>
        <p className={styles.text}>Prueba con otra talla o quita algún filtro.</p>
      </div>
    );
  }

  return (
    <>
      <ul className={styles.grid} data-loading={loading || undefined} aria-busy={loading}>
        {items.map((product, i) => (
          <li key={product.id}>
            <ProductCard
              product={product}
              brandName={brandNames.get(product.brand_id ?? "") ?? ""}
              eager={i < EAGER_CARDS}
            />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className={styles.sentinel} aria-hidden="true">
        {props.loadingMore && <span className={styles.more}>CARGANDO</span>}
      </div>
    </>
  );
}
