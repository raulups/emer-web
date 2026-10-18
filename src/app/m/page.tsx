import { Suspense } from "react";
import {
  MarketplaceSection,
  MarketplaceSkeleton,
} from "@/components/marketplace/marketplace-section";
import { MobileShell } from "@/components/mobile/mobile-shell";

/**
 * Web de móvil: solo el Marketplace y el aviso de la app. No se enlaza nunca: `src/proxy.ts`
 * sirve aquí `/web` cuando la petición llega desde un teléfono.
 */
export default function MobileWebPage({ searchParams }: PageProps<"/m">) {
  return (
    <MobileShell>
      <Suspense fallback={<MarketplaceSkeleton />}>
        <MarketplaceSection searchParams={searchParams} />
      </Suspense>
    </MobileShell>
  );
}
