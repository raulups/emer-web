import { ApiError, baseUrl } from "./client";

/** Render tarda ~35 s en despertar: el primer envío tras un cold start debe aguantarlo. */
const TIMEOUT_MS = 50_000;
/** Origen que se guarda con el email (el aviso de la web de móvil). */
const SOURCE = "web-mobile";

/**
 * POST /waitlist: apunta `email` para avisarle cuando salga la app. `created` es `false` si ya
 * estaba. En modo fixtures responde como el backend (un email que empieza por «error» falla).
 */
export async function postWaitlist(email: string): Promise<{ created: boolean }> {
  if (process.env.EMER_API_FIXTURES === "1") {
    if (email.startsWith("error")) throw new ApiError("Fixture: error forzado", 500, "/waitlist");
    return { created: !email.startsWith("repe") };
  }
  const res = await fetch(`${baseUrl()}/waitlist`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ email, source: SOURCE }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as {
    data?: { created?: boolean } | null;
    error?: string | null;
  };
  if (!res.ok) throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status, "/waitlist");
  return { created: body.data?.created ?? true };
}
