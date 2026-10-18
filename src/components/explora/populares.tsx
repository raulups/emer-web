"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import type { ExploraBrand } from "@/lib/explora-data";
import { isSectionTag } from "@/lib/explora-tags";
import { price } from "@/lib/format";
import { pad } from "@/lib/motion/math";
import { BrandActions } from "./brand-actions";
import { BrandImage } from "./brand-image";
import styles from "./explora.module.css";
import { NoStock } from "./no-stock";

/** «Estilo. etiquetas, sin repetir el estilo. Desde AAAA.» (README §4.2). */
export function describe(brand: ExploraBrand): string {
  const style = brand.style?.toLowerCase();
  return [
    brand.style && `${brand.style}.`,
    brand.tags
      // Los tags de sección (destacada, popular…) no describen la marca.
      .filter((tag) => tag.toLowerCase() !== style && !isSectionTag(tag))
      .slice(0, 3)
      .join(", "),
    brand.foundedYear && `Desde ${brand.foundedYear}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

const MAX_COUNT = 3;
/** Tope solo para pantallas enormes: por debajo manda el hueco libre. */
const MAX_WIDTH = 420;
const MIN_WIDTH = 64;
const GAP = 12;
/** Nombre + precio + huecos bajo la foto de cada pieza. */
const TEXT_HEIGHT = 42;
/** Aire sobre las piezas (bajo la descripción) y bajo ellas (borde de la pantalla). */
const GAP_ABOVE = 24;
const GAP_BELOW = 22;

type Fit = { count: number; size: number };

/**
 * Cuántas piezas caben abajo a la izquierda y de qué tamaño: el espacio es el ancho hasta la línea
 * central y el alto que deja la descripción. Con alto de sobra, tres grandes; si el ancho no da para
 * tres sin encogerlas, dos más grandes; y así. Nunca invade a los demás componentes.
 */
export function fitProducts(
  stageW: number,
  stageH: number,
  infoBottom: number,
  available: number,
): Fit {
  const side = stageW * 0.022;
  const width = stageW * 0.5 - side * 2;
  const heightLimit = ((stageH - GAP_BELOW - infoBottom - GAP_ABOVE - TEXT_HEIGHT) * 3) / 4;
  const best = Math.min(heightLimit, MAX_WIDTH);
  if (best < MIN_WIDTH) return { count: 0, size: 0 };
  for (let n = Math.min(MAX_COUNT, available); n >= 1; n--) {
    const size = Math.min((width - (n - 1) * GAP) / n, best);
    if (size >= MIN_WIDTH && (size >= best * 0.8 || n === 1)) return { count: n, size };
  }
  return { count: 0, size: 0 };
}

type Props = {
  popular: readonly ExploraBrand[];
  index: number;
};

/** §4.2: nombres, imágenes, descripción, piezas y contador de la marca activa. */
export function Populares({ popular, index }: Props) {
  const total = popular.length;
  const current = popular[index];
  const stage = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<Fit>({ count: MAX_COUNT, size: 0 });
  const available = current?.products.length ?? 0;

  useLayoutEffect(() => {
    const stageEl = stage.current;
    const infoEl = info.current;
    if (!stageEl || !infoEl) return;
    const update = () => {
      const stageRect = stageEl.getBoundingClientRect();
      const infoRect = infoEl.getBoundingClientRect();
      const next = fitProducts(
        stageEl.clientWidth,
        stageEl.clientHeight,
        infoRect.bottom - stageRect.top,
        available,
      );
      setFit((prev) =>
        prev.count === next.count && Math.abs(prev.size - next.size) < 0.5 ? prev : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(stageEl);
    observer.observe(infoEl);
    return () => observer.disconnect();
  }, [available]);

  if (!current) return null;

  return (
    <section
      className={styles.pop}
      data-pop
      style={{ height: `${total * 100}vh` }}
      aria-label="Marcas destacadas"
    >
      <div ref={stage} className={styles.stage} data-pop-stage>
        <span className={styles.lineV} aria-hidden="true" />
        <span className={styles.lineH} aria-hidden="true" />

        <div className={styles.names}>
          <div className={styles.namesBase} data-nm-base>
            {popular.map((brand) => (
              <span key={brand.id} className={styles.name} data-nm>
                {brand.name}
              </span>
            ))}
          </div>
          <div className={styles.namesClip} aria-hidden="true">
            <div className={styles.namesTop} data-nm-top>
              {popular.map((brand) => (
                <span key={brand.id} className={styles.name}>
                  {brand.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.imWindow} data-im-window>
          <div className={styles.imTrack} data-im-track>
            {popular.map((brand) => (
              <div key={brand.id} className={styles.imTile}>
                <BrandImage
                  sources={brand.sources}
                  alt={brand.name}
                  width={480}
                  height={900}
                  request={640}
                  className={styles.imImage}
                />
              </div>
            ))}
          </div>
        </div>

        <div ref={info} className={styles.info}>
          <p className={styles.desc}>{describe(current)}</p>
          {current.description && <p className={styles.about}>{current.description}</p>}
          <BrandActions brand={current} />
        </div>

        {available === 0 && <NoStock className={styles.noStock} />}

        <ul
          className={styles.products}
          style={fit.size > 0 ? ({ "--pw": `${fit.size}px` } as CSSProperties) : undefined}
          data-count={fit.count}
        >
          {current.products.slice(0, fit.count).map((product) => (
            <li key={product.id}>
              <a
                className={styles.product}
                href={product.url ?? current.url ?? undefined}
                target="_blank"
                rel="noopener"
              >
                <span className={styles.productPhoto}>
                  <BrandImage
                    sources={product.image ? [product.image] : []}
                    alt=""
                    width={420}
                    height={560}
                    request={840}
                    className={styles.productImage}
                  />
                </span>
                <span className={styles.productName}>{product.name}</span>
                <span className={styles.productPrice}>{price(product.price)}</span>
              </a>
            </li>
          ))}
        </ul>

        <p className={styles.counter} aria-live="polite">
          <span>{current.name}</span>
          <span className={styles.counterNum}>
            <span>{pad(index + 1, 2)}</span>
            <span className={styles.counterBar} aria-hidden="true" />
            <span>{pad(total, 2)}</span>
          </span>
        </p>
      </div>
    </section>
  );
}
