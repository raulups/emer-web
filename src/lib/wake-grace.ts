/** Con datos en caché o el backend despierto se responde antes; si no, se asume que duerme. */
const WAKE_GRACE_MS = 5_000;

/**
 * Espera una lectura como mucho unos segundos y, si no llega, devuelve `null` para que la sección
 * pinte `WakeRetry` en vez de dejar al usuario mirando un loader. La lectura sigue en segundo plano:
 * despierta el backend y llena la caché. Solo en tiempo de petición (antes de `connection()` o
 * `cookies()`, un temporizador rompería el prerender).
 */
export function withinGrace<T>(read: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), WAKE_GRACE_MS);
  });
  return Promise.race([read, timeout]).finally(() => clearTimeout(timer));
}
