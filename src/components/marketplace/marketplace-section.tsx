import { cookies } from "next/headers";
import { DisplayTitle } from "@/components/ui/display-title";
import { WakeRetry } from "@/components/wake-retry";
import { getBrands } from "@/lib/data";
import { type Device, gridCookie, parseColumns } from "@/lib/grid";
import { BRAND_PARAM, brandsFromParam, EMPTY_FILTERS, type Filters } from "@/lib/marketplace";
import { getMarketplacePage } from "@/lib/marketplace-data";
import { withinGrace } from "@/lib/wake-grace";
import { GridLoader } from "./grid-loader";
import { Marketplace } from "./marketplace";
import styles from "./marketplace-section.module.css";

type Props = Pick<PageProps<"/web">, "searchParams"> & { device: Device };

/** Marcas y primera página; `null` si el backend ha fallado. */
async function load(requested: string | string[] | undefined) {
  const brands = await getBrands();
  if (!brands.ok) return null;
  const filters: Filters = {
    ...EMPTY_FILTERS,
    brands: brandsFromParam(requested, new Set(brands.data.map((b) => b.id))),
  };
  const initial = await getMarketplacePage(filters);
  return initial.ok ? { brands: brands.data, filters, initial: initial.data } : null;
}

/**
 * Servidor: marcas y primera página de productos. El cliente sigue desde aquí. `?brand=<uuid>`
 * abre con esas marcas seleccionadas (si existen en `/brands`; si no, se ignora). Las columnas del
 * grid salen de su cookie: la primera pintura ya tiene las del usuario. Si el backend no contesta
 * enseguida (dormido), `WakeRetry` avisa, reintenta y refresca al despertar.
 */
export async function MarketplaceSection({ searchParams, device }: Props) {
  const requested = (await searchParams)[BRAND_PARAM];
  const columns = parseColumns(device, (await cookies()).get(gridCookie(device))?.value);
  const data = await withinGrace(load(requested));

  if (!data) {
    return (
      <WakeRetry
        attempt={Date.now()}
        error={
          <div className={styles.error} role="alert">
            <DisplayTitle
              as="h1"
              lines={[["SIN", "*CONEXIÓN"]]}
              className={styles.title}
              play="load"
            />
            <p className={styles.text}>
              No hemos podido cargar el catálogo. Vuelve a intentarlo en un momento.
            </p>
          </div>
        }
      />
    );
  }

  return (
    <Marketplace
      brands={data.brands}
      initial={data.initial}
      initialFilters={data.filters}
      device={device}
      initialColumns={columns}
    />
  );
}

/**
 * Misma geometría que el Marketplace mientras llegan los datos (sin CLS), con el loader centrado en
 * pantalla: al entrar desde la Landing (o con el backend dormido) se ve que está cargando.
 */
export function MarketplaceSkeleton() {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <p className="sr-only">Cargando el catálogo</p>
      <div className={styles.loading}>
        <GridLoader words={[]} caption="CARGANDO MARCAS" />
      </div>
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
