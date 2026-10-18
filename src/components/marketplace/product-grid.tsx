"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { type CSSProperties, useEffect, useRef } from "react";
import type { Product } from "@/lib/data";
import type { Device } from "@/lib/grid";
import { GridLoader } from "./grid-loader";
import { ProductCard } from "./product-card";
import styles from "./product-grid.module.css";
import { type FilterChip, StateScreen } from "./state-screen";

gsap.registerPlugin(useGSAP, Flip);

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
  /** Palabras del loader (nombres de marca). */
  loaderWords: readonly string[];
  /** Filtros activos, para quitarlos desde la pantalla de «sin resultados». */
  chips: readonly FilterChip[];
  onClear: () => void;
};

export function ProductGrid(props: Props) {
  const { items, brandNames, loading, error, hasMore, onLoadMore } = props;
  const sentinel = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLUListElement>(null);
  // `--cols` que se ve. React lo pinta con este valor (que solo cambia el efecto de abajo, después
  // de medir la disposición anterior: FLIP); así también vale si el grid se vuelve a montar.
  const shownColumns = useRef(props.columns);

  // VISTA: al cambiar los productos por fila, cada pieza visible viaja de su sitio al nuevo
  // (Flip con `scale`: solo transform) y las que entran en pantalla aparecen con un fundido.
  useGSAP(
    () => {
      const el = grid.current;
      const next = props.columns;
      if (!el || shownColumns.current === next) return;
      shownColumns.current = next;
      const apply = () => el.style.setProperty("--cols", String(next));
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        apply();
        return;
      }
      const vh = window.innerHeight;
      const inView = (node: Element) => {
        const rect = node.getBoundingClientRect();
        return rect.bottom > -vh * 0.2 && rect.top < vh * 1.2;
      };
      const before = [...el.children].filter(inView);
      const state = Flip.getState(before);
      apply();
      Flip.from(state, { duration: 0.8, ease: "expo.inOut", scale: true, stagger: 0.008 });
      const fresh = [...el.children].filter((node) => inView(node) && !before.includes(node));
      if (fresh.length > 0) {
        gsap.from(fresh, {
          opacity: 0,
          y: 32,
          duration: 0.7,
          delay: 0.25,
          ease: "expo.out",
          stagger: 0.015,
          clearProps: "opacity,transform",
        });
      }
    },
    { dependencies: [props.columns] },
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
      <div className={styles.wrap} data-loading={loading || undefined}>
        <ul
          ref={grid}
          className={styles.grid}
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
