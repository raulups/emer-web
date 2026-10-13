import { getBrands } from "@/lib/data";
import { EMPTY_FILTERS } from "@/lib/marketplace";
import { getMarketplacePage } from "@/lib/marketplace-data";
import { Marketplace } from "./marketplace";
import styles from "./marketplace-section.module.css";

/** Servidor: marcas y primera página de productos. El cliente sigue desde aquí. */
export async function MarketplaceSection() {
  const [brands, initial] = await Promise.all([getBrands(), getMarketplacePage(EMPTY_FILTERS)]);

  if (!brands.ok || !initial.ok) {
    return (
      <div className={styles.error} role="alert">
        <h1 className={styles.title}>SIN CONEXIÓN</h1>
        <p className={styles.text}>
          No hemos podido cargar el catálogo. Vuelve a intentarlo en un momento.
        </p>
      </div>
    );
  }

  return <Marketplace brands={brands.data} initial={initial.data} />;
}

/** Misma geometría que el Marketplace mientras llegan los datos (sin CLS). */
export function MarketplaceSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <p className="sr-only">Cargando el catálogo</p>
      <div className={styles.aside} />
      <ul className={styles.grid}>
        {Array.from({ length: 8 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: huecos fijos sin identidad
          <li key={i} className={styles.card} />
        ))}
      </ul>
    </div>
  );
}
