import { HomeMotion } from "@/components/shell/home-motion";
import { HERO_ID, SECTIONS } from "@/lib/config/sections";

/**
 * Esqueleto de 00-shell: secciones vacías para probar el snap del hero y `section:change`.
 * Cada sección se sustituirá por su implementación real (03-hero, 04-emergentes, ...).
 */
export default function Home() {
  return (
    <main id="contenido" tabIndex={-1} className="outline-none">
      <h1 className="sr-only">Emer — Marcas pequeñas, un solo sitio</h1>
      {SECTIONS.map((section) => {
        const isHero = section.id === HERO_ID;
        return (
          <section
            key={section.id}
            id={section.id}
            data-section={section.label}
            data-cursor={isHero ? "hero" : undefined}
            aria-label={section.ariaLabel}
            className={
              isHero
                ? "flex h-svh min-h-[560px] items-center justify-center bg-hero text-paper"
                : "flex min-h-svh items-center justify-center border-b border-ink"
            }
          >
            <p className="text-display-m" aria-hidden="true">
              {section.n} {section.label}
            </p>
          </section>
        );
      })}
      <HomeMotion />
    </main>
  );
}
