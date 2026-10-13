"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import type { ExploraBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { pad } from "@/lib/motion/math";
import { BrandImage } from "./brand-image";
import styles from "./emergentes.module.css";

const PRODUCT_MAX = 92;
const PRODUCT_MIN = 40;
/** Precio + hueco bajo la foto de cada pieza. */
const PRICE_HEIGHT = 20;

type CardProps = {
  brand: ExploraBrand;
  number: number;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  first?: boolean;
};

function Card({ brand, number, active, onEnter, onLeave, first }: CardProps) {
  return (
    <a
      className={styles.card}
      data-ea={first ? "" : undefined}
      data-active={active || undefined}
      href={brand.url ?? undefined}
      target="_blank"
      rel="noopener"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
    >
      <span className={styles.photo}>
        <BrandImage
          sources={brand.sources}
          alt={brand.name}
          width={360}
          height={480}
          request={480}
          className={styles.photoImage}
        />
      </span>
      <span className={styles.caption}>
        <span>{brand.name}</span>
        <span>{pad(number, 2)}</span>
      </span>
    </a>
  );
}

type Props = {
  brands: readonly ExploraBrand[];
  /** Índice (en la columna A) de la tarjeta más cercana al centro; lo calcula el bucle. */
  near: number;
};

/**
 * §4.4: Emergentes en blanco, espejo de Novedades. Título e info a la derecha; a la izquierda, el
 * carrusel de dos columnas (A pares, B impares) que el bucle de `explora.tsx` desplaza en sentidos
 * opuestos. Marca activa: la de la columna A más cercana al centro o, con hover, la tarjeta bajo
 * el ratón. Las marcas no se repiten.
 */
export function Emergentes({ brands, near }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const columnA = brands.filter((_, i) => i % 2 === 0);
  const columnB = brands.filter((_, i) => i % 2 === 1);
  const active = brands.find((b) => b.id === hovered) ?? columnA[near] ?? brands[0];
  const activeNumber = active ? brands.indexOf(active) + 1 : 1;

  const block = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number>(PRODUCT_MAX);
  const products = active?.products.slice(0, 3) ?? [];
  const hasProducts = products.length > 0;

  // Las piezas se ajustan al alto que dejan el texto, el nombre y el enlace (sin invadirlos).
  useLayoutEffect(() => {
    const blockEl = block.current;
    const textEl = text.current;
    const infoEl = info.current;
    if (!blockEl || !textEl || !infoEl) return;
    const update = () => {
      const row = infoEl.querySelector<HTMLElement>("[data-er-products]");
      const gaps = Number.parseFloat(getComputedStyle(infoEl).rowGap) || 0;
      const rest = [...infoEl.children].reduce(
        (sum, child) => sum + (child === row ? 0 : (child as HTMLElement).offsetHeight + gaps),
        0,
      );
      const free = blockEl.clientHeight - textEl.offsetHeight - 20 - rest - gaps;
      const next = Math.max(0, Math.min(PRODUCT_MAX, ((free - PRICE_HEIGHT) * 3) / 4));
      setSize((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(blockEl);
    observer.observe(infoEl);
    return () => observer.disconnect();
  }, []);

  if (!active) return null;

  const leave = () => setHovered(null);
  const showProducts = size >= PRODUCT_MIN;

  return (
    <section
      className={styles.er}
      data-er
      style={{ height: `${100 + brands.length * 70}vh` }}
      aria-label="Emergentes"
    >
      <div className={styles.stage}>
        <span className={styles.divider} data-ediv aria-hidden="true" />
        <span className={styles.hline} aria-hidden="true" />

        <div className={styles.car} data-er-car>
          <span className={styles.carLine} aria-hidden="true" />
          <div className={styles.colA} data-er-a>
            {columnA.map((brand, i) => (
              <Card
                key={brand.id}
                brand={brand}
                number={brands.indexOf(brand) + 1}
                active={active.id === brand.id}
                first={i === 0}
                onEnter={() => setHovered(brand.id)}
                onLeave={leave}
              />
            ))}
          </div>
          <div className={styles.colB} data-er-b>
            {columnB.map((brand) => (
              <Card
                key={brand.id}
                brand={brand}
                number={brands.indexOf(brand) + 1}
                active={active.id === brand.id}
                onEnter={() => setHovered(brand.id)}
                onLeave={leave}
              />
            ))}
          </div>
        </div>

        <h2 className={styles.title}>EMERGENTES</h2>
        <div ref={block} className={styles.block}>
          <p ref={text} className={styles.text}>
            Marcas que acaban de nacer. Baja para recorrerlas.
          </p>
          <div ref={info} className={styles.info} data-er-info>
            <span className={styles.name}>{active.name}</span>
            <span className={styles.meta}>
              Desde {active.foundedYear ?? "—"} · {active.count} piezas
            </span>
            <div
              className={styles.products}
              data-er-products
              style={{ "--pw": `${Math.min(size, PRODUCT_MAX)}px` } as CSSProperties}
            >
              {hasProducts && showProducts ? (
                products.map((product) => (
                  <span key={product.id} className={styles.product}>
                    <span className={styles.productPhoto}>
                      <BrandImage
                        sources={product.image ? [product.image] : []}
                        alt=""
                        width={184}
                        height={245}
                        request={240}
                        className={styles.productImage}
                      />
                    </span>
                    <span className={styles.productPrice}>{price(product.price)}</span>
                  </span>
                ))
              ) : !hasProducts ? (
                <span className={styles.soon}>Catálogo pronto</span>
              ) : null}
            </div>
            {active.url && (
              <a className={styles.link} href={active.url} target="_blank" rel="noopener">
                <span>Ver marca ↗</span>
                <span className={styles.linkLine} aria-hidden="true" />
              </a>
            )}
          </div>
          <p className={styles.count} aria-live="polite">
            {pad(activeNumber, 2)} / {pad(brands.length, 2)}
          </p>
        </div>
      </div>
    </section>
  );
}
