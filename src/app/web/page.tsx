import { Suspense } from "react";
import { ExploraSection, ExploraSkeleton } from "@/components/explora/explora-section";
import {
  MarketplaceSection,
  MarketplaceSkeleton,
} from "@/components/marketplace/marketplace-section";
import { Shell } from "@/components/shell/shell";

/** Shell con el switch MARKETPLACE / EXPLORA (`Web.dc.html`). */
export default function WebPage({ searchParams }: PageProps<"/web">) {
  return (
    <Shell
      marketplace={
        <Suspense fallback={<MarketplaceSkeleton />}>
          <MarketplaceSection searchParams={searchParams} device="desktop" />
        </Suspense>
      }
      explora={
        <Suspense fallback={<ExploraSkeleton />}>
          <ExploraSection />
        </Suspense>
      }
    />
  );
}
