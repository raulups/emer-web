import { connection } from "next/server";
import { DisplayTitle } from "@/components/ui/display-title";
import { WakeRetry } from "@/components/wake-retry";
import { getExploraData } from "@/lib/explora-data";
import { withinGrace } from "@/lib/wake-grace";
import { Explora } from "./explora";
import styles from "./explora.module.css";

/**
 * Servidor: datos de Explora. El cliente anima desde aquí. Siempre en tiempo de petición: el aviso
 * de backend dormido no debe quedar horneado en el HTML. Si no hay datos enseguida, `WakeRetry`
 * avisa, reintenta y refresca al despertar.
 */
export async function ExploraSection() {
  await connection();
  const data = await withinGrace(getExploraData());

  if (!data) {
    return (
      <WakeRetry
        attempt={Date.now()}
        error={
          <div className={styles.error} role="alert">
            <DisplayTitle
              as="h1"
              lines={[["SIN", "*CONEXIÓN"]]}
              className={styles.errorTitle}
              play="load"
            />
            <p className={styles.errorText}>
              No hemos podido cargar las marcas. Vuelve a intentarlo en un momento.
            </p>
          </div>
        }
      />
    );
  }

  return <Explora data={data} />;
}

/** Pantalla en blanco del alto de la vista mientras llegan los datos (sin CLS). */
export function ExploraSkeleton() {
  return <div className={styles.skeleton} aria-busy="true" />;
}
