"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import { scramble } from "@/lib/motion/scramble";
import styles from "./grid-loader.module.css";

gsap.registerPlugin(useGSAP);

const FALLBACK_WORDS = ["MARCAS", "PIEZAS", "TALLAS", "COLORES"];
const MAX_WORDS = 6;
/** Tiempo (s) que se queda cada palabra antes de barajarse a la siguiente. */
const STEP_S = 0.9;

type Props = {
  /** La primera es la que se ve al empezar (el filtro recién pulsado); después, las demás. */
  words: readonly string[];
  caption?: string;
};

/**
 * Loader de resultados: una palabra entre corchetes (marca, categoría, talla…) que se baraja a la
 * siguiente con el scramble de signal-a.studio, y una línea que barre debajo. Solo `transform` y
 * `opacity` (más el texto del nodo); sin movimiento, palabra fija.
 */
export function GridLoader({ words, caption = "BUSCANDO PIEZAS" }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLSpanElement>(null);
  const list = (words.length > 0 ? words : FALLBACK_WORDS)
    .slice(0, MAX_WORDS)
    .map((w) => w.toUpperCase());
  const key = list.join("|");

  useGSAP(
    () => {
      const node = word.current?.firstChild;
      if (!(node instanceof Text)) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(root.current, { opacity: 0, y: 16, duration: 0.6, ease: "expo.out" });
        gsap.fromTo(
          "[data-loader-sweep]",
          { xPercent: -100 },
          { xPercent: 100, duration: 1.1, ease: "power2.inOut", repeat: -1 },
        );
        let i = 0;
        let stop = () => {};
        let call: gsap.core.Tween | null = null;
        const next = () => {
          i = (i + 1) % list.length;
          stop();
          stop = scramble(node, list[i] ?? "");
          call = gsap.delayedCall(STEP_S, next);
        };
        if (list.length > 1) call = gsap.delayedCall(STEP_S, next);
        return () => {
          call?.kill();
          stop();
          node.data = list[0] ?? "";
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [key], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={styles.loader} aria-hidden="true">
      <span className={styles.window}>
        <span className={styles.bracket}>[</span>
        <span ref={word} className={styles.word}>
          {list[0]}
        </span>
        <span className={styles.bracket}>]</span>
      </span>
      <span className={styles.track}>
        <span className={styles.sweep} data-loader-sweep />
      </span>
      <span className={styles.caption}>{caption}</span>
    </div>
  );
}
