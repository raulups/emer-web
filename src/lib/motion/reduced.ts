const QUERY = "(prefers-reduced-motion: reduce)";

function media(): MediaQueryList | null {
  return typeof window === "undefined" ? null : window.matchMedia(QUERY);
}

export function isReduced(): boolean {
  return media()?.matches ?? false;
}

/** Notifica cambios en caliente de la preferencia del sistema. */
export function onReducedChange(handler: (reduced: boolean) => void): () => void {
  const mq = media();
  if (!mq) return () => {};
  const listener = (event: MediaQueryListEvent) => handler(event.matches);
  mq.addEventListener("change", listener);
  return () => mq.removeEventListener("change", listener);
}

/** Firma compatible con `useSyncExternalStore`. */
export function subscribeReduced(onChange: () => void): () => void {
  return onReducedChange(onChange);
}
