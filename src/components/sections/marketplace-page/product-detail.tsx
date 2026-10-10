"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { discountPct, eur, imgSrc, pad3 } from "@/lib/marketplace/format";
import type { BrandVM, CardVM } from "@/lib/marketplace/types";
import { lockScroll } from "@/lib/motion/scroll";
import s from "./marketplace-page.module.css";

type Props = {
  /** Pieza abierta; `null` = cerrada (se anima el cierre y luego se oculta). */
  piece: CardVM | null;
  brand: BrandVM | undefined;
  categoryPath: string;
  /** Posición (1-based) y total para «003 / 047»; `null` si la pieza no está en la lista cargada. */
  position: number | null;
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
  onBrandAll: (brandId: string) => void;
  onOpenMore: (id: string) => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Ficha a pantalla completa: diálogo modal con telón (translateY 101%→0, 850 ms). */
export function ProductDetail({
  piece,
  brand,
  categoryPath,
  position,
  total,
  canPrev,
  canNext,
  onClose,
  onStep,
  onBrandAll,
  onOpenMore,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [retained, setRetained] = useState<CardVM | null>(piece);
  if (piece && piece !== retained) setRetained(piece);
  const open = piece !== null;
  const shown = piece ?? retained;

  // Apertura y cierre. Sin movimiento: solo opacity (200 ms).
  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const reduced = Boolean(ctx.conditions?.reduced);
          if (open) {
            gsap.killTweensOf(el);
            if (!el.hidden) {
              // Se reabre mientras baja el telón de cierre: se sube de nuevo en vez de ocultarse.
              gsap.to(el, { yPercent: 0, opacity: 1, duration: 0.3 });
            } else {
              opener.current = document.activeElement as HTMLElement | null;
              el.hidden = false;
              if (reduced) gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
              else
                gsap.fromTo(
                  el,
                  { yPercent: 101 },
                  { yPercent: 0, duration: 0.85, ease: "curtain" },
                );
            }
            closeBtn.current?.focus({ preventScroll: true });
          } else if (!el.hidden) {
            const done = () => {
              el.hidden = true;
              gsap.set(el, { clearProps: "transform,opacity" });
              const back = opener.current;
              if (back?.isConnected) back.focus({ preventScroll: true });
              opener.current = null;
            };
            if (reduced) gsap.to(el, { opacity: 0, duration: 0.2, onComplete: done });
            else gsap.to(el, { yPercent: 101, duration: 0.85, ease: "curtain", onComplete: done });
          }
        },
      );
    },
    { scope: root, dependencies: [open] },
  );

  // Mientras está abierta: scroll del body bloqueado, resto de la página inerte y teclado.
  useEffect(() => {
    if (!open) return;
    const unlock = lockScroll();
    const rest = document.getElementById("mk-content");
    rest?.setAttribute("inert", "");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        onStep(event.key === "ArrowRight" ? 1 : -1);
      } else if (event.key === "Tab") {
        const nodes = root.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!nodes || nodes.length === 0) return;
        const first = nodes[0] as HTMLElement;
        const last = nodes[nodes.length - 1] as HTMLElement;
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !root.current?.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !root.current?.contains(active))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      rest?.removeAttribute("inert");
      unlock();
    };
  }, [open, onClose, onStep]);

  const pct = shown?.isOnSale ? discountPct(shown.price, shown.originalPrice) : null;
  const more = (brand?.more ?? []).filter((m) => m.id !== shown?.id).slice(0, 3);
  const brandName = shown?.brandName ?? "";
  const image = shown?.images[0];

  return (
    <div
      ref={root}
      className={s.detail}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pd-brand"
      data-testid="mk-detail"
      data-lenis-prevent=""
      // `hidden` lo gestiona el efecto de arriba (se mantiene visible mientras dura el cierre).
      hidden
    >
      {shown && (
        <>
          <figure className={s.pdMedia}>
            {image && (
              // biome-ignore lint/performance/noImgElement: hosts de producto variables; se pide el ancho al CDN
              <img
                key={image}
                src={imgSrc(image, 1400)}
                alt={shown.name}
                width={1400}
                height={1867}
                fetchPriority="high"
                decoding="async"
              />
            )}
            {pct !== null && <span className={s.tag}>−{pct}%</span>}
          </figure>
          <div className={s.pdInfo}>
            <div className={s.pdTop}>
              <nav className={s.pdNav} aria-label="Piezas">
                <button
                  type="button"
                  aria-label="Anterior"
                  disabled={!canPrev}
                  onClick={() => onStep(-1)}
                >
                  ←
                </button>
                <span>{position !== null ? `${pad3(position)} / ${pad3(total)}` : ""}</span>
                <button
                  type="button"
                  aria-label="Siguiente"
                  disabled={!canNext}
                  onClick={() => onStep(1)}
                >
                  →
                </button>
              </nav>
              <button ref={closeBtn} type="button" className={s.pdClose} onClick={onClose}>
                CERRAR <kbd>ESC</kbd>
              </button>
            </div>

            <div className={s.pdMain}>
              <p className={s.pdCat}>{categoryPath}</p>
              <h2 id="pd-brand" className={s.pdBrand}>
                {brandName}
              </h2>
              <p className={s.pdName}>{shown.name}</p>
              <p className={s.pdPrice}>
                <b>{eur(shown.price)}</b>
                {pct !== null && shown.originalPrice !== null && <s>{eur(shown.originalPrice)}</s>}
              </p>
              <div className={s.pdActions}>
                <a className={s.pdBuy} href={shown.productUrl} target="_blank" rel="noopener">
                  <span>COMPRAR EN SU WEB</span>
                  <span aria-hidden="true">↗</span>
                </a>
                {shown.brandId && (
                  <button
                    type="button"
                    className={s.pdAll}
                    onClick={() => shown.brandId && onBrandAll(shown.brandId)}
                  >
                    <span>TODO DE {brandName} </span>
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            </div>

            {more.length > 0 && (
              <section className={s.pdMore} aria-labelledby="pd-more">
                <h3 id="pd-more">MÁS DE {brandName}</h3>
                <div className={s.pdMoreGrid}>
                  {more.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={s.pdThumb}
                      onClick={() => onOpenMore(m.id)}
                    >
                      {/* biome-ignore lint/performance/noImgElement: miniatura de producto */}
                      <img
                        src={imgSrc(m.image, 300)}
                        alt=""
                        width={300}
                        height={400}
                        loading="lazy"
                      />
                      <span>{eur(m.price)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
