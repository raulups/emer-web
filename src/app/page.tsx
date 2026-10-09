import { Suspense } from "react";
import { CatalogFallback, CatalogSection } from "@/components/sections/catalog/catalog-section";
import {
  EmergentesFallback,
  EmergentesSection,
} from "@/components/sections/emergentes/emergentes-section";
import { Footer } from "@/components/sections/footer/footer";
import { HeroFallback, HeroSection } from "@/components/sections/hero/hero-section";
import {
  MarketplaceFallback,
  MarketplaceSection,
} from "@/components/sections/marketplace/marketplace-section";
import { SearchFallback, SearchSection } from "@/components/sections/search/search-section";
import { SugiereSection } from "@/components/sections/sugiere/sugiere-section";
import { Topbar } from "@/components/sections/topbar/topbar";
import { HomeMotion } from "@/components/shell/home-motion";

export default function Home() {
  return (
    <>
      <Topbar />
      <main id="contenido" tabIndex={-1} className="outline-none">
        <h1 className="sr-only">Emer — Marcas pequeñas, un solo sitio</h1>
        <Suspense fallback={<HeroFallback />}>
          <HeroSection />
        </Suspense>
        <Suspense fallback={<EmergentesFallback />}>
          <EmergentesSection />
        </Suspense>
        <Suspense fallback={<CatalogFallback />}>
          <CatalogSection />
        </Suspense>
        <Suspense fallback={<MarketplaceFallback />}>
          <MarketplaceSection />
        </Suspense>
        <SugiereSection />
        <HomeMotion />
      </main>
      <Footer />
      <Suspense fallback={<SearchFallback />}>
        <SearchSection />
      </Suspense>
    </>
  );
}
