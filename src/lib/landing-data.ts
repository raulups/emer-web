import { getBrands } from "@/lib/data";

/** Imágenes de marca que vuelan por el túnel (el README pide 12). */
export const TUNNEL_SIZE = 12;

export type TunnelBrand = {
  id: string;
  name: string;
  /** Imagen de la marca y, por si falla, la del primer producto. */
  sources: string[];
};

export type TunnelData = {
  /** Total de marcas: hasta dónde cuenta el contador gigante. */
  total: number;
  brands: TunnelBrand[];
};

/** Marcas reales para el túnel de la Landing (solo servidor). `null` si el backend no responde. */
export async function getTunnelData(): Promise<TunnelData | null> {
  const result = await getBrands();
  if (!result.ok) return null;
  const withImage = result.data
    .map((brand) => ({
      id: brand.id,
      name: brand.name,
      sources: [brand.img, brand.preview_products[0]?.main_image_url].filter((src): src is string =>
        Boolean(src),
      ),
    }))
    .filter((brand) => brand.sources.length > 0);
  return { total: result.data.length, brands: withImage };
}
