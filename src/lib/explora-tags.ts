/** Tags de marca → secciones de Explora. Puro (servidor y cliente). */

/**
 * Secciones de Explora y los tags (`brands.tags`) que las llenan. En la API llegan en minúsculas y
 * en singular (`destacada`, `popular`, `novedad`, `emergente`; 2026-10-14): se aceptan también las
 * otras formas. Emergentes recoge además las marcas sin ningún tag.
 */
export const SECTION_TAGS = {
  destacados: ["destacados", "destacado", "destacadas", "destacada"],
  populares: ["populares", "popular"],
  novedades: ["novedades", "novedad"],
  emergentes: ["emergentes", "emergente"],
} as const;

export type ExploraSection = keyof typeof SECTION_TAGS;

/** Minúsculas, sin acentos y sin espacios sobrantes. */
export function normalizeTag(tag: string): string {
  return tag.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

const SECTION_OF = new Map<string, ExploraSection>(
  Object.entries(SECTION_TAGS).flatMap(([section, tags]) =>
    tags.map((tag) => [tag, section as ExploraSection] as const),
  ),
);

/** ¿Es un tag de sección (y no un tag descriptivo como «streetwear»)? */
export const isSectionTag = (tag: string): boolean => SECTION_OF.has(normalizeTag(tag));

/** Secciones en las que sale una marca (`tags` puede faltar: la API no envía campos vacíos). */
export function sectionsOf(tags: readonly string[] | null | undefined): Set<ExploraSection> {
  const list = (tags ?? []).map(normalizeTag).filter(Boolean);
  if (list.length === 0) return new Set(["emergentes"]);
  return new Set(
    list.map((tag) => SECTION_OF.get(tag)).filter((s): s is ExploraSection => s !== undefined),
  );
}
