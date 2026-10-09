const DEFAULT_TIMEOUT_MS = 15_000;
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

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { Accept: "application/json", ...init.headers },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new ApiError(`GET ${path} -> ${res.status}`, res.status, path);
      }
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      const retryable = !(error instanceof ApiError) || error.status >= 500;
      if (!retryable || attempt === MAX_RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }

  throw lastError;
}
