"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import type { Device } from "@/lib/grid";
import { GridLoader } from "./grid-loader";
import { animateColumns, animateResults } from "./grid-motion";
import { ProductCard, type ProductOpen } from "./product-card";
import styles from "./product-grid.module.css";
import { type FilterChip, StateScreen } from "./state-screen";

gsap.registerPlugin(useGSAP);

/** La siguiente página se pide antes de llegar al final. */
const LOAD_AHEAD = "0px 0px 1200px 0px";
/** El loader solo sale si la respuesta tarda más que esto: con caché, el cambio es directo. */
const LOADER_DELAY_MS = 320;

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
  /** Palabras del loader (nombres de marca). */
  loaderWords: readonly string[];
  /** Filtros activos, para quitarlos desde la pantalla de «sin resultados». */
  chips: readonly FilterChip[];
  onClear: () => void;
  /** Abrir el detalle de una pieza (popup). */
  onOpen: ProductOpen;
  /** Borde inferior de lo que tapa el grid por arriba (la barra fija): referencia de VISTA. */
  anchorTop: () => number;
};

export function ProductGrid(props: Props) {
  const { items, brandNames, loading, error, hasMore, onLoadMore, anchorTop } = props;
  const sentinel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  // `--cols` que se ve. React lo pinta con este valor (que solo cambia el efecto de abajo, después
  // de medir la disposición anterior: FLIP); así también vale si el grid se vuelve a montar.
  const shownColumns = useRef(props.columns);

  // VISTA: al cambiar los productos por fila, las fotos viajan de su sitio al nuevo y la primera
  // fila visible se queda donde estaba (`grid-motion.ts`).
  useGSAP(
    () => {
      const el = grid.current;
      const next = props.columns;
      if (!el || shownColumns.current === next) return;
      shownColumns.current = next;
      animateColumns(el, () => el.style.setProperty("--cols", String(next)), anchorTop());
    },
    { dependencies: [props.columns] },
  );

  // Loader solo si la respuesta tarda (con caché, el cambio es directo); mientras, el grid se
  // atenúa un poco. Al llegar resultados nuevos, las tarjetas a la vista entran escalonadas.
  const [showLoader, setShowLoader] = useState(false);
  useEffect(() => {
    if (!loading) {
      setShowLoader(false);
      return;
    }
    const timer = window.setTimeout(() => setShowLoader(true), LOADER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loading]);
  const wasLoading = useRef(false);
  useGSAP(
    () => {
      const el = grid.current;
      if (wasLoading.current && !loading && el) animateResults(el);
      wasLoading.current = loading;
    },
    { dependencies: [loading] },
  );

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
      <div
        className={styles.wrap}
        data-loading={showLoader || undefined}
        data-pending={(loading && !showLoader) || undefined}
      >
        <ul
          ref={grid}
          className={styles.grid}
          data-grid
          data-device={props.device}
          style={{ "--cols": shownColumns.current } as CSSProperties}
          aria-busy={loading}
        >
          {items.map((product, i) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                brandName={brandNames.get(product.brand_id ?? "") ?? ""}
                // La primera fila carga sus fotos con prioridad (LCP).
                eager={i < props.columns}
                onOpen={props.onOpen}
              />
            </li>
          ))}
        </ul>
        {showLoader && (
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
