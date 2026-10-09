import { SECTIONS } from "@/lib/config/sections";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { bus } from "./bus";

/**
 * Emite `section:change` cuando una sección cruza el 45 % del viewport (lo consume 02-topbar).
 * Se llama desde la página que contiene las secciones, no desde el layout.
 */
export function initSectionTracking(): () => void {
  const ctx = gsap.context(() => {
    for (const section of SECTIONS) {
      const el = document.getElementById(section.id);
      if (!el) continue;
      ScrollTrigger.create({
        trigger: el,
        start: "top 45%",
        end: "bottom 45%",
        onToggle: (self) => {
          if (self.isActive) bus.emit("section:change", { id: section.id, label: section.label });
        },
      });
    }
  });
  return () => ctx.revert();
}
