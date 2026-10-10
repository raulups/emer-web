import { getAllBrands, getCategories, getProduct } from "@/lib/api";
import { brandNames, countPieces, loadPage, toBrandVM, toCard } from "@/lib/marketplace/stream";
import type { CategoryVM } from "@/lib/marketplace/types";
import { parseQuery } from "@/lib/marketplace/url";
import { MarketplaceView } from "./marketplace-view";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Servidor: filtros de la URL → primera página, recuentos y (si hay `?pieza=`) la ficha. */
export async function MarketplaceContent({ searchParams }: { searchParams: SearchParams }) {
  const query = parseQuery(await searchParams);
  const [categories, brands] = await Promise.all([getCategories(), getAllBrands()]);
  const brandList = brands.ok ? brands.data : [];

  const [page, total, piece] = await Promise.all([
    loadPage(query, brandList, null),
    countPieces(query),
    // Si la pieza ya viene en la primera página se evita la petición (se resuelve más abajo).
    query.pieza ? getProduct(query.pieza) : Promise.resolve(null),
  ]);

  const names = brandNames(brandList);
  const cats: CategoryVM[] = categories.ok ? categories.data : [];
  const ok = page.ok && total.ok;

  return (
    <MarketplaceView
      status={ok ? "ok" : "error"}
      categories={cats}
      brands={brandList.map(toBrandVM)}
      query={query}
      initial={{
        items: page.ok ? page.data.items.map((p) => toCard(p, names)) : [],
        next: page.ok ? page.data.next : null,
        total: total.ok ? total.data : 0,
      }}
      detail={piece?.ok && piece.data ? toCard(piece.data, names) : null}
    />
  );
}
