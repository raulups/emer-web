import { getTunnelData, TUNNEL_SIZE, type TunnelBrand } from "@/lib/landing-data";
import { FALLBACK_TOTAL } from "./content";
import styles from "./landing.module.css";
import { TunnelTile } from "./tunnel-tile";

type Props = { total: number; brands: readonly TunnelBrand[] };

/** 12 tarjetas (con marcas reales, o vacías mientras llegan). `data-total` lo lee el contador. */
export function TunnelTiles({ total, brands }: Props) {
  return (
    <div className={styles.tunnelSet} data-total={total}>
      {Array.from({ length: TUNNEL_SIZE }, (_, k) => {
        const brand = brands.length > 0 ? brands[k % brands.length] : undefined;
        return (
          <TunnelTile
            // biome-ignore lint/suspicious/noArrayIndexKey: 12 huecos fijos; una marca puede repetirse
            key={k}
            sources={brand?.sources ?? []}
            name={brand?.name ?? ""}
          />
        );
      })}
    </div>
  );
}

/** Servidor: lee las marcas del backend (en caché). Si falla, deja las tarjetas vacías. */
export async function TunnelData() {
  const data = await getTunnelData();
  return <TunnelTiles total={data?.total ?? FALLBACK_TOTAL} brands={data?.brands ?? []} />;
}
