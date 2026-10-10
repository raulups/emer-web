import type { Metadata } from "next";
import { Suspense } from "react";
import { MarketplaceContent } from "@/components/sections/marketplace-page/marketplace-content";
import { MarketplaceFallback } from "@/components/sections/marketplace-page/skeletons";
import { SearchFallback, SearchSection } from "@/components/sections/search/search-section";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Todas las prendas de las marcas de Emer en un solo sitio: filtra por marca, categoría y precio.",
};

export default function MarketplacePage({ searchParams }: PageProps<"/marketplace">) {
  return (
    <>
      <Suspense fallback={<MarketplaceFallback />}>
        <MarketplaceContent searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<SearchFallback />}>
        <SearchSection />
      </Suspense>
    </>
  );
}
