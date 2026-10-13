"use client";

import { useEffect, useState } from "react";
import type { ProductSize } from "@/lib/data";

/** Espera antes de pedir tallas: un hover de paso no genera peticiones. */
const HOVER_DELAY_MS = 180;

/** Caché de la sesión: cada producto se pide una sola vez. */
const cache = new Map<string, Promise<ProductSize[]>>();

type Envelope = { success: boolean; data: ProductSize[] | null; error: string | null };

function fetchSizes(id: string): Promise<ProductSize[]> {
  const cached = cache.get(id);
  if (cached) return cached;
  const request = fetch(`/api/products/${encodeURIComponent(id)}/sizes`)
    .then((res) => res.json() as Promise<Envelope>)
    .then((body) => {
      if (!body.success || !body.data) throw new Error(body.error ?? "Sin tallas");
      return body.data;
    })
    .catch((error: unknown) => {
      // Un fallo no se cachea: el siguiente hover lo reintenta.
      cache.delete(id);
      console.warn("[sizes]", error);
      return [];
    });
  cache.set(id, request);
  return request;
}

/** Tallas del producto, pedidas solo mientras `active` (hover o foco). */
export function useProductSizes(id: string, active: boolean): ProductSize[] | null {
  const [sizes, setSizes] = useState<ProductSize[] | null>(null);

  useEffect(() => {
    if (!active || sizes) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetchSizes(id).then((result) => {
        if (!cancelled) setSizes(result);
      });
    }, HOVER_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [id, active, sizes]);

  return sizes;
}
