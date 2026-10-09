import { cacheLife } from "next/cache";
import type { ApiEnvelope } from "./types";

/** El backend (Render free) tarda ~35 s en despertar: el timeout debe cubrirlo. */
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
/**
 * Durante `next build` un "use cache" que tarde más de 50 s rompe el prerender:
 * un solo intento de 40 s. Si falla, la sección se resuelve en tiempo de petición.
 */
const BUILD_TIMEOUT_MS = 40_000;
const isBuild = () => process.env.NEXT_PHASE === "phase-production-build";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Resultado de una lectura cacheada. Las funciones con "use cache" NO lanzan: en Next 16 un
 * error dentro de "use cache" rompe el prerender aunque el llamador lo capture.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status?: number };

/**
 * Ejecuta una lectura dentro de un "use cache". Si va bien, cachea con `profile`.
 * Si falla, cachea solo segundos (`cacheLife("seconds")` la excluye del prerender:
 * el error nunca se hornea en el HTML estático y se reintenta en la siguiente petición).
 */
const PROFILES = {
  minutes: () => cacheLife("minutes"),
  hours: () => cacheLife("hours"),
  days: () => cacheLife("days"),
} as const;

export async function settle<T>(
  work: () => Promise<T>,
  profile: keyof typeof PROFILES,
): Promise<ApiResult<T>> {
  try {
    const data = await work();
    PROFILES[profile]();
    return { ok: true, data };
  } catch (error) {
    cacheLife("seconds");
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api]", message);
    return {
      ok: false,
      error: message,
      status: error instanceof ApiError ? error.status : undefined,
    };
  }
}

function baseUrl(): string {
  const url = process.env.EMER_API_URL;
  if (!url) throw new Error("EMER_API_URL no está definida (ver .env.example)");
  return url.replace(/\/$/, "");
}

type QueryValue = string | number | boolean | undefined | null | readonly string[];

/** Construye el query string omitiendo valores vacíos. Los arrays se envían separados por coma. */
export function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) search.set(key, value.join(","));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true; // red / timeout
  return error.status === 429 || error.status >= 500;
}

/**
 * GET contra el backend. Devuelve el envoltorio completo ({ data, meta }) o lanza `ApiError`.
 * Los 404 de ruta y los 429/5xx pueden no traer JSON, por eso el error se lee con tolerancia.
 */
export async function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  if (process.env.EMER_API_FIXTURES === "1") {
    const { fixtureGet } = await import("./fixtures");
    const envelope = fixtureGet<T>(path);
    if (envelope.error) throw new ApiError(envelope.error, 404, path);
    return envelope;
  }

  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const building = isBuild();
  const retries = building ? 0 : MAX_RETRIES;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(building ? BUILD_TIMEOUT_MS : TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, path);
      }
      return (await res.json()) as ApiEnvelope<T>;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
    }
  }

  throw lastError;
}
