"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { DisplayTitle } from "@/components/ui/display-title";
import { ScrambleText } from "@/components/ui/scramble-text";
import typo from "@/components/ui/type.module.css";
import type { ExploraBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { pad } from "@/lib/motion/math";
import { BrandActions } from "./brand-actions";
import { BrandImage } from "./brand-image";
import { cursorLogo } from "./cursor-logo";
import styles from "./emergentes.module.css";
import { NoStock } from "./no-stock";
import { peekProps } from "./product-peek";

/** Tope solo para pantallas enormes: por debajo manda el hueco libre. */
const PRODUCT_MAX = 560;
const PRODUCT_MIN = 40;
const PRODUCT_COUNT = 3;
const PRODUCT_GAP = 10;
/** Precio + hueco bajo la foto de cada pieza. */
const PRICE_HEIGHT = 20;
/** Scroll por marca del carrusel (vh): cuanto menos, más rápido se recorre. */
export const ER_VH_PER_BRAND = 32;
/** Pantalla extra al final con la escena quieta, para el fundido a Emergentes (Catálogo). */
export const ER_HOLD_VH = 100;

type CardProps = {
  brand: ExploraBrand;
  number: number;
  active: boolean;
  selected: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
  first?: boolean;
};

/** Tarjeta del carrusel: al pulsarla se selecciona (o se deselecciona si ya lo estaba). */
function Card({ brand, number, active, selected, onEnter, onLeave, onSelect, first }: CardProps) {
  return (
    <button
      type="button"
      className={styles.card}
      data-ea={first ? "" : undefined}
      data-scramble-hover
      data-active={active || undefined}
      data-selected={selected || undefined}
      aria-pressed={selected}
      {...cursorLogo(brand)}
      onClick={onSelect}
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
      <span className={`${typo.label} ${styles.caption}`}>
        <ScrambleText text={brand.name} view={false} />
        <ScrambleText text={`B — ${pad(number, 2)}`} view={false} />
      </span>
    </button>
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
  const [selected, setSelected] = useState<string | null>(null);
  const columnA = brands.filter((_, i) => i % 2 === 0);
  const columnB = brands.filter((_, i) => i % 2 === 1);
  // La seleccionada manda (sus piezas se quedan a la derecha); si no, la del hover o la del centro.
  const active =
    brands.find((b) => b.id === selected) ??
    brands.find((b) => b.id === hovered) ??
    columnA[near] ??
    brands[0];
  const activeNumber = active ? brands.indexOf(active) + 1 : 1;

  const block = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const info = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number>(PRODUCT_MAX);
  const products = active?.products.slice(0, PRODUCT_COUNT) ?? [];
  const hasProducts = products.length > 0;

  // Las piezas ocupan todo el hueco: el alto que dejan el texto, el nombre y los botones (sin
  // invadirlos) y el ancho del bloque repartido entre tres.
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
      const byHeight = ((free - PRICE_HEIGHT) * 3) / 4;
      const byWidth = (blockEl.clientWidth - (PRODUCT_COUNT - 1) * PRODUCT_GAP) / PRODUCT_COUNT;
      const next = Math.max(0, Math.min(PRODUCT_MAX, byHeight, byWidth));
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
  const select = (id: string) => () => setSelected((prev) => (prev === id ? null : id));
  const showProducts = size >= PRODUCT_MIN;

  return (
    <section
      className={styles.er}
      data-er
      data-scramble-in
      style={{ height: `${100 + ER_HOLD_VH + brands.length * ER_VH_PER_BRAND}vh` }}
      aria-label="Novedades"
    >
      <div className={styles.stage} data-er-stage>
        <span className={styles.divider} data-ediv aria-hidden="true" />
        <span className={styles.hline} aria-hidden="true" />

        <div className={styles.car} data-er-car data-selecting={selected ? "" : undefined}>
          <span className={styles.carLine} aria-hidden="true" />
          <div className={styles.colA} data-er-a>
            {columnA.map((brand, i) => (
              <Card
                key={brand.id}
                brand={brand}
                number={brands.indexOf(brand) + 1}
                active={active.id === brand.id}
                selected={selected === brand.id}
                first={i === 0}
                onEnter={() => setHovered(brand.id)}
                onLeave={leave}
                onSelect={select(brand.id)}
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
                selected={selected === brand.id}
                onEnter={() => setHovered(brand.id)}
                onLeave={leave}
                onSelect={select(brand.id)}
              />
            ))}
          </div>
        </div>

        <div className={styles.head}>
          <p className={`${typo.label} ${styles.kicker}`}>
            <ScrambleText text="A — 3" onIn />
            <ScrambleText text="Novedades" onIn />
            <ScrambleText text={`${pad(brands.length, 2)} marcas`} onIn />
          </p>
          <DisplayTitle
            lines={[
              ["LO", "*NUEVO"],
              ["EN", "*EMER"],
            ]}
            className={styles.title}
          />
        </div>
        <div ref={block} className={styles.block}>
          <p ref={text} className={styles.text}>
            <ScrambleText
              text="Las últimas marcas en llegar a EMER. Pulsa una foto para quedarte con sus piezas."
              hover={false}
              onIn
            />
          </p>
          <div ref={info} className={styles.info} data-er-info>
            <span className="sr-only">{active.name}</span>
            <ScrambleText
              text={`Desde ${active.foundedYear ?? "—"} · ${active.count} piezas`}
              view={false}
              className={`${typo.label} ${styles.meta}`}
            />
            <div
              className={styles.products}
              data-er-products
              style={{ "--pw": `${size}px` } as CSSProperties}
            >
              {hasProducts && showProducts ? (
                products.map((product) => (
                  <span
                    key={product.id}
                    className={styles.product}
                    {...peekProps(product, active.name)}
                  >
                    <span className={styles.productPhoto}>
                      <BrandImage
                        sources={product.image ? [product.image] : []}
                        alt=""
                        width={360}
                        height={480}
                        request={720}
                        className={styles.productImage}
                      />
                    </span>
                    <ScrambleText
                      text={price(product.price)}
                      className={`${typo.label} ${styles.productPrice}`}
                    />
                  </span>
                ))
              ) : !hasProducts ? (
                <NoStock key={active.id} />
              ) : null}
            </div>
            <BrandActions brand={active} />
          </div>
          <p className="sr-only" aria-live="polite">
            {pad(activeNumber, 2)} / {pad(brands.length, 2)}
          </p>
          <p className={`${typo.labelLg} ${styles.count}`} aria-hidden="true">
            <ScrambleText
              text={`B — ${pad(activeNumber, 2)} / ${pad(brands.length, 2)}`}
              view={false}
            />
          </p>
        </div>
      </div>
    </section>
  );
}
