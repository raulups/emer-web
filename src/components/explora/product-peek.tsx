"use client";

import { type FocusEvent, type MouseEvent, useEffect, useState } from "react";
import { ScrambleText } from "@/components/ui/scramble-text";
import typo from "@/components/ui/type.module.css";
import { bus, type ProductPeekEvent } from "@/lib/bus";
import type { ExploraProduct } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { BrandImage } from "./brand-image";
import styles from "./product-peek.module.css";
import { useProductPeek } from "./use-product-peek";

const WIDTH = 280;
const GAP = 16;
/** Alto aproximado de la ficha (foto 3:4 + texto) para que no se salga por abajo. */
const HEIGHT = WIDTH * (4 / 3) + 170;

/**
 * Props para un producto de Explora: en hover (o con el foco) pide su detalle, que pinta
 * `ProductPeek` junto a la foto.
 */
export function peekProps(product: ExploraProduct, brand: string) {
  const open = (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    const r = event.currentTarget.getBoundingClientRect();
    bus.emit("product:peek", {
      product,
      brand,
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    });
  };
  const close = () => bus.emit("product:peek", null);
  return { onMouseEnter: open, onMouseLeave: close, onFocus: open, onBlur: close };
}

/** Coloca la ficha a la derecha de la foto (o a la izquierda si no cabe), dentro de la pantalla. */
function place(rect: ProductPeekEvent["rect"]) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const right = rect.left + rect.width + GAP;
  const x = right + WIDTH <= vw - GAP ? right : Math.max(GAP, rect.left - WIDTH - GAP);
  const y = Math.min(Math.max(GAP, rect.top), Math.max(GAP, vh - HEIGHT - GAP));
  return { x, y };
}

/**
 * Detalle de producto en hover (Explora): foto, nombre, precio (y el anterior si está rebajado),
 * color y tallas, con los datos que tenga el backend (`/api/products/[id]`). Ficha fija que no
 * captura el ratón; se cierra al salir del producto o al hacer scroll. Textos con scramble.
 */
export function ProductPeek() {
  const [event, setEvent] = useState<ProductPeekEvent | null>(null);
  const [shown, setShown] = useState<ProductPeekEvent | null>(null);
  const peek = useProductPeek(event?.product.id ?? null);

  useEffect(() => bus.on("product:peek", setEvent), []);
  useEffect(() => {
    if (event) setShown(event);
  }, [event]);
  useEffect(() => {
    if (!event) return;
    const close = () => setEvent(null);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("wheel", close);
      window.removeEventListener("scroll", close);
    };
  }, [event]);

  const current = event ?? shown;
  if (!current) return null;
  const { product, brand } = current;
  const { x, y } = place(current.rect);
  const data = event ? peek : undefined;
  const name = data?.name ?? product.name ?? brand;
  const now = data?.price ?? product.price;
  const before = data?.is_on_sale ? data.original_price : null;
  const sizes = data?.sizes ?? [];

  return (
    <aside
      className={styles.peek}
      data-open={event ? "" : undefined}
      style={{ transform: `translate(${x}px, ${y}px)` }}
      aria-hidden="true"
    >
      <span className={styles.inner}>
        <span className={styles.photo}>
          <BrandImage
            key={product.id}
            sources={product.image ? [product.image] : []}
            alt=""
            width={WIDTH}
            height={Math.round((WIDTH * 4) / 3)}
            request={WIDTH * 2}
            className={styles.image}
          />
        </span>
        <span className={styles.body}>
          <ScrambleText text={brand} hover={false} className={`${typo.label} ${styles.brand}`} />
          <ScrambleText text={name} hover={false} className={`${typo.editorial} ${styles.name}`} />
          <span className={`${typo.label} ${styles.prices}`}>
            <ScrambleText text={price(now)} hover={false} />
            {before != null && (
              <ScrambleText text={price(before)} hover={false} className={styles.before} />
            )}
          </span>
          {data?.color_name && (
            <ScrambleText
              text={`Color · ${data.color_name}`}
              hover={false}
              className={`${typo.label} ${styles.meta}`}
            />
          )}
          {sizes.length > 0 ? (
            <span className={`${typo.label} ${styles.sizes}`}>
              {sizes.map((size) => (
                <span key={size.label} data-out={size.available ? undefined : ""}>
                  {size.label}
                </span>
              ))}
            </span>
          ) : (
            <ScrambleText
              text={data === undefined && event ? "Cargando detalle" : "Tallas en la tienda"}
              hover={false}
              className={`${typo.label} ${styles.meta}`}
            />
          )}
          {(data?.url ?? product.url) && (
            <span className={`${typo.label} ${styles.link}`}>Ver en la tienda ↗</span>
          )}
        </span>
      </span>
    </aside>
  );
}
