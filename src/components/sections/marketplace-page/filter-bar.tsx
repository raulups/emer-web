"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pad2 } from "@/lib/format";
import { gsap, useGSAP } from "@/lib/gsap";
import { PRICE_RANGES, SORT_OPTIONS, toggle } from "@/lib/marketplace/filters";
import type { BrandVM, MarketQuery, SortKey, ViewCols } from "@/lib/marketplace/types";
import s from "./marketplace-page.module.css";

export type Panel = "none" | "filters" | "sort";

type Props = {
  query: MarketQuery;
  view: ViewCols;
  brands: readonly BrandVM[];
  countLabel: string;
  piecesTotal: number | null;
  priceCounts: Readonly<Partial<Record<string, number>>>;
  panel: Panel;
  onPanel: (panel: Panel) => void;
  onView: (view: ViewCols) => void;
  onChange: (next: MarketQuery) => void;
  onReset: () => void;
};

const VIEWS: ReadonlyArray<{ cols: ViewCols; bars: number; width: number }> = [
  { cols: 2, bars: 2, width: 9 },
  { cols: 4, bars: 3, width: 6 },
  { cols: 6, bars: 4, width: 4 },
];

/** Logos rotos o de 0 px: la celda cae al nombre de la marca. */
function useBrokenLogos(brands: readonly BrandVM[]) {
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const mark = useCallback(
    (id: string) => setBroken((prev) => (prev.has(id) ? prev : new Set(prev).add(id))),
    [],
  );

  // Se precargan al montar: si fallan o `naturalWidth === 0`, se muestra el nombre.
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    for (const brand of brands) {
      if (!brand.logo) continue;
      const image = new Image();
      image.onerror = () => mark(brand.id);
      image.onload = () => {
        if (image.naturalWidth === 0) mark(brand.id);
      };
      image.src = brand.logo;
      images.push(image);
    }
    return () => {
      for (const image of images) {
        image.onerror = null;
        image.onload = null;
      }
    };
  }, [brands, mark]);
  return { broken, mark };
}

export function FilterBar({
  query,
  view,
  brands,
  countLabel,
  piecesTotal,
  priceCounts,
  panel,
  onPanel,
  onView,
  onChange,
  onReset,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const prevCount = useRef(countLabel);
  const { broken, mark } = useBrokenLogos(brands);

  const filtersOpen = panel === "filters";
  const sortOpen = panel === "sort";
  const panelCount = query.marcas.length + query.precio.length;
  const sort = SORT_OPTIONS.find((o) => o.key === query.orden) ?? SORT_OPTIONS[0];

  // #11–#13: los elementos de cada desplegable entran escalonados al abrirlo.
  useGSAP(
    () => {
      if (panel === "none" || document.visibilityState !== "visible") return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (panel === "filters") {
          gsap.from("[data-in=logo]", {
            opacity: 0,
            y: 10,
            duration: 0.75,
            ease: "outExpo",
            delay: (i) => i * 0.022,
            clearProps: "transform,opacity",
          });
          gsap.from("[data-in=price]", {
            opacity: 0,
            y: 10,
            duration: 0.75,
            ease: "outExpo",
            delay: (i) => 0.12 + i * 0.05,
            clearProps: "transform,opacity",
          });
        } else {
          gsap.from("[data-in=sort]", {
            opacity: 0,
            y: 8,
            duration: 0.75,
            ease: "outExpo",
            delay: (i) => i * 0.05,
            clearProps: "transform,opacity",
          });
        }
      });
    },
    { scope: root, dependencies: [panel] },
  );

  // #14: el recuento sube desde abajo (dentro de un contenedor con overflow:hidden).
  useGSAP(
    () => {
      if (prevCount.current === countLabel) return;
      prevCount.current = countLabel;
      if (document.visibilityState !== "visible") return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-count]",
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.55,
            ease: "outExpo",
            clearProps: "transform,opacity",
          },
        );
      });
    },
    { scope: root, dependencies: [countLabel] },
  );

  const selectedBrands = query.marcas.length;
  return (
    <div className={s.bar} ref={root} data-testid="mk-bar">
      <div className={s.barGrid}>
        <div className={s.barLeft} data-in="bar">
          <div className={s.views}>
            <span>VISTA</span>
            {/* biome-ignore lint/a11y/useSemanticElements: grupo de botones con aria-pressed (el diseño pide role=group) */}
            <div className={s.viewBtns} role="group" aria-label="Columnas">
              {VIEWS.map((v) => (
                <button
                  key={v.cols}
                  type="button"
                  className={s.viewBtn}
                  aria-label={`${v.cols} columnas`}
                  aria-pressed={view === v.cols}
                  data-testid={`mk-view-${v.cols}`}
                  onClick={() => onView(v.cols)}
                >
                  {Array.from({ length: v.bars }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: barras idénticas y fijas
                    <span key={i} className={s.viewRect} style={{ width: v.width }} />
                  ))}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={s.barBtn}
            aria-pressed={query.oferta}
            data-testid="mk-sale"
            onClick={() => onChange({ ...query, oferta: !query.oferta })}
          >
            <span className={s.barBtnText}>
              <span>OFERTAS</span>
              <span aria-hidden="true" style={{ visibility: "hidden", fontWeight: 600 }}>
                OFERTAS
              </span>
            </span>
            <i className={s.switch} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={s.barBtn}
            aria-expanded={filtersOpen}
            aria-controls="mk-filters"
            data-testid="mk-filters-toggle"
            onClick={() => onPanel(filtersOpen ? "none" : "filters")}
          >
            <span className={s.barBtnText}>
              <span>{panelCount > 0 ? `FILTROS (${panelCount})` : "FILTROS"}</span>
              <span aria-hidden="true" style={{ visibility: "hidden", fontWeight: 600 }}>
                {panelCount > 0 ? `FILTROS (${panelCount})` : "FILTROS"}
              </span>
            </span>
            <i className={s.plus} aria-hidden="true">
              +
            </i>
          </button>
        </div>

        <div className={s.countCell} data-in="bar">
          <div style={{ overflow: "hidden" }}>
            <p className={s.countText} data-count="" aria-live="polite" data-testid="mk-count">
              {countLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          className={s.sortBtn}
          data-in="bar"
          aria-expanded={sortOpen}
          aria-controls="mk-sort"
          data-testid="mk-sort-toggle"
          onClick={() => onPanel(sortOpen ? "none" : "sort")}
        >
          <span>ORDENAR</span>
          <small>{sort?.short}</small>
          <svg className={s.chev} width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>

      <div
        id="mk-sort"
        className={s.expand}
        data-kind="sort"
        data-open={sortOpen ? "" : undefined}
        inert={!sortOpen}
      >
        <div className={s.expandInner}>
          <div className={s.expandContent}>
            <div className={s.sortList} role="radiogroup" aria-label="Ordenar">
              {SORT_OPTIONS.map((o) => (
                // biome-ignore lint/a11y/useSemanticElements: radio con aspecto de texto, según el handoff
                <button
                  key={o.key}
                  type="button"
                  role="radio"
                  aria-checked={query.orden === o.key}
                  className={s.sortOpt}
                  data-in="sort"
                  onClick={() => {
                    onChange({ ...query, orden: o.key as SortKey });
                    onPanel("none");
                  }}
                >
                  <span>{o.long}</span>
                  <span aria-hidden="true" style={{ visibility: "hidden", fontWeight: 600 }}>
                    {o.long}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section
        id="mk-filters"
        className={s.expand}
        data-open={filtersOpen ? "" : undefined}
        aria-label="Filtros"
        data-testid="mk-filters"
        inert={!filtersOpen}
      >
        <div className={s.expandInner}>
          <div className={`${s.expandContent} ${s.filtersBody}`} data-lenis-prevent="">
            <div className={s.filtersGrid}>
              <div className={s.brandsCol}>
                <header className={s.colHead}>
                  <span>MARCAS</span>
                  <span>
                    ELIGE UNA O VARIAS
                    {selectedBrands > 0 &&
                      ` | ${pad2(selectedBrands)} ${selectedBrands === 1 ? "ELEGIDA" : "ELEGIDAS"}`}
                  </span>
                </header>
                <ul className={s.logoWall} data-has-sel={selectedBrands > 0 ? "" : undefined}>
                  {brands.map((b) => {
                    const on = query.marcas.includes(b.id);
                    const showLogo = Boolean(b.logo) && !broken.has(b.id);
                    return (
                      <li key={b.id}>
                        <button
                          type="button"
                          className={s.logoCell}
                          aria-pressed={on}
                          aria-label={b.name}
                          title={`${b.name} · ${b.total}`}
                          data-in="logo"
                          data-testid="mk-brand"
                          onClick={() => onChange({ ...query, marcas: toggle(query.marcas, b.id) })}
                        >
                          {showLogo ? (
                            // biome-ignore lint/performance/noImgElement: logos de Supabase, 70×28
                            <img
                              className={s.logoImg}
                              src={b.logo ?? ""}
                              alt=""
                              width={140}
                              height={56}
                              loading="lazy"
                              onError={() => mark(b.id)}
                            />
                          ) : (
                            <span className={s.logoName}>{b.name}</span>
                          )}
                          <span className={s.logoTick} aria-hidden="true" />
                          {showLogo && (
                            <span className={s.logoLabel} aria-hidden="true">
                              {b.name}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className={s.sideCol}>
                <fieldset className={s.priceGroup}>
                  <legend>PRECIO</legend>
                  {PRICE_RANGES.map((r) => {
                    const n = priceCounts[r.key];
                    return (
                      // biome-ignore lint/a11y/useSemanticElements: casilla con aspecto de fila, según el handoff
                      <button
                        key={r.key}
                        type="button"
                        role="checkbox"
                        aria-checked={query.precio.includes(r.key)}
                        className={s.priceRow}
                        data-in="price"
                        onClick={() => onChange({ ...query, precio: toggle(query.precio, r.key) })}
                      >
                        <span className={s.priceBox} aria-hidden="true" />
                        <span className={s.priceLabel}>
                          <span>{r.label}</span>
                          <span
                            aria-hidden="true"
                            style={{ visibility: "hidden", fontWeight: 600 }}
                          >
                            {r.label}
                          </span>
                        </span>
                        {n !== undefined && <span className={s.priceN}>{n}</span>}
                      </button>
                    );
                  })}
                </fieldset>
                <footer className={s.panelFooter}>
                  <button type="button" className={s.clear} onClick={onReset}>
                    BORRAR
                  </button>
                  <button
                    type="button"
                    className={s.apply}
                    data-testid="mk-filters-apply"
                    onClick={() => onPanel("none")}
                  >
                    MOSTRAR {piecesTotal === null ? "—" : piecesTotal}{" "}
                    {piecesTotal === 1 ? "PIEZA" : "PIEZAS"}
                  </button>
                </footer>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
