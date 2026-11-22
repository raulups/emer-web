/**
 * Lista de espera de la app (aviso de la web de móvil): validación del email.
 * Puro: lo usan el formulario y la ruta `/api/waitlist`. El backend vuelve a validar.
 */

export const EMAIL_MAX = 254;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Clave de `localStorage`: el email ya apuntado en este navegador (el aviso lo recuerda). */
export const WAITLIST_KEY = "emer:waitlist";

export const cleanEmail = (value: string): string => value.trim().toLowerCase();

export const validEmail = (value: string): boolean => {
  const email = cleanEmail(value);
  return email.length <= EMAIL_MAX && EMAIL.test(email);
};

/** Cuerpo de `POST /api/waitlist` → email listo para guardar. */
export function parseWaitlist(
  body: unknown,
): { ok: true; data: { email: string } } | { ok: false; error: string } {
  const { email } = (body ?? {}) as Record<string, unknown>;
  if (typeof email !== "string" || !validEmail(email))
    return { ok: false, error: "Email no válido" };
  return { ok: true, data: { email: cleanEmail(email) } };
}
