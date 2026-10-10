"use server";

import { getAllBrands, getProduct } from "@/lib/api";
import { brandNames, loadPage, priceCounts, toCard } from "@/lib/marketplace/stream";
import type { CardVM, Cursor } from "@/lib/marketplace/types";
import { isUuid, parseQuery } from "@/lib/marketplace/url";

export type MoreResult = { ok: true; items: CardVM[]; next: Cursor | null } | { ok: false };

const MAX_SEARCH = 2_000;
const sane = (n: unknown) => Math.max(0, Math.floor(Number(n)) || 0);

/** «Cargar más» del scroll infinito. Vuelve a sanear los filtros: llegan del cliente. */
export async function loadMoreProducts(search: string, cursor: Cursor): Promise<MoreResult> {
  const query = parseQuery(new URLSearchParams(String(search).slice(0, MAX_SEARCH)));
  const brands = await getAllBrands();
  if (!brands.ok) return { ok: false };
  const page = await loadPage(query, brands.data, {
    seg: sane(cursor?.seg),
    offset: sane(cursor?.offset),
  });
  if (!page.ok) return { ok: false };
  const names = brandNames(brands.data);
  return { ok: true, items: page.data.items.map((p) => toCard(p, names)), next: page.data.next };
}

/** Una pieza suelta (miniaturas de «MÁS DE …»). */
export async function loadPiece(id: string): Promise<CardVM | null> {
  if (!isUuid(String(id))) return null;
  const [product, brands] = await Promise.all([getProduct(String(id)), getAllBrands()]);
  if (!product.ok || !product.data) return null;
  return toCard(product.data, brandNames(brands.ok ? brands.data : []));
}

export async function loadPriceCounts(search: string) {
  const query = parseQuery(new URLSearchParams(String(search).slice(0, MAX_SEARCH)));
  const res = await priceCounts({ ...query, precio: [] });
  return res.ok ? { ok: true as const, counts: res.data } : { ok: false as const };
}
