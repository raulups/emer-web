"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product, ProductFacets } from "@/lib/data";
import { type Filters, toSearchParams } from "@/lib/marketplace";
import type { MarketplacePage } from "@/lib/marketplace-data";

/** Agrupa cambios seguidos (p. ej. arrastrar el slider) en una sola petición. */
const DEBOUNCE_MS = 220;

type Envelope = { success: boolean; data: MarketplacePage | null; error: string | null };

export type ProductsState = {
  items: Product[];
  total: number;
  facets: ProductFacets;
  saleCount: number;
  hasMore: boolean;
  status: "idle" | "loading" | "error";
  loadingMore: boolean;
};

async function request(filters: Filters, page: number, signal: AbortSignal) {
  const res = await fetch(`/api/products?${toSearchParams(filters, page)}`, { signal });
  const body = (await res.json()) as Envelope;
  if (!res.ok || !body.success || !body.data) {
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return body.data;
}

/** Productos del Marketplace para `filters`, empezando por la página que llegó del servidor. */
export function useProducts(filters: Filters, initialFilters: Filters, initial: MarketplacePage) {
  const [state, setState] = useState<ProductsState>({
    items: initial.page.items,
    total: initial.page.total,
    facets: initial.page.facets,
    saleCount: initial.saleCount,
    hasMore: initial.page.hasMore,
    status: "idle",
    loadingMore: false,
  });
  const page = useRef(initial.page.page);
  const pending = useRef<AbortController | null>(null);
  /** Pasa a true con el primer cambio de filtros: desde ahí, cualquier estado se pide. */
  const dirty = useRef(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    // Hasta el primer cambio, la página 1 es la que llegó del servidor.
    if (!dirty.current && filters === initialFilters && retry === 0) return;
    dirty.current = true;
    const controller = new AbortController();
    pending.current?.abort();
    pending.current = controller;
    setState((s) => ({ ...s, status: "loading" }));

    const timer = window.setTimeout(() => {
      request(filters, 1, controller.signal)
        .then((data) => {
          page.current = 1;
          setState({
            items: data.page.items,
            total: data.page.total,
            facets: data.page.facets,
            saleCount: data.saleCount,
            hasMore: data.page.hasMore,
            status: "idle",
            loadingMore: false,
          });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          console.error("[marketplace]", error);
          setState((s) => ({ ...s, status: "error", loadingMore: false }));
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filters, initialFilters, retry]);

  const loadMore = useCallback(() => {
    if (!state.hasMore || state.loadingMore || state.status !== "idle") return;
    const controller = new AbortController();
    pending.current = controller;
    setState((s) => ({ ...s, loadingMore: true }));
    request(filters, page.current + 1, controller.signal)
      .then((data) => {
        page.current = data.page.page;
        setState((s) => {
          const seen = new Set(s.items.map((p) => p.id));
          return {
            ...s,
            items: [...s.items, ...data.page.items.filter((p) => !seen.has(p.id))],
            hasMore: data.page.hasMore,
            loadingMore: false,
          };
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[marketplace]", error);
        setState((s) => ({ ...s, loadingMore: false, hasMore: false }));
      });
  }, [filters, state.hasMore, state.loadingMore, state.status]);

  const reload = useCallback(() => setRetry((n) => n + 1), []);

  return { ...state, loadMore, reload };
}
