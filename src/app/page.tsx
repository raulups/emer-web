import { Suspense } from "react";
import { FALLBACK_TOTAL } from "@/components/landing/content";
import { Landing } from "@/components/landing/landing";
import { TunnelData, TunnelTiles } from "@/components/landing/tunnel";

/** Landing (`Landing.dc.html`). Las marcas del túnel llegan con Suspense: la intro no espera al backend. */
export default function LandingPage() {
  return (
    <Landing
      tunnel={
        <Suspense fallback={<TunnelTiles total={FALLBACK_TOTAL} brands={[]} />}>
          <TunnelData />
        </Suspense>
      }
    />
  );
}
