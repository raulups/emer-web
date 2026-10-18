"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import styles from "./grid-loader.module.css";

gsap.registerPlugin(useGSAP);

const FALLBACK_WORDS = ["PIEZAS", "MARCAS", "TALLAS", "COLORES"];
const MAX_WORDS = 6;

/**
 * Loader de resultados: una tragaperras de palabras (nombres de marca), cada una entre
 * corchetes, con una línea que barre debajo. Solo `transform` y `opacity`; sin movimiento,
 * palabra fija.
 */
export function GridLoader({ words }: { words: readonly string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const list = (words.length > 0 ? words : FALLBACK_WORDS)
    .slice(0, MAX_WORDS)
    .map((word) => word.toUpperCase());
  // La primera palabra se repite al final: el bucle vuelve a 0 sin salto.
  const reel = [...list, list[0] ?? ""];
  const key = list.join("|");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ repeat: -1 });
        gsap.from(root.current, { opacity: 0, y: 16, duration: 0.6, ease: "expo.out" });
        for (let i = 1; i < reel.length; i++) {
          tl.to(
            "[data-loader-reel]",
            { yPercent: (-100 * i) / reel.length, duration: 0.55, ease: "expo.inOut" },
            "+=0.32",
          );
        }
        tl.set("[data-loader-reel]", { yPercent: 0 });
        gsap.fromTo(
          "[data-loader-sweep]",
          { xPercent: -100 },
          { xPercent: 100, duration: 1.1, ease: "power2.inOut", repeat: -1 },
        );
      });
    },
    { scope: root, dependencies: [key], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={styles.loader} aria-hidden="true">
      <span className={styles.window}>
        <span className={styles.reel} data-loader-reel>
          {reel.map((word, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: la primera palabra se repite al final
            <span key={i} className={styles.word}>
              <span className={styles.bracket}>[</span>
              {word}
              <span className={styles.bracket}>]</span>
            </span>
          ))}
        </span>
      </span>
      <span className={styles.track}>
        <span className={styles.sweep} data-loader-sweep />
      </span>
      <span className={styles.caption}>BUSCANDO PIEZAS</span>
    </div>
  );
}
