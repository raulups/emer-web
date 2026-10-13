"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Brand } from "@/lib/data";
import { EMPTY_FILTERS, type Filters, filterCount, hasFilters, toggle } from "@/lib/marketplace";
import type { MarketplacePage } from "@/lib/marketplace-data";
import { FilterPanel } from "./filter-panel";
import styles from "./marketplace.module.css";
import { MenuToggle } from "./menu-toggle";
import { ProductGrid } from "./product-grid";
import { SideMenu } from "./side-menu";
import { useProducts } from "./use-products";

const MENU_ID = "marketplace-menu";
/** En pantallas estrechas el menú empieza oculto. */
const NARROW = "(max-width: 760px)";

type Props = {
  brands: readonly Brand[];
  initial: MarketplacePage;
};

/** Marketplace (README §3, `Marketplace.dc.html`). */
export function Marketplace({ brands, initial }: Props) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [side, setSide] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);
  const filtersButton = useRef<HTMLButtonElement>(null);
  const products = useProducts(filters, EMPTY_FILTERS, initial);

  useEffect(() => {
    if (window.matchMedia(NARROW).matches) setSide(false);
  }, []);

  // El rango del slider es el global (no depende del filtro de precio).
  const [priceRange] = useState(() => {
    const range = initial.page.facets.priceRange ?? { min: 0, max: 0 };
    return { min: Math.floor(range.min), max: Math.ceil(range.max) };
  });

  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const brandNames = useMemo(() => new Map(brands.map((b) => [b.id, b.name])), [brands]);
  const menuBrands = useMemo(
    () =>
      brands
        .filter((b) => b.product_count > 0)
        .toSorted((a, b) => a.name.localeCompare(b.name, "es")),
    [brands],
  );
  const categories = products.facets.categories.filter((c) => c.count > 0);
  const allCount = categories.reduce((sum, c) => sum + c.count, 0);
  const colors = products.facets.colors.filter((c) => c.hex && c.count > 0);
  const cardBrand = brandById.get(hoveredBrand ?? filters.brands[0] ?? "") ?? null;

  const update = useCallback((next: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);
  const clear = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const closePanel = useCallback(() => {
    setPanelOpen(false);
    filtersButton.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.root}>
      <h1 className="sr-only">Marketplace</h1>
      <SideMenu
        id={MENU_ID}
        visible={side}
        categories={categories}
        allCount={allCount}
        brands={menuBrands}
        cat={filters.cat}
        selectedBrands={filters.brands}
        filterCount={filterCount(filters)}
        canClear={hasFilters(filters)}
        cardBrand={cardBrand}
        filtersButtonRef={filtersButton}
        onCategory={(cat) => update({ cat })}
        onToggleBrand={(id) => update({ brands: toggle(filters.brands, id) })}
        onHoverBrand={setHoveredBrand}
        onOpenFilters={() => setPanelOpen(true)}
        onClear={clear}
      />
      <MenuToggle open={side} controls={MENU_ID} onToggle={() => setSide(!side)} />

      <section className={styles.main} data-side={side || undefined} aria-label="Productos">
        <p className="sr-only" aria-live="polite">
          {products.status === "loading" ? "Cargando productos" : `${products.total} productos`}
        </p>
        <ProductGrid
          items={products.items}
          brandNames={brandNames}
          loading={products.status === "loading"}
          error={products.status === "error"}
          hasMore={products.hasMore}
          loadingMore={products.loadingMore}
          onLoadMore={products.loadMore}
          onRetry={products.reload}
        />
      </section>

      <FilterPanel
        open={panelOpen}
        filters={filters}
        colors={colors}
        priceRange={priceRange}
        saleCount={products.saleCount}
        total={products.total}
        onChange={update}
        onClear={clear}
        onClose={closePanel}
      />
    </div>
  );
}
