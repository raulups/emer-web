import type { Metadata } from "next";
import { Suspense } from "react";
import {
  MarketplaceSection,
  MarketplaceSkeleton,
} from "@/components/marketplace/marketplace-section";
import { Shell } from "@/components/shell/shell";
import { ViewPlaceholder } from "@/components/views/view-placeholder";

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
      explora={<ViewPlaceholder title="Explora" fullBleed />}
    />
  );
}
