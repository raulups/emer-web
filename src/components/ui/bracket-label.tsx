"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type CSSProperties, useRef } from "react";
import { scrambleNodes } from "@/lib/motion/scramble";
import styles from "./bracket-label.module.css";

gsap.registerPlugin(useGSAP);

/** Retardo por letra del stagger en hover. */
const LETTER_STAGGER_MS = 28;

type Props = {
  label: string;
  /** Muestra los corchetes (se abren desde el texto hacia fuera). */
  bracketed: boolean;
  /** Opacidad de las letras: 40 %, 80 % o 100 %. */
  level: "dim" | "hover" | "full";
  /** Letras a −2px. */
  raised: boolean;
  /** Línea inferior a `scaleX(1)`. */
  lined: boolean;
  /** Lado desde el que crece la línea. */
  origin: "left" | "right";
};

/**
 * Etiqueta del switch y del botón [ MENÚ ]: letras con stagger, corchetes animados y línea
 * inferior. Al abrirse los corchetes las letras se barajan (scramble de signal-a.studio). Va dentro
 * de un botón; el texto accesible es `label` (las letras se ocultan).
 */
export function BracketLabel({ label, bracketed, level, raised, lined, origin }: Props) {
  const word = useRef<HTMLSpanElement>(null);
  const wasBracketed = useRef(bracketed);

  useGSAP(
    () => {
      const opened = bracketed && !wasBracketed.current;
      wasBracketed.current = bracketed;
      const el = word.current;
      if (!opened || !el) return;
      const letters = [...el.querySelectorAll<HTMLElement>("[data-letter]")];
      const nodes = letters.map((letter) => letter.firstChild).filter((n) => n instanceof Text);
      const texts = nodes.map((node) => node.data);
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const stop = scrambleNodes(nodes, texts);
        return () => {
          stop();
          nodes.forEach((node, i) => {
            node.data = texts[i] ?? node.data;
          });
        };
      });
      return () => mm.revert();
    },
    { scope: word, dependencies: [bracketed, label] },
  );

  return (
    <span
      className={styles.root}
      data-bracketed={bracketed || undefined}
      data-level={level}
      data-raised={raised || undefined}
      data-lined={lined || undefined}
      data-origin={origin}
    >
      <span ref={word} className={styles.word}>
        <span className={styles.open} aria-hidden="true">
          [
        </span>
        <span className="sr-only">{label}</span>
        {[...label].map((char, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: las letras de una etiqueta fija no cambian de orden
            key={i}
            className={styles.letter}
            data-letter
            style={{ "--delay": `${i * LETTER_STAGGER_MS}ms` } as CSSProperties}
            aria-hidden="true"
          >
            {char === " " ? " " : char}
          </span>
        ))}
        <span className={styles.close} aria-hidden="true">
          ]
        </span>
      </span>
      <span className={styles.line} aria-hidden="true" />
    </span>
  );
}
