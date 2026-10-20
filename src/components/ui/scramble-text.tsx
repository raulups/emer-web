"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { scramble } from "@/lib/motion/scramble";

gsap.registerPlugin(useGSAP);

type Props = {
  text: string;
  className?: string;
  /** Baraja al entrar en pantalla (una vez). */
  view?: boolean;
  /** Baraja al pasar el ratón por el ancestro `[data-scramble-hover]` más cercano (o por sí mismo). */
  hover?: boolean;
  /**
   * Baraja cada vez que el ancestro `[data-scramble-in]` más cercano gana `data-in` (secciones de
   * Explora cuyo bucle decide cuándo «entran»). Sustituye a `view`.
   */
  onIn?: boolean;
};

/**
 * Etiqueta con el «scramble» de signal-a.studio: las letras se barajan y se asientan de izquierda a
 * derecha al entrar en pantalla, con hover y cada vez que cambia el texto. Pensada para Geist Mono
 * (ancho fijo: no mueve nada alrededor). Fuera de la animación el texto es siempre el real.
 */
export function ScrambleText({ text, className, view = true, hover = true, onIn = false }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const latest = useRef(text);
  // Lo lee la limpieza del efecto, que React ejecuta después de haber escrito ya el texto nuevo.
  latest.current = text;
  const shown = useRef(text);
  const seen = useRef(!view || onIn);

  useGSAP(
    () => {
      const el = ref.current;
      const node = el?.firstChild;
      if (!el || !(node instanceof Text)) return;
      const changed = shown.current !== text;
      shown.current = text;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let stop = () => {};
        const play = () => {
          stop();
          stop = scramble(node, latest.current);
        };
        if (changed) play();

        const host = el.closest<HTMLElement>("[data-scramble-hover]") ?? el;
        const canHover = hover && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        if (canHover) host.addEventListener("pointerenter", play);

        const observer = seen.current
          ? null
          : new IntersectionObserver(
              ([entry]) => {
                if (!entry?.isIntersecting) return;
                seen.current = true;
                observer?.disconnect();
                play();
              },
              { threshold: 0.1 },
            );
        if (observer) observer.observe(el);

        const section = onIn ? el.closest<HTMLElement>("[data-scramble-in]") : null;
        let wasIn = section?.hasAttribute("data-in") ?? false;
        const entering = section
          ? new MutationObserver(() => {
              const isIn = section.hasAttribute("data-in");
              if (isIn && !wasIn) play();
              wasIn = isIn;
            })
          : null;
        if (section) entering?.observe(section, { attributes: true, attributeFilter: ["data-in"] });

        return () => {
          stop();
          if (node.data !== latest.current) node.data = latest.current;
          if (canHover) host.removeEventListener("pointerenter", play);
          observer?.disconnect();
          entering?.disconnect();
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [text, hover, onIn] },
  );

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
