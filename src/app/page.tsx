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
import { Topbar } from "@/components/sections/topbar/topbar";
import { HomeMotion } from "@/components/shell/home-motion";
import { SECTIONS, type SectionId } from "@/lib/config/sections";

/** Sección aún sin implementar: hueco con su id para la nav, el snap y `section:change`. */
function Placeholder({ id }: { id: SectionId }) {
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) return null;
  return (
    <section
      id={section.id}
      data-section={section.label}
      data-section-placeholder=""
      aria-label={section.ariaLabel}
      className="flex min-h-svh items-center justify-center border-b border-ink"
    >
      <p className="text-display-m" aria-hidden="true">
        {section.n} {section.label}
      </p>
    </section>
  );
}

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
        <Placeholder id="sugiere" />
        <HomeMotion />
      </main>
      <Footer />
    </>
  );
}
