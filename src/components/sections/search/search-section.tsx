import { getAllBrands } from "@/lib/api";
import { Search, type SearchBrand } from "./search";

/** Servidor: reutiliza la lectura cacheada de marcas (sin petición nueva) y la pasa al cliente. */
export async function SearchSection() {
  const result = await getAllBrands();
  if (!result.ok) return <Search state="error" brands={[]} />;
  const brands: SearchBrand[] = result.data.map((b) => ({
    id: b.id,
    name: b.name,
    url: b.url,
    img: b.img,
  }));
  return <Search state="ready" brands={brands} />;
}

/** Mientras llegan los datos el buscador ya puede abrirse (contador «— MARCAS»). */
export function SearchFallback() {
  return <Search state="loading" brands={[]} />;
}
