"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { type CSSProperties, type KeyboardEvent, useRef, useState } from "react";
import { DisplayTitle } from "@/components/ui/display-title";
import typo from "@/components/ui/type.module.css";
import type { ExploraBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { scrollToY } from "@/lib/motion/scroll";
import { brandActions } from "./brand-actions";
import { BrandImage } from "./brand-image";
import styles from "./llegadas.module.css";
import { NW_STEP } from "./llegadas-motion";
import { openMarketplace } from "./novedades";
import { peekProps } from "./product-peek";

/** Huecos de la columna de piezas (`BRAND_PRODUCTS`: las vistas previas traen hasta 3). */
const SLOTS = [0, 1, 2] as const;

/** «2026-09-01T10:00:00Z» → «01.09.2026» (sin zona horaria: igual en servidor y cliente). */
const arrival = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}` : "";
};

/** Lo que oye un lector de pantalla al cambiar de carta. */
const describe = (brand: ExploraBrand, index: number, count: number) => {
  const date = arrival(brand.createdAt);
  return `${brand.name}, ${index + 1} de ${count}.${date ? ` Alta el ${date}.` : ""}`;
};

type CardProps = {
  brand: ExploraBrand;
  index: number;
  count: number;
  /** Con movimiento, solo la carta a la vista es un enlace accesible; sin él, todas. */
  on: boolean;
};

/** Una carta: solo la foto en su marco. Lleva a sus piezas o a su tienda. */
function Card({ brand, index, count, on }: CardProps) {
  const { primary } = brandActions(brand);
  const content = (
    <>
      <span className={styles.photo}>
        <BrandImage
          sources={brand.portrait}
          alt=""
          width={480}
          height={600}
          request={960}
          loading={index < 3 ? "eager" : "lazy"}
          className={styles.image}
        />
      </span>
      {/* Solo sin movimiento (grid): con la baraja, el nombre va a la izquierda. */}
      <span className={`${typo.label} ${styles.caption}`} aria-hidden="true">
        {brand.name}
      </span>
    </>
  );
  const shared = {
    className: styles.card,
    "data-nw-card": index,
    "data-nw-label": describe(brand, index, count),
    "data-on": on ? "" : undefined,
    "aria-hidden": on ? undefined : true,
    draggable: false,
    "data-cursor-logo": brand.logo ?? undefined,
  };
  if (primary === "market")
    return (
      <Link
        {...shared}
        data-nw-link=""
        tabIndex={on ? 0 : -1}
        href={`/marketplace?brand=${brand.id}`}
        onClick={openMarketplace(brand.id)}
        aria-label={`${brand.name}: ver sus ${brand.count} piezas en el Marketplace`}
      >
        {content}
      </Link>
    );
  if (primary === "store" && brand.url)
    return (
      <a
        {...shared}
        data-nw-link=""
        tabIndex={on ? 0 : -1}
        href={brand.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${brand.name}: sin stock, ir a su tienda (se abre en otra pestaña)`}
      >
        {content}
      </a>
    );
  return <span {...shared}>{content}</span>;
}

type Props = { brands: readonly ExploraBrand[] };

/**
 * Novedades (tras Emergentes): las últimas marcas en llegar a Emer, como una baraja de cartas
 * que retiene el scroll. La sección se queda fija una pantalla y cada medio scroll entra una
 * carta nueva desde abajo, inclinada, que se endereza al colocarse sobre la anterior; las que
 * quedan detrás retroceden en la pila (asoman por arriba, encogen y se apagan). A la izquierda,
 * el nombre rueda como un contador; a la derecha, sus tres piezas cambian en cascada. Las cartas
 * salen de debajo de la línea de avance, que es la común de Explora (`explora.tsx`). Colocada la
 * última, la sección suelta y sigue el Catálogo. El scroll lo escribe el bucle de `explora.tsx`
 * (`llegadas-motion.ts`); aquí solo vive el atajo de las flechas (con el foco en la carta), que
 * lleva el scroll a la carta vecina. Con «reducir movimiento», las cartas van en un grid normal.
 */
export function Llegadas({ brands }: Props) {
  const root = useRef<HTMLElement>(null);
  const [still, setStill] = useState(false);
  const count = brands.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: reduce)", () => {
        setStill(true);
        return () => setStill(false);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  /** Lleva el scroll a la carta `to` (su paso dentro de la sección). */
  const go = (to: number) => {
    const pin = root.current?.querySelector<HTMLElement>("[data-nw-pin]");
    if (!pin || count === 0) return;
    const vh = window.innerHeight;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    const index = Math.min(count - 1, Math.max(0, to));
    scrollToY(Math.round(top + index * vh * NW_STEP));
  };

  /** Carta a la que apunta el scroll real ahora mismo. */
  const at = () => {
    const pin = root.current?.querySelector<HTMLElement>("[data-nw-pin]");
    if (!pin) return 0;
    const top = pin.getBoundingClientRect().top + window.scrollY;
    const f = (window.scrollY - top) / Math.max(1, window.innerHeight * NW_STEP);
    return Math.min(count - 1, Math.max(0, Math.round(f)));
  };

  // Flechas solo con el foco dentro de la sección (en la carta).
  const onKeyDown = (event: KeyboardEvent) => {
    if (still || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === "ArrowRight") go(at() + 1);
    else if (event.key === "ArrowLeft") go(at() - 1);
    else return;
    event.preventDefault();
  };

  if (count === 0) return null;

  return (
    <section
      ref={root}
      className={styles.nw}
      data-nw
      data-scramble-in
      aria-label="Novedades"
      onKeyDown={onKeyDown}
    >
      <div className={styles.pin} data-nw-pin>
        <div className={styles.stage}>
          <div className={styles.head}>
            <DisplayTitle lines={[["LAS"], ["*NOVEDADES"]]} className={styles.title} />
          </div>

          {/* Recortada por la línea de progreso: cada carta sale de debajo de ella. */}
          <div className={styles.window}>
            <div className={styles.deck}>
              {brands.map((brand, i) => (
                <Card key={brand.id} brand={brand} index={i} count={count} on={still || i === 0} />
              ))}
            </div>
          </div>

          {/* A la izquierda de la baraja; sin eventos: la carta sigue respondiendo. */}
          <div className={styles.names} aria-hidden="true">
            {brands.map((brand, i) => (
              <span
                key={brand.id}
                className={`${typo.editorial} ${styles.name}`}
                data-nw-roll={i}
                style={{ "--len": Math.max(4, brand.name.length) } as CSSProperties}
              >
                {brand.name}
              </span>
            ))}
          </div>

          {/* A la derecha, en vertical: las piezas de la marca a la vista. Cambian en cascada. */}
          <div className={styles.pieces} aria-hidden="true">
            <span className={`${typo.label} ${styles.piecesLabel}`}>Primeras piezas</span>
            {SLOTS.map((j) => (
              <div key={j} className={styles.slot} data-nw-slot={j}>
                {brands.map((brand, i) => {
                  const product = brand.products[j];
                  if (!product)
                    return (
                      <span key={brand.id} className={styles.piece} data-nw-piece={i}>
                        {j === 0 && (
                          <span className={`${typo.label} ${styles.pieceEmpty}`}>
                            Inventario en camino
                          </span>
                        )}
                      </span>
                    );
                  return (
                    <span
                      key={brand.id}
                      className={styles.piece}
                      data-nw-piece={i}
                      data-on={i === 0 ? "" : undefined}
                      {...peekProps(product, brand.name)}
                    >
                      <span className={styles.pieceFrame}>
                        <span className={styles.pieceImage} data-nw-piece-img>
                          <BrandImage
                            sources={product.image ? [product.image] : []}
                            alt=""
                            width={120}
                            height={160}
                            request={320}
                            loading={i < 2 ? "eager" : "lazy"}
                            className={styles.image}
                          />
                        </span>
                      </span>
                      <span className={`${typo.label} ${styles.piecePrice}`}>
                        {price(product.price)}
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>

          <p className="sr-only" aria-live="polite" data-nw-live>
            {brands[0] ? describe(brands[0], 0, count) : ""}
          </p>
        </div>
      </div>
    </section>
  );
}
