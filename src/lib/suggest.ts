/**
 * Sugerir marca (handoff_sugerir_footer/README.md §1.3 y §3): validación y normalización.
 * Puro: lo usan el formulario y la ruta `/api/suggestions`.
 */

export const NAME_MAX = 40;
const INSTAGRAM = /^[a-zA-Z0-9._]{2,30}$/;

export type Suggestion = { name: string; instagram: string };

/** Lo que se teclea en Instagram: sin espacios ni `@` inicial. */
export const cleanInstagram = (value: string): string =>
  value.replace(/\s/g, "").replace(/^@+/, "");

export const validName = (name: string): boolean => {
  const n = name.trim().length;
  return n > 1 && n <= NAME_MAX;
};

export const validInstagram = (instagram: string): boolean =>
  INSTAGRAM.test(cleanInstagram(instagram));

/** Cuerpo de `POST /api/suggestions` → sugerencia lista para guardar (instagram en minúsculas). */
export function parseSuggestion(
  body: unknown,
): { ok: true; data: Suggestion } | { ok: false; error: string } {
  const { name, instagram } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || !validName(name)) return { ok: false, error: "Nombre no válido" };
  if (typeof instagram !== "string" || !validInstagram(instagram)) {
    return { ok: false, error: "Instagram no válido" };
  }
  return {
    ok: true,
    data: { name: name.trim(), instagram: cleanInstagram(instagram).toLowerCase() },
  };
}
