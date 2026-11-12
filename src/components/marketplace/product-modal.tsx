"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  type CSSProperties,
  type KeyboardEvent,
  type SyntheticEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import button from "@/components/ui/button.module.css";
import type { Product } from "@/lib/data";
import { discount, price } from "@/lib/format";
import { fitCrossOrigin, fitOnLoad, fitRef } from "@/lib/image-fit";
import { sizedImage } from "@/lib/marketplace";
import { lockScroll } from "@/lib/motion/scroll";
import styles from "./product-modal.module.css";
import { closeStage, openStage } from "./product-modal-motion";
import type { Opened } from "./use-product-route";
import { useProductSizes } from "./use-product-sizes";

gsap.registerPlugin(useGSAP);

const IMAGE_WIDTH = 960;
const THUMB_WIDTH = 160;
const MAX_PHOTOS = 8;
type Props = {
  opened: Opened | null;
  brandName: string;
  onClose: () => void;
  /** Ver más piezas de la marca: filtra el catálogo por ella. */
  onBrand: (id: string) => void;
};

const photosOf = (product: Product) =>
  (product.image_urls.length > 0 ? product.image_urls : [product.main_image_url])
    .filter((src): src is string => Boolean(src))
    .slice(0, MAX_PHOTOS);

/**
 * Detalle de una pieza en un popup (`<dialog>` nativo: página inerte detrás, Escape cierra):
 * galería con flechas, miniaturas y teclado (← →), nombre, precio (y el anterior si está
 * rebajada), color, tallas con las agotadas tachadas, IR A LA TIENDA (web oficial, otra
 * pestaña) y VER MÁS DE la marca. Al abrir, la propia tarjeta se convierte en el popup: su caja
 * y su foto crecen desde donde estaban hasta su sitio y los detalles van apareciendo; al cerrar,
 * encogen de vuelta. Solo `transform` y `opacity`; sin movimiento, directo.
 */
export function ProductModal({ opened, brandName, onClose, onBrand }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLImageElement>(null);
  /** Corta un cierre a medias si la pieza se vuelve a abrir (p. ej. «adelante» en el historial). */
  const cancelClose = useRef<(() => void) | null>(null);
  /** Pieza que se sigue pintando mientras dura el cierre (cuando `opened` ya es null). */
  const [shown, setShown] = useState<Product | null>(null);
  const [index, setIndex] = useState(0);
  const titleId = useId();
  const product = opened?.product ?? shown;
  const sizes = useProductSizes(product?.id ?? "", opened !== null);

  // Nueva pieza: desde la primera foto. (Ajuste de estado durante el render, sin efecto.)
  const [lastId, setLastId] = useState<string | null>(null);
  if (opened && opened.product.id !== lastId) {
    setLastId(opened.product.id);
    setShown(opened.product);
    setIndex(0);
  }

  useEffect(() => {
    if (!product) return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [product]);

  // Abrir / cerrar en el mismo efecto de layout que mide y anima: el popup nunca se pinta un frame
  // sin su estado inicial. La coreografía está en `product-modal-motion.ts`.
  useGSAP(
    () => {
      const el = dialog.current;
      const stage =
        sheet.current && panel.current && frame.current && ghost.current
          ? {
              sheet: sheet.current,
              panel: panel.current,
              frame: frame.current,
              ghost: ghost.current,
            }
          : null;
      if (!el || !stage) return;
      if (opened) {
        cancelClose.current?.();
        cancelClose.current = null;
        el.dataset.phase = "open";
        if (!el.open) el.showModal();
        el.focus({ preventScroll: true });
        openStage(stage, opened.origin ? opened.product.id : null);
        return;
      }
      if (!el.open || !shown) return;
      el.dataset.phase = "closing";
      cancelClose.current = closeStage(stage, shown.id, () => {
        cancelClose.current = null;
        el.close();
        setShown(null);
        setLastId(null);
      });
    },
    { dependencies: [opened] },
  );

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  if (!product) return null;

  const photos = photosOf(product);
  const count = photos.length;
  const multi = count > 1;
  const show = (next: number) => setIndex(((next % count) + count) % count);
  const off = discount(product);

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (!multi || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") show(index + 1);
    else if (event.key === "ArrowLeft") show(index - 1);
    else return;
    event.preventDefault();
  };

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      data-lenis-prevent
      tabIndex={-1}
      onCancel={onCancel}
      onKeyDown={onKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* La caja blanca con borde: nace de la tarjeta y crece hasta aquí. */}
      <div ref={sheet} className={styles.sheet} aria-hidden="true" />
      <div ref={panel} className={styles.panel}>
        <button
          type="button"
          className={styles.close}
          aria-label="Cerrar detalle"
          data-rise
          onClick={onClose}
        >
          ×
        </button>

        <div className={styles.gallery}>
          <div ref={frame} className={styles.frame}>
            <div className={styles.track} style={{ "--index": index } as CSSProperties}>
              {photos.map((src, k) => (
                <div key={src} className={styles.slide}>
                  {/* biome-ignore lint/performance/noImgElement: imágenes de las tiendas (Shopify), redimensionadas en origen */}
                  <img
                    src={sizedImage(src, IMAGE_WIDTH)}
                    alt={k === 0 ? product.name : ""}
                    width={IMAGE_WIDTH}
                    height={(IMAGE_WIDTH * 4) / 3}
                    loading={k === 0 ? "eager" : "lazy"}
                    decoding="async"
                    crossOrigin={fitCrossOrigin(src)}
                    ref={fitRef}
                    onLoad={fitOnLoad}
                    className={styles.image}
                  />
                </div>
              ))}
            </div>
            {off > 0 && <span className={styles.tag}>−{off}%</span>}
            {!product.available && <span className={styles.tag}>AGOTADO</span>}
            {multi && (
              <>
                <button
                  type="button"
                  className={styles.arrow}
                  data-side="prev"
                  aria-label="Foto anterior"
                  onClick={() => show(index - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className={styles.arrow}
                  data-side="next"
                  aria-label="Foto siguiente"
                  onClick={() => show(index + 1)}
                >
                  ›
                </button>
              </>
            )}
          </div>
          {multi && (
            <ol className={styles.thumbs} aria-label="Fotos" data-rise>
              {photos.map((src, k) => (
                <li key={src}>
                  <button
                    type="button"
                    className={styles.thumb}
                    data-on={k === index || undefined}
                    aria-current={k === index ? "true" : undefined}
                    aria-label={`Foto ${k + 1} de ${count}`}
                    onClick={() => show(k)}
                  >
                    {/* biome-ignore lint/performance/noImgElement: miniaturas remotas de tamaño fijo */}
                    <img
                      src={sizedImage(src, THUMB_WIDTH)}
                      alt=""
                      width={THUMB_WIDTH}
                      height={(THUMB_WIDTH * 4) / 3}
                      loading="lazy"
                      decoding="async"
                      crossOrigin={fitCrossOrigin(src)}
                      ref={fitRef}
                      onLoad={fitOnLoad}
                      className={styles.image}
                    />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={styles.info}>
          {product.brand_id && (
            <button
              type="button"
              className={styles.brand}
              data-rise
              onClick={() => onBrand(product.brand_id as string)}
            >
              {brandName}
            </button>
          )}
          <h2 id={titleId} className={styles.name} data-rise>
            {product.name}
          </h2>
          <p className={styles.prices} data-rise>
            <span className={styles.price}>{price(product.current_price)}</span>
            {off > 0 && (
              <s className={styles.original}>
                <span className="sr-only">Antes </span>
                {price(product.original_price)}
              </s>
            )}
          </p>
          {product.color_name && (
            <p className={styles.row} data-rise>
              <span className={styles.label}>COLOR</span>
              <span className={styles.value}>
                {product.color_hex && (
                  <span
                    className={styles.swatch}
                    style={{ "--swatch": product.color_hex } as CSSProperties}
                    aria-hidden="true"
                  />
                )}
                {product.color_name}
              </span>
            </p>
          )}
          <div className={styles.row} data-rise>
            <span className={styles.label}>TALLAS</span>
            {sizes === null ? (
              <span className={styles.muted}>CARGANDO…</span>
            ) : sizes.length === 0 ? (
              <span className={styles.muted}>EN LA TIENDA</span>
            ) : (
              <ul className={styles.sizes} aria-label="Tallas">
                {sizes.map((size) => (
                  <li
                    key={size.size_label}
                    className={styles.size}
                    data-soldout={!size.available || undefined}
                  >
                    {size.size_label}
                    {!size.available && <span className="sr-only"> (agotada)</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.actions} data-rise>
            <a
              className={`${button.box} ${styles.cta}`}
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              IR A LA TIENDA ↗<span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
            {product.brand_id && (
              <button
                type="button"
                className={`${button.text} ${styles.more}`}
                onClick={() => onBrand(product.brand_id as string)}
              >
                VER MÁS DE {brandName}
              </button>
            )}
            <p className={styles.note}>Se compra en la web oficial de la marca.</p>
          </div>
        </div>
      </div>
      {/* Copia de la foto de la tarjeta que vuela hasta el marco (ver `product-modal-motion.ts`). */}
      {/* biome-ignore lint/performance/noImgElement: copia de una imagen ya cargada en la tarjeta */}
      <img ref={ghost} className={styles.ghost} alt="" aria-hidden="true" hidden />
    </dialog>
  );
}
