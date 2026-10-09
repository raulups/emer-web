import type { ApiEnvelope } from "./types";

/** El backend (Render free) tarda ~35 s en despertar: el timeout debe cubrirlo. */
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;

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
 * GET contra el backend. Devuelve el envoltorio completo ({ data, meta }).
 * Los 404 de ruta y los 429/5xx pueden no traer JSON, por eso el error se lee con tolerancia.
 */
export async function apiGet<T>(path: string): Promise<ApiEnvelope<T>> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, path);
      }
      return (await res.json()) as ApiEnvelope<T>;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
    }
  }

  throw lastError;
}
