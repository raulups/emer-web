export const SECTIONS = [
  { id: "marcas", label: "MARCAS", n: "01", inNav: true, ariaLabel: "Marcas destacadas" },
  { id: "emergentes", label: "EMERGENTES", n: "02", inNav: true, ariaLabel: "Marcas emergentes" },
  { id: "catalogo", label: "CATÁLOGO", n: "03", inNav: true, ariaLabel: "Catálogo de marcas" },
  { id: "marketplace", label: "MARKETPLACE", n: "04", inNav: true, ariaLabel: "Marketplace" },
  { id: "sugiere", label: "SUGIERE", n: "05", inNav: false, ariaLabel: "Sugiere una marca" },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  n: string;
  inNav: boolean;
  ariaLabel: string;
}>;

export type Section = (typeof SECTIONS)[number];
export type SectionId = Section["id"];

export const HERO_ID: SectionId = "marcas";

export const isSectionId = (value: string): value is SectionId =>
  SECTIONS.some((section) => section.id === value);
