import { getExploraData } from "@/lib/explora-data";
import { Explora } from "./explora";
import styles from "./explora.module.css";

/** Servidor: datos de Explora. El cliente anima desde aquí. */
export async function ExploraSection() {
  const data = await getExploraData();

  if (!data) {
    return (
      <div className={styles.error} role="alert">
        <h1 className={styles.errorTitle}>SIN CONEXIÓN</h1>
        <p className={styles.errorText}>
          No hemos podido cargar las marcas. Vuelve a intentarlo en un momento.
        </p>
      </div>
    );
  }

  return <Explora data={data} />;
}

/** Pantalla en blanco del alto de la vista mientras llegan los datos (sin CLS). */
export function ExploraSkeleton() {
  return <div className={styles.skeleton} aria-busy="true" />;
}
