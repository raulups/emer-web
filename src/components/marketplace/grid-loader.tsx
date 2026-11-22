"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef } from "react";
import styles from "./grid-loader.module.css";

gsap.registerPlugin(useGSAP);

/**
 * Loader de resultados: una línea fina que barre de izquierda a derecha. Solo `transform`; sin
 * movimiento, la línea llena y quieta.
 */
export function GridLoader() {
  const root = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-loader-sweep]",
          { xPercent: -100 },
          { xPercent: 100, duration: 1.1, ease: "power2.inOut", repeat: -1 },
        );
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <span ref={root} className={styles.track} data-grid-loader aria-hidden="true">
      <span className={styles.sweep} data-loader-sweep />
    </span>
  );
}
