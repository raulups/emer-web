"use client";

import { type CSSProperties, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import { discount, price } from "@/lib/format";
import { fitCrossOrigin, fitOnLoad, fitRef } from "@/lib/image-fit";
import { sizedImage } from "@/lib/marketplace";
import styles from "./product-card.module.css";
import { useProductSizes } from "./use-product-sizes";

/** Fotos por tarjeta como máximo (el índice «n/N» se mantiene legible). */
const MAX_PHOTOS = 8;
/** Ancho pedido a Shopify: tarjeta de ~300px a 2x. */
const IMAGE_WIDTH = 640;

/** De dónde nace el popup: la caja de la tarjeta (la del popup) y la de su foto (la foto). */
export type Origin = { card: DOMRect; media: DOMRect };
/** Abrir el detalle de una pieza. */
export type ProductOpen = (product: Product, origin: Origin | null) => void;

type Props = {
  product: Product;
  brandName: string;
  /** Primeras tarjetas: la foto principal carga con prioridad (LCP). */
  eager?: boolean;
  onOpen: ProductOpen;
};

/**
 * Tarjeta sin borde (README §3). En hover pasa a la 2.ª foto, aparecen las flechas, sube la
 * franja de tallas con el índice y el nombre se subraya; al salir vuelve a la 1.ª. Toda la
 * tarjeta abre el detalle (popup); la tienda se visita desde él.
 */
export function ProductCard({ product, brandName, eager = false, onOpen }: Props) {
  const [hovered, setHovered] = useState(false);
  const card = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [loadedUpTo, setLoadedUpTo] = useState(0);
  const sizes = useProductSizes(product.id, hovered);

  const photos = (product.image_urls.length > 0 ? product.image_urls : [product.main_image_url])
    .filter((src): src is string => Boolean(src))
    .slice(0, MAX_PHOTOS);
  const count = photos.length;
  const multi = count > 1;
  const off = discount(product);

  const show = (next: number) => {
    const i = (next + count) % count;
    setIndex(i);
    setLoadedUpTo((prev) => Math.max(prev, i));
  };
  const enter = () => {
    setHovered(true);
    if (multi && index === 0) show(1);
  };
  const leave = () => {
    setHovered(false);
    setIndex(0);
  };

  return (
    <article
      ref={card}
      className={styles.card}
      data-product={product.id}
      data-hovered={hovered || undefined}
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) leave();
      }}
    >
      <div ref={media} className={styles.media} data-media>
        <div className={styles.track} style={{ "--index": index } as CSSProperties}>
          {photos.map((src, k) => (
            <div key={src} className={styles.frame}>
              {k <= loadedUpTo + 1 && (
                // biome-ignore lint/performance/noImgElement: imágenes de las tiendas (Shopify), ya redimensionadas en origen
                <img
                  src={sizedImage(src, IMAGE_WIDTH)}
                  alt={k === 0 ? product.name : ""}
                  width={IMAGE_WIDTH}
                  height={(IMAGE_WIDTH * 4) / 3}
                  loading={k === 0 && !eager ? "lazy" : "eager"}
                  fetchPriority={k === 0 && eager ? "high" : undefined}
                  decoding="async"
                  crossOrigin={fitCrossOrigin(src)}
                  ref={fitRef}
                  onLoad={fitOnLoad}
                  className={styles.image}
                />
              )}
            </div>
          ))}
        </div>

        {off > 0 && <span className={styles.tag}>−{off}%</span>}

        <div className={styles.strip} aria-hidden="true">
          <div className={styles.sizes}>
            {sizes?.map((size) => (
              <span
                key={size.size_label}
                className={styles.size}
                data-soldout={!size.available || undefined}
              >
                {size.size_label}
              </span>
            ))}
          </div>
          {multi && (
            <div className={styles.index}>
              {photos.map((src, k) => (
                <span key={src} className={styles.dot} data-active={k === index || undefined} />
              ))}
              <span className={styles.counter}>
                {index + 1}/{count}
              </span>
            </div>
          )}
        </div>
        {multi && (
          <>
            <button
              type="button"
              className={styles.arrow}
              data-side="prev"
              aria-label={`Foto anterior de ${product.name}`}
              onClick={() => show(index - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.arrow}
              data-side="next"
              aria-label={`Foto siguiente de ${product.name}`}
              onClick={() => show(index + 1)}
            >
              ›
            </button>
          </>
        )}
      </div>

      <div className={styles.info} data-info>
        <div className={styles.row}>
          <h3 className={styles.name}>
            <button
              type="button"
              className={styles.link}
              aria-haspopup="dialog"
              onClick={() =>
                onOpen(
                  product,
                  card.current && media.current
                    ? {
                        card: card.current.getBoundingClientRect(),
                        media: media.current.getBoundingClientRect(),
                      }
                    : null,
                )
              }
            >
              {product.name}
            </button>
          </h3>
          <span className={styles.price}>{price(product.current_price)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.brand}>{brandName}</span>
          {off > 0 && (
            <s className={styles.original}>
              <span className="sr-only">Antes </span>
              {price(product.original_price)}
            </s>
          )}
        </div>
      </div>
    </article>
  );
}
