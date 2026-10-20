import type { ExploraBrand } from "@/lib/explora-data";

/** Atributos para que el cursor propio se convierta en el logo de la marca (ver `cursor.tsx`). */
export function cursorLogo(brand: Pick<ExploraBrand, "name" | "logo">) {
  return {
    "data-cursor": "logo",
    "data-cursor-logo": brand.logo ?? undefined,
    "data-cursor-label": brand.name,
  } as const;
}
