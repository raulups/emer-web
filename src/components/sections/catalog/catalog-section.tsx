import { connection } from "next/server";
import { getAllBrands } from "@/lib/api";
import s from "./catalog.module.css";
import { CatalogGrid } from "./catalog-grid";
import { catalogRows, toCatalogBrand } from "./layout";

/** Destino del enlace «Saltar el catálogo». */
const NEXT = "marketplace" as const;

/** Servidor: datos y reparto de filas (determinista). La misma lectura cacheada que el hero. */
export async function CatalogSection() {
  const result = await getAllBrands();
  if (!result.ok) {
    await connection(); // el error nunca se hornea en el HTML estático
    return <CatalogGrid state="error" nextId={NEXT} />;
  }
  if (result.data.length === 0) return <CatalogGrid state="empty" nextId={NEXT} />;
  return (
    <CatalogGrid state="ready" nextId={NEXT} rows={catalogRows(result.data.map(toCatalogBrand))} />
  );
}

/** Hueco con la misma geometría mientras llegan los datos. */
export function CatalogFallback() {
  return (
    <section
      id="catalogo"
      data-section="CATÁLOGO"
      aria-label="Todas las marcas"
      aria-busy="true"
      className={s.section}
    />
  );
}
