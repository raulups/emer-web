import { cookies } from "next/headers";
import { DisplayTitle } from "@/components/ui/display-title";
import { getBrands } from "@/lib/data";
import { type Device, gridCookie, parseColumns } from "@/lib/grid";
import { BRAND_PARAM, brandsFromParam, EMPTY_FILTERS, type Filters } from "@/lib/marketplace";
import { getMarketplacePage } from "@/lib/marketplace-data";
import { GridLoader } from "./grid-loader";
import { Marketplace } from "./marketplace";
import styles from "./marketplace-section.module.css";

type Props = Pick<PageProps<"/web">, "searchParams"> & { device: Device };

/**
 * Servidor: marcas y primera página de productos. El cliente sigue desde aquí. `?brand=<uuid>`
 * abre con esas marcas seleccionadas (si existen en `/brands`; si no, se ignora). Las columnas del
 * grid salen de su cookie: la primera pintura ya tiene las del usuario.
 */
export async function MarketplaceSection({ searchParams, device }: Props) {
  const requested = (await searchParams)[BRAND_PARAM];
  const columns = parseColumns(device, (await cookies()).get(gridCookie(device))?.value);
  const brands = await getBrands();
  const filters: Filters = brands.ok
    ? {
        ...EMPTY_FILTERS,
        brands: brandsFromParam(requested, new Set(brands.data.map((b) => b.id))),
      }
    : EMPTY_FILTERS;
  const initial = await getMarketplacePage(filters.brands.length > 0 ? filters : EMPTY_FILTERS);

  if (!brands.ok || !initial.ok) {
    return (
      <div className={styles.error} role="alert">
        <DisplayTitle as="h1" lines={[["SIN", "*CONEXIÓN"]]} className={styles.title} play="load" />
        <p className={styles.text}>
          No hemos podido cargar el catálogo. Vuelve a intentarlo en un momento.
        </p>
      </div>
    );
  }

  return (
    <Marketplace
      brands={brands.data}
      initial={initial.data}
      initialFilters={filters}
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
