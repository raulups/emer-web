"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import { loadMoreProducts, loadPiece, loadPriceCounts } from "@/app/actions/marketplace";
import { gsap, useGSAP } from "@/lib/gsap";
import { PRICE_RANGES, toggle } from "@/lib/marketplace/filters";
import { piecesLabel } from "@/lib/marketplace/format";
import type {
  BrandVM,
  CardVM,
  CategoryVM,
  Cursor,
  MarketQuery,
  ViewCols,
} from "@/lib/marketplace/types";
import { DEFAULT_QUERY, dataKey, hasFilters, toSearch } from "@/lib/marketplace/url";
import { getScrollY, scrollTo } from "@/lib/motion/scroll";
import { CategoryNav } from "./category-nav";
import { EmptyState } from "./empty-state";
import { FilterBar, type Panel } from "./filter-bar";
import s from "./marketplace-page.module.css";
import { ProductDetail } from "./product-detail";
import { ProductGrid } from "./product-grid";
import { TopRow } from "./top-row";

type Props = {
  status: "ok" | "error";
  categories: CategoryVM[];
  brands: BrandVM[];
  /** Filtros saneados por el servidor (de ellos salen los datos de `initial`). */
  query: MarketQuery;
  initial: { items: CardVM[]; next: Cursor | null; total: number };
  detail: CardVM | null;
};

type ListState = { key: string; items: CardVM[]; next: Cursor | null };

const BAR_H = 56;
const path = (query: MarketQuery) => {
  const search = toSearch(query);
  return search ? `/marketplace?${search}` : "/marketplace";
};

export function MarketplaceView({ status, categories, brands, query, initial, detail }: Props) {
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useOptimistic(query);
  const [view, setView] = useState<ViewCols>(query.vista);
  const [panel, setPanel] = useState<Panel>("none");
  const [open, setOpen] = useState<CardVM | null>(detail);
  const [priceCounts, setPriceCounts] = useState<Partial<Record<string, number>>>({});
  const [loading, setLoading] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const timers = useRef<number[]>([]);

  // La lista se reinicia cuando el servidor entrega datos de otros filtros.
  const key = dataKey(query);
  const [list, setList] = useState<ListState>({ key, items: initial.items, next: initial.next });
  if (list.key !== key) setList({ key, items: initial.items, next: initial.next });
  const listRef = useRef(list);
  const busy = useRef(false);
  useEffect(() => {
    listRef.current = list;
  }, [list]);
  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      for (const id of pendingTimers) window.clearTimeout(id);
    };
  }, []);

  // ---- Navegación / filtros (la URL es la fuente de verdad) ----
  const scrollToResults = useCallback(() => {
    const el = results.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + getScrollY();
    if (getScrollY() > top - BAR_H) scrollTo(Math.max(0, top - BAR_H), { immediate: true });
  }, []);

  const commit = useCallback(
    (next: MarketQuery) => {
      const merged: MarketQuery = { ...next, vista: view, pieza: null };
      startTransition(() => {
        setQ(merged);
        router.replace(path(merged), { scroll: false });
      });
      scrollToResults();
    },
    [view, router, setQ, scrollToResults],
  );

  const reset = useCallback(() => commit({ ...DEFAULT_QUERY, orden: q.orden }), [commit, q.orden]);

  const changeView = useCallback(
    (next: ViewCols) => {
      setView(next);
      // Solo cambia el layout: sin ir al servidor.
      window.history.replaceState(null, "", path({ ...q, vista: next, pieza: null }));
    },
    [q],
  );

  // ---- Scroll infinito ----
  const loadMore = useCallback(async (): Promise<CardVM[] | null> => {
    const current = listRef.current;
    if (!current.next || busy.current) return null;
    busy.current = true;
    setLoading(true);
    setMoreError(false);
    const res = await loadMoreProducts(current.key, current.next);
    busy.current = false;
    setLoading(false);
    if (!res.ok) {
      setMoreError(true);
      return null;
    }
    if (listRef.current.key !== current.key) return null; // llegaron otros filtros mientras tanto
    const fresh = res.items.filter((it) => !current.items.some((o) => o.id === it.id));
    setList((prev) =>
      prev.key !== current.key
        ? prev
        : { ...prev, items: [...prev.items, ...fresh], next: res.next },
    );
    return fresh;
  }, []);

  // ---- Ficha ----
  const syncPieza = useCallback(
    (id: string | null) => {
      window.history.replaceState(null, "", path({ ...q, vista: view, pieza: id }));
    },
    [q, view],
  );
  const openPiece = useCallback(
    (item: CardVM) => {
      setPanel("none");
      setOpen(item);
      syncPieza(item.id);
    },
    [syncPieza],
  );
  const closePiece = useCallback(() => {
    setOpen(null);
    syncPieza(null);
  }, [syncPieza]);

  const index = open ? list.items.findIndex((i) => i.id === open.id) : -1;
  const step = useCallback(
    async (dir: 1 | -1) => {
      const items = listRef.current.items;
      const at = open ? items.findIndex((i) => i.id === open.id) : -1;
      if (at < 0) return;
      const target = items[at + dir];
      if (target) return openPiece(target);
      if (dir === 1) {
        const more = await loadMore();
        if (more?.[0]) openPiece(more[0]);
      }
    },
    [open, openPiece, loadMore],
  );

  const openMore = useCallback(
    async (id: string) => {
      const piece = await loadPiece(id);
      if (piece) openPiece(piece);
    },
    [openPiece],
  );

  const brandAll = useCallback(
    (brandId: string) => {
      closePiece();
      // El telón de la ficha dura 850 ms: los filtros nuevos llegan cuando ya va cerrándose.
      timers.current.push(
        window.setTimeout(
          () => commit({ ...DEFAULT_QUERY, orden: q.orden, marcas: [brandId] }),
          450,
        ),
      );
    },
    [closePiece, commit, q.orden],
  );

  // ---- Recuentos ----
  const pool = useMemo(
    () => (q.marcas.length > 0 ? brands.filter((b) => q.marcas.includes(b.id)) : brands),
    [brands, q.marcas],
  );
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const b of pool)
      for (const [id, n] of Object.entries(b.counts)) out[id] = (out[id] ?? 0) + n;
    return out;
  }, [pool]);
  const allCount = useMemo(() => pool.reduce((n, b) => n + b.total, 0), [pool]);

  const subs = useMemo(() => {
    const roots = categories.filter((c) => c.parentId === null);
    return roots.flatMap((r) => categories.filter((c) => c.parentId === r.id));
  }, [categories]);
  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const pathFor = (id: string | null): string => {
    const cat = id ? catById.get(id) : undefined;
    if (!cat) return "";
    const parent = cat.parentId ? catById.get(cat.parentId) : undefined;
    return [parent?.name, cat.name].filter(Boolean).join(" / ").toLocaleUpperCase("es");
  };

  // Recuentos por tramo de precio: se piden al abrir FILTROS y al cambiar el resto de filtros.
  const priceKey = toSearch({ ...query, precio: [], vista: 4, pieza: null, orden: "rel" });
  useEffect(() => {
    if (panel !== "filters") return;
    let live = true;
    loadPriceCounts(priceKey).then((res) => {
      if (live && res.ok) setPriceCounts(res.counts);
    });
    return () => {
      live = false;
    };
  }, [panel, priceKey]);

  // Esc cierra el desplegable abierto (la ficha gestiona su propio Esc).
  useEffect(() => {
    if (panel === "none") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel("none");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  // #1 y #2: categorías y celdas de la barra entran escalonadas, una vez.
  useGSAP(
    () => {
      if (document.visibilityState !== "visible") return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-in=cat]", {
          opacity: 0,
          y: 14,
          duration: 0.9,
          ease: "outExpo",
          delay: (i) => Math.min(i, 23) * 0.028,
          clearProps: "transform,opacity",
        });
        gsap.from("[data-in=bar]", {
          opacity: 0,
          duration: 0.8,
          ease: "outExpo",
          delay: (i) => 0.25 + i * 0.09,
          clearProps: "opacity",
        });
      });
    },
    { scope: root },
  );

  // ---- Chips de filtros activos ----
  const chips: Array<{ label: string; remove: () => void }> = [];
  for (const id of q.marcas) {
    const b = brandById.get(id);
    if (b)
      chips.push({
        label: `MARCA · ${b.name}`,
        remove: () => commit({ ...q, marcas: toggle(q.marcas, id) }),
      });
  }
  if (q.cat) {
    chips.push({
      label: (catById.get(q.cat)?.name ?? "CATEGORÍA").toLocaleUpperCase("es"),
      remove: () => commit({ ...q, cat: null }),
    });
  }
  if (q.oferta) chips.push({ label: "EN OFERTA", remove: () => commit({ ...q, oferta: false }) });
  for (const r of PRICE_RANGES.filter((r) => q.precio.includes(r.key))) {
    chips.push({ label: r.label, remove: () => commit({ ...q, precio: toggle(q.precio, r.key) }) });
  }

  const countLabel = status === "ok" ? piecesLabel(initial.total) : "— PIEZAS";
  const empty = list.items.length === 0;

  return (
    <div className={s.page} data-testid="mk-page" ref={root}>
      <div id="mk-content">
        <TopRow />
        <main id="contenido" tabIndex={-1} className={s.main}>
          <h1 className="sr-only">Marketplace</h1>
          <CategoryNav
            subs={subs}
            counts={counts}
            total={allCount}
            active={q.cat}
            onPick={(id) => commit({ ...q, cat: id })}
          />
          <FilterBar
            query={q}
            view={view}
            brands={brands}
            countLabel={countLabel}
            piecesTotal={status === "ok" ? initial.total : null}
            priceCounts={priceCounts}
            panel={panel}
            onPanel={setPanel}
            onView={changeView}
            onChange={commit}
            onReset={reset}
          />
          {hasFilters(q) && chips.length > 0 && (
            <ul className={s.chips} aria-label="Filtros activos" data-testid="mk-chips">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <button type="button" className={s.chip} onClick={chip.remove}>
                    {chip.label} <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className={s.chipsClear} onClick={reset}>
                  BORRAR TODO
                </button>
              </li>
            </ul>
          )}
          <div className={s.results} ref={results} data-pending={pending ? "" : undefined}>
            {status === "error" ? (
              <EmptyState kind="error" />
            ) : empty ? (
              hasFilters(query) ? (
                <EmptyState kind="filters" onReset={reset} />
              ) : (
                <EmptyState kind="none" />
              )
            ) : (
              <ProductGrid
                key={`${key}:${view}`}
                items={list.items}
                view={view}
                hrefFor={(item) => path({ ...q, vista: view, pieza: item.id })}
                onOpen={(item) => openPiece(item)}
                hasMore={list.next !== null}
                loadingMore={loading}
                moreError={moreError}
                onMore={() => void loadMore()}
              />
            )}
          </div>
        </main>
        <footer className={s.foot}>
          <span>MARCAS PEQUEÑAS, UN SOLO SITIO</span>
          <span>© 2026 EMER</span>
        </footer>
      </div>
      <ProductDetail
        piece={open}
        brand={open?.brandId ? brandById.get(open.brandId) : undefined}
        categoryPath={pathFor(open?.categoryId ?? null)}
        position={index >= 0 ? index + 1 : null}
        total={initial.total}
        canPrev={index > 0}
        canNext={index >= 0 && (index < list.items.length - 1 || list.next !== null)}
        onClose={closePiece}
        onStep={(dir) => void step(dir)}
        onBrandAll={brandAll}
        onOpenMore={(id) => void openMore(id)}
      />
    </div>
  );
}
