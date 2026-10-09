import { getAllBrands, getPreviewProductsById } from "@/lib/api";
import { selectEmergentes, toEmergente } from "./data";
import { EmergentesTrack } from "./emergentes-track";

/**
 * Servidor: emergentes (isEmergent + imagen, máx. 8). Sin marcas o con error de datos la
 * sección no se monta (handoff 04, estados).
 */
export async function EmergentesSection() {
  const result = await getAllBrands();
  if (!result.ok) return null;
  const selected = selectEmergentes(result.data);
  if (selected.length === 0) return null;
  const products = await getPreviewProductsById(selected);
  return <EmergentesTrack brands={selected.map((brand) => toEmergente(brand, products))} />;
}

/**
 * Hueco mientras llegan los datos. Sin id: si la sección acaba sin montarse, no deja un
 * destino de nav ni un `section:change` huérfanos.
 */
export function EmergentesFallback() {
  return <div aria-hidden="true" className="h-svh" />;
}
