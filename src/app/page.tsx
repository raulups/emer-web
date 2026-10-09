import { Suspense } from "react";
import { HeroFallback, HeroSection } from "@/components/sections/hero/hero-section";
import { HomeMotion } from "@/components/shell/home-motion";
import { HERO_ID, SECTIONS } from "@/lib/config/sections";

/**
 * Home. Las secciones aún no implementadas son placeholders vacíos que se sustituirán
 * por su implementación real (04-emergentes, 05-catalogo, ...).
 */
export default function Home() {
  return (
    <main id="contenido" tabIndex={-1} className="outline-none">
      <h1 className="sr-only">Emer — Marcas pequeñas, un solo sitio</h1>
      <Suspense fallback={<HeroFallback />}>
        <HeroSection />
      </Suspense>
      {SECTIONS.filter((section) => section.id !== HERO_ID).map((section) => (
        <section
          key={section.id}
          id={section.id}
          data-section={section.label}
          aria-label={section.ariaLabel}
          className="flex min-h-svh items-center justify-center border-b border-ink"
        >
          <p className="text-display-m" aria-hidden="true">
            {section.n} {section.label}
          </p>
        </section>
      ))}
      <HomeMotion />
    </main>
  );
}
