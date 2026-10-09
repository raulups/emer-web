import { connection } from "next/server";
import { getAllBrands, getCategories, getProducts } from "@/lib/api";
import { POOL_LIMIT, toMarketItems } from "./data";
import s from "./marketplace.module.css";
import { MarketplaceCarousel } from "./marketplace-carousel";
import { MarketplaceCta, MarketplaceHead } from "./marketplace-head";

/** Servidor: pool de productos con imagen, cruzado con marcas y categorías (lecturas cacheadas). */
export async function MarketplaceSection() {
  const [products, brands, categories] = await Promise.all([
    getProducts({ limit: POOL_LIMIT, sort: "newest" }),
    getAllBrands(),
    getCategories(),
  ]);
  if (!products.ok) {
    await connection(); // el error nunca se hornea en el HTML estático
    return <MarketplaceCarousel state="error" />;
  }
  const items = toMarketItems(
    products.data.items,
    brands.ok ? brands.data : [],
    categories.ok ? categories.data : [],
  );
  if (items.length === 0) return <MarketplaceCarousel state="empty" />;
  return <MarketplaceCarousel state="ready" items={items} />;
}

/** Hueco con la misma geometría mientras llegan los datos. */
export function MarketplaceFallback() {
  return (
    <section
      id="marketplace"
      data-section="MARKETPLACE"
      aria-label="Marketplace"
      aria-busy="true"
      className={s.section}
    >
      <MarketplaceHead withHint />
      <div className={s.controls} />
      <div className={s.fallback} />
      <MarketplaceCta />
    </section>
  );
}
