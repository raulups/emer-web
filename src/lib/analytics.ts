/**
 * Estadísticas de uso (Google Analytics 4, la misma propiedad que la app en Firebase). Solo
 * cliente. Nada se carga ni se envía hasta que la persona acepta en el aviso de cookies: sin
 * consentimiento, `track` no hace nada. Los nombres de eventos son los de la app.
 */

export const MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
const CONSENT_KEY = "emer:analytics-consent";
const MAX_VALUE = 100;
/** 13 meses: duración máxima que recomienda la AEPD para cookies de analítica. */
const COOKIE_EXPIRES_S = 13 * 30 * 24 * 60 * 60;

export type Consent = "granted" | "denied";
type Param = string | number | boolean | null | undefined;
type Params = Record<string, Param>;

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const listeners = new Set<() => void>();
let consent: Consent | null | undefined;
let loaded = false;

export function readConsent(): Consent | null {
  if (consent !== undefined) return consent;
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    consent = value === "granted" || value === "denied" ? value : null;
  } catch {
    consent = null;
  }
  return consent;
}

export const subscribeConsent = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function setConsent(value: Consent): void {
  consent = value;
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Sin almacenamiento se vuelve a preguntar en la próxima visita.
  }
  if (value === "granted") load();
  else revoke();
  for (const listener of listeners) listener();
}

/** Inserta gtag.js una sola vez (solo con consentimiento y si hay ID configurado). */
export function load(): void {
  if (!MEASUREMENT_ID || readConsent() !== "granted") return;
  if (loaded) {
    window.gtag?.("consent", "update", { analytics_storage: "granted" });
    return;
  }
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // biome-ignore lint/complexity/noArguments: gtag.js lee el objeto `arguments` tal cual
    window.dataLayer?.push(arguments);
  };
  window.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: COOKIE_EXPIRES_S,
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);
}

/** Al retirar el consentimiento: deja de medir y borra las cookies `_ga*` de este dominio. */
function revoke(): void {
  window.gtag?.("consent", "update", { analytics_storage: "denied" });
  const domains = ["", location.hostname, `.${location.hostname.split(".").slice(-2).join(".")}`];
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0]?.trim();
    if (!name?.startsWith("_ga")) continue;
    for (const domain of domains) {
      // biome-ignore lint/suspicious/noDocumentCookie: borrado de las cookies de Analytics
      document.cookie = `${name}=; path=/; max-age=0${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

export function track(name: string, params: Params = {}): void {
  if (readConsent() !== "granted" || !window.gtag) return;
  const clean: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    clean[key] =
      typeof value === "string"
        ? value.slice(0, MAX_VALUE)
        : typeof value === "boolean"
          ? String(value)
          : value;
  }
  window.gtag("event", name, clean);
}

export function trackPage(path: string): void {
  track("page_view", { page_path: path, page_location: location.href, page_title: document.title });
}
