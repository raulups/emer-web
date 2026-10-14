"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { SCROLL_TO_DURATION, SMOOTH_SCROLL, setLenis } from "@/lib/motion/scroll";

gsap.registerPlugin(useGSAP);

/**
 * Scroll suave con inercia global (layout raíz; no se desmonta al navegar). Lenis no tiene reloj
 * propio (`autoRaf: false`): corre en `gsap.ticker` con prioridad, así los bucles de las páginas
 * leen en el mismo frame el `scrollY` que acaba de escribir. Con «reducir movimiento» no se crea.
 */
export function SmoothScroll() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const lenis = new Lenis({ ...SMOOTH_SCROLL, autoRaf: false });
      setLenis(lenis);

      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick, false, true);
      gsap.ticker.lagSmoothing(0);

      // Anclas internas (`#id`) con `lenis.scrollTo`. Respeta los enlaces que ya gestionan su clic
      // (`preventDefault`), a diferencia de la opción `anchors` de Lenis.
      const onClick = (event: MouseEvent) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
        const link = (event.target as Element | null)?.closest?.("a[href^='#']");
        const hash = link?.getAttribute("href");
        if (!hash || hash === "#") return;
        const target = document.getElementById(decodeURIComponent(hash.slice(1)));
        if (!target) return;
        event.preventDefault();
        lenis.scrollTo(target, { duration: SCROLL_TO_DURATION });
        history.pushState(null, "", hash);
      };
      document.addEventListener("click", onClick);

      // Medidas: Lenis observa el tamaño del documento; las fuentes y las imágenes tardías
      // pueden cambiarlo sin redimensionar la ventana.
      const resize = () => lenis.resize();
      document.fonts.ready.then(resize);
      window.addEventListener("load", resize);

      return () => {
        document.removeEventListener("click", onClick);
        window.removeEventListener("load", resize);
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        setLenis(null);
        lenis.destroy();
      };
    });
    return () => mm.revert();
  });

  return null;
}
