import { ApiError, baseUrl } from "./client";

export type SuggestionInput = { name: string | null; instagram: string | null };

/** Render tarda ~35 s en despertar: el primer envío tras un cold start debe aguantarlo. */
const TIMEOUT_MS = 50_000;

/**
 * POST /suggestions (FALTA EN BACKEND, docs/PENDIENTES.md). Mientras no exista, el 404 se
 * trata como error: nunca se simula un éxito. En modo fixtures responde como lo haría el
 * backend (el nombre «ERROR» fuerza el fallo para los tests).
 */
export async function postSuggestion(input: SuggestionInput): Promise<void> {
  if (process.env.EMER_API_FIXTURES === "1") {
    if (input.name === "ERROR") throw new ApiError("Fixture: error forzado", 500, "/suggestions");
    return;
  }
  const res = await fetch(`${baseUrl()}/suggestions`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, "/suggestions");
  }
}
