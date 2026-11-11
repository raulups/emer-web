"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/data";
import type { Origin } from "./product-card";

/** Query param de la pieza abierta en el popup: `?p=<uuid>`. */
export const PRODUCT_PARAM = "p";
const STATE_KEY = "emerProduct";

export type Opened = { product: Product; origin: Origin | null };

const stateOf = () => (window.history.state ?? {}) as Record<string, unknown>;

/**
 * La pieza abierta en el popup, atada al historial: abrirla añade `?p=` (una entrada nueva), así
 * «atrás» la cierra (en el móvil, el gesto natural) y la URL se puede copiar. Cerrar con el botón
 * vuelve atrás si la entrada es nuestra. Al montar, `?p=` de una pieza de la primera página la
 * abre; si no está, se limpia.
 */
export function useProductRoute(items: readonly Product[]) {
  const [opened, setOpened] = useState<Opened | null>(null);
  const pushed = useRef(false);

  const open = useCallback((product: Product, origin: Origin | null) => {
    setOpened({ product, origin });
    const url = new URL(window.location.href);
    url.searchParams.set(PRODUCT_PARAM, product.id);
    window.history.pushState({ ...stateOf(), [STATE_KEY]: product.id }, "", url);
    pushed.current = true;
  }, []);

  const close = useCallback(() => {
    if (pushed.current && stateOf()[STATE_KEY]) {
      // `popstate` hace el resto.
      window.history.back();
      return;
    }
    setOpened(null);
  }, []);

  useEffect(() => {
    const onPop = () => {
      if (stateOf()[STATE_KEY]) return;
      pushed.current = false;
      setOpened(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: solo al montar, con la primera página
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get(PRODUCT_PARAM);
    if (!id) return;
    const product = items.find((item) => item.id === id);
    if (product) {
      setOpened({ product, origin: null });
      window.history.replaceState({ ...stateOf(), [STATE_KEY]: id }, "", url);
      pushed.current = true;
      return;
    }
    url.searchParams.delete(PRODUCT_PARAM);
    window.history.replaceState(stateOf(), "", url);
  }, []);

  return { opened, open, close };
}
