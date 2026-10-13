import type { Metadata } from "next";
import { Suspense } from "react";
import { ExploraSection, ExploraSkeleton } from "@/components/explora/explora-section";
import {
  MarketplaceSection,
  MarketplaceSkeleton,
} from "@/components/marketplace/marketplace-section";
import { Shell } from "@/components/shell/shell";

export const metadata: Metadata = { title: "Marketplace" };

/** Shell con el switch MARKETPLACE / EXPLORA (`Web.dc.html`). */
export default function WebPage() {
  return (
    <Shell
      marketplace={
        <Suspense fallback={<MarketplaceSkeleton />}>
          <MarketplaceSection />
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
