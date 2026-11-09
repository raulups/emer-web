/**
 * Espera al backend (Render free se duerme y puede tardar más de un minuto en despertar). Solo
 * cliente. Quien espera pide «retener» el aviso (`holdWake`); `<BackendWake />`, en el layout, lo
 * enseña mientras haya alguna retención.
 */

/** Sin respuesta en este tiempo, se asume que el backend duerme y sale el aviso. */
const GRACE_MS = 5_000;
/** Un intento colgado se corta y se repite. El servidor responde antes (lee con 45 s de tope). */
const ATTEMPT_TIMEOUT_MS = 60_000;
/** Pasado este tiempo se deja de insistir y quien llamó enseña su pantalla de error. */
const MAX_WAIT_MS = 10 * 60_000;
/** Lo que responden las rutas internas si el backend no contesta (o un proxy, si se cae). */
const RETRY_STATUS = new Set([502, 503, 504]);

const retryDelay = (attempt: number) => Math.min(2_000 + attempt * 1_000, 10_000);

const holds = new Set<symbol>();
const listeners = new Set<() => void>();
let since: number | null = null;

const notify = () => {
  for (const listener of listeners) listener();
};

/** Retiene el aviso hasta llamar a la función devuelta. `start`: desde cuándo cuenta el contador. */
export function holdWake(start = Date.now()): () => void {
  const token = Symbol();
  since = since === null ? start : Math.min(since, start);
  holds.add(token);
  if (holds.size === 1) notify();
  return () => {
    if (!holds.delete(token) || holds.size > 0) return;
    since = null;
    notify();
  };
}

export const subscribeWake = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const isWaking = () => holds.size > 0;
export const wakeSince = () => since;

function pause(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      window.clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener("abort", abort, { once: true });
  });
}

type Options = RequestInit & {
  /** Cuánto esperar antes de enseñar el aviso si la primera respuesta aún no ha llegado. */
  graceMs?: number;
};

/**
 * `fetch` que aguanta a que el backend despierte: repite solo hasta tener respuesta y mantiene el
 * aviso en pantalla mientras tanto. Cualquier respuesta que no sea de backend caído (un 200, un 400,
 * un 500) vuelve tal cual. Lanza si se aborta, sin red, o al agotar `MAX_WAIT_MS`.
 */
export async function wakeFetch(
  input: string,
  { graceMs = GRACE_MS, signal, ...init }: Options = {},
): Promise<Response> {
  const start = Date.now();
  let release: (() => void) | null = null;
  const show = () => {
    release ??= holdWake(start);
  };
  const timer = window.setTimeout(show, graceMs);

  try {
    for (let attempt = 0; ; attempt++) {
      const lastAttempt = Date.now() - start >= MAX_WAIT_MS;
      const timeout = AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
      try {
        const res = await fetch(input, {
          ...init,
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
        if (lastAttempt || !RETRY_STATUS.has(res.status)) return res;
      } catch (error) {
        if (lastAttempt || signal?.aborted || !navigator.onLine) throw error;
      }
      show();
      await pause(retryDelay(attempt), signal);
    }
  } finally {
    window.clearTimeout(timer);
    (release as (() => void) | null)?.();
  }
}
