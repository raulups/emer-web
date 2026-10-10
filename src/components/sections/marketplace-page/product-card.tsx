"use client";

import { memo, useRef, useState } from "react";
import { discountPct, eur, imgSrc } from "@/lib/marketplace/format";
import type { CardVM } from "@/lib/marketplace/types";
import s from "./marketplace-page.module.css";

type Props = {
  item: CardVM;
  href: string;
  /** Posición en la lista: las primeras se cargan sin lazy (LCP). */
  index: number;
  onOpen: (item: CardVM, opener: HTMLElement) => void;
};

const SWIPE_PX = 40;

export const ProductCard = memo(function ProductCard({ item, href, index, onOpen }: Props) {
  const [idx, setIdx] = useState(0);
  const [bad, setBad] = useState<ReadonlySet<string>>(() => new Set());
  const swiped = useRef(false);
  const startX = useRef<number | null>(null);

  const images = item.images.filter((url) => !bad.has(url));
  const multi = images.length > 1;
  const current = images.length === 0 ? 0 : Math.min(idx, images.length - 1);
  const pct = item.isOnSale ? discountPct(item.price, item.originalPrice) : null;

  const step = (dir: 1 | -1) => setIdx((current + dir + images.length) % images.length);
  const stop = (event: React.SyntheticEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <article
      className={s.card}
      data-testid="mk-card"
      data-cursor="prod"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && multi) setIdx(1);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") setIdx(0);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        startX.current = e.clientX;
        swiped.current = false;
      }}
      onPointerUp={(e) => {
        if (e.pointerType === "mouse" || startX.current === null || !multi) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > SWIPE_PX) {
          swiped.current = true;
          step(dx < 0 ? 1 : -1);
        }
      }}
    >
      <a
        href={href}
        className={s.cardLink}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          if (swiped.current) {
            swiped.current = false;
            return;
          }
          onOpen(item, e.currentTarget);
        }}
      >
        <div className={s.media} style={{ touchAction: "pan-y" }}>
          <div className={s.gallery}>
            {images.map((url, i) => (
              // biome-ignore lint/performance/noImgElement: hosts de producto variables; se pide el ancho al CDN
              <img
                key={url}
                src={imgSrc(url, 600)}
                alt={i === 0 ? item.name : ""}
                width={600}
                height={800}
                loading={index < 4 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                className={s.photo}
                data-on={i === current ? "" : undefined}
                onError={() => setBad((prev) => new Set(prev).add(url))}
              />
            ))}
          </div>
          {pct !== null && <span className={s.tag}>−{pct}%</span>}
          <span className={s.underline} aria-hidden="true" />
        </div>
        <div className={s.meta}>
          <p className={s.brand}>{item.brandName}</p>
          <p className={s.row}>
            <span className={s.name}>{item.name}</span>
            <span className={s.prices}>
              {pct !== null && item.originalPrice !== null && <s>{eur(item.originalPrice)}</s>}
              <b>{eur(item.price)}</b>
            </span>
          </p>
        </div>
      </a>
      {multi && (
        <div className={s.overlay}>
          <button
            type="button"
            className={`${s.arrow} ${s.arrowPrev}`}
            aria-label="Foto anterior"
            data-testid="mk-card-prev"
            data-cursor="link"
            onClick={(e) => {
              stop(e);
              step(-1);
            }}
          >
            ←
          </button>
          <button
            type="button"
            className={`${s.arrow} ${s.arrowNext}`}
            aria-label="Foto siguiente"
            data-testid="mk-card-next"
            data-cursor="link"
            onClick={(e) => {
              stop(e);
              step(1);
            }}
          >
            →
          </button>
          <ol className={s.dots} aria-hidden="true">
            {images.map((url, i) => (
              <li key={url} data-on={i === current ? "" : undefined} />
            ))}
          </ol>
        </div>
      )}
    </article>
  );
});
