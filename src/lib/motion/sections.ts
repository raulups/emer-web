import { isSectionId, SECTIONS, type SectionId } from "@/lib/config/sections";
import { ScrollTrigger } from "@/lib/gsap";
import { bus } from "./bus";

let refreshTimer: number | undefined;

/**
 * Recalcula las posiciones de ScrollTrigger cuando cambia la altura de la página (secciones que
 * llegan por streaming, estados vacíos...). Agrupado para no hacer varios refresh seguidos.
 */
export function scheduleScrollRefresh() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
}

/**
 * Emite `section:change` cuando la sección cruza el 45 % del viewport (lo consume 02-topbar).
 * Cada sección se registra a sí misma al montarse: así funciona aunque llegue por streaming
 * y sustituya a su fallback (que tiene el mismo id).
 */
export function trackSection(el: HTMLElement, id: SectionId): () => void {
  const section = SECTIONS.find((s) => s.id === id);
  if (!section) return () => {};
  const trigger = ScrollTrigger.create({
    trigger: el,
    start: "top 45%",
    end: "bottom 45%",
    onToggle: (self) => {
      if (self.isActive) bus.emit("section:change", { id: section.id, label: section.label });
    },
  });
  scheduleScrollRefresh();
  return () => {
    trigger.kill();
    scheduleScrollRefresh();
  };
}

/** Seguimiento de las secciones que aún son placeholders (`data-section-placeholder`). */
export function initSectionTracking(): () => void {
  const cleanups = Array.from(document.querySelectorAll<HTMLElement>("[data-section-placeholder]"))
    .filter((el) => isSectionId(el.id))
    .map((el) => trackSection(el, el.id as SectionId));
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}
