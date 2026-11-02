"use client";

import { useEffect, useState } from "react";
import type { ProductPeek } from "@/lib/data";

/** Espera antes de pedir el detalle: un hover de paso no genera peticiones. */
const HOVER_DELAY_MS = 140;

/** Caché de la sesión: cada producto se pide una sola vez. */
const cache = new Map<string, Promise<ProductPeek | null>>();

type Envelope = { success: boolean; data: ProductPeek | null; error: string | null };

function fetchPeek(id: string): Promise<ProductPeek | null> {
  const cached = cache.get(id);
  if (cached) return cached;
  const request = fetch(`/api/products/${encodeURIComponent(id)}`)
    .then((res) => res.json() as Promise<Envelope>)
    .then((body) => (body.success ? body.data : null))
    .catch((error: unknown) => {
      // Un fallo no se cachea: el siguiente hover lo reintenta.
      cache.delete(id);
      console.warn("[peek]", error);
      return null;
    });
  cache.set(id, request);
  return request;
}

/** Ficha del producto `id` (`undefined` mientras llega; `null` si no hay). */
export function useProductPeek(id: string | null): ProductPeek | null | undefined {
  const [peek, setPeek] = useState<{ id: string; data: ProductPeek | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchPeek(id).then((data) => {
        if (!cancelled) setPeek({ id, data });
      });
    }, HOVER_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id]);

  return id && peek?.id === id ? peek.data : undefined;
}
