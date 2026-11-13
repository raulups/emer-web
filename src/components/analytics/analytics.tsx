"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { load, readConsent, subscribeConsent, track, trackPage } from "@/lib/analytics";
import { isWaking, subscribeWake, wakeSince } from "@/lib/backend-wake";
import { ConsentBanner } from "./consent-banner";

const PREFIX = "track";
const noConsent = () => null;

/** Parámetros de un elemento con `data-track="evento"` (`data-track-brand="X"` → `brand: "X"`). */
function paramsOf(el: HTMLElement): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(el.dataset)) {
    if (key === PREFIX || !key.startsWith(PREFIX) || value === undefined) continue;
    const name = key
      .slice(PREFIX.length)
      .replace(/[A-Z]/g, (c, i) => (i ? "_" : "") + c.toLowerCase());
    params[name] = value;
  }
  return params;
}

/**
 * Estadísticas (layout): carga GA4 si hay consentimiento, cuenta páginas vistas, los clics en
 * elementos con `data-track`, los errores de JavaScript y las esperas al backend dormido.
 */
export function Analytics() {
  const pathname = usePathname();
  const consent = useSyncExternalStore(subscribeConsent, readConsent, noConsent);

  useEffect(() => {
    if (consent === "granted") load();
  }, [consent]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: una vista por ruta (y al aceptar)
  useEffect(() => {
    if (consent === "granted") trackPage(window.location.pathname);
  }, [pathname, consent]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const el = target?.closest<HTMLElement>("[data-track]");
      const name = el?.dataset.track;
      if (el && name) {
        track(name, paramsOf(el));
        return;
      }
      // Resto de enlaces que salen de Emer (tiendas, piezas de Explora…).
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.host === window.location.host || !link.protocol.startsWith("http")) return;
      track("outbound_click", {
        link_domain: link.hostname.replace(/^www\./, ""),
        link_url: link.href,
        section: link.closest("[aria-label]")?.getAttribute("aria-label") ?? undefined,
      });
    };
    const onError = (event: ErrorEvent) => {
      const where = event.filename ? ` @ ${event.filename.split("/").pop()}:${event.lineno}` : "";
      track("exception", { description: `${event.message}${where}`, fatal: false });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
      track("exception", { description: `promise: ${reason}`, fatal: false });
    };
    let start: number | null = null;
    const onWake = () => {
      if (isWaking()) {
        start = wakeSince() ?? Date.now();
      } else if (start !== null) {
        track("backend_wake_wait", { seconds: Math.round((Date.now() - start) / 1000) });
        start = null;
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    const unsubscribe = subscribeWake(onWake);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      unsubscribe();
    };
  }, []);

  return <ConsentBanner consent={consent} />;
}
