"use client";

import { useState } from "react";
import { BracketLabel } from "@/components/ui/bracket-label";
import styles from "./skip-button.module.css";

/**
 * [ SALTAR NOVEDADES ] fijo arriba a la derecha (espejo de [ MENÚ ]). El bucle de `explora.tsx`
 * decide la sección, lo muestra (`data-on`) y anima el scroll al pulsarlo.
 */
export function SkipButton({ section }: { section: string }) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      className={styles.skip}
      data-skip
      aria-label={`Saltar al final de ${section}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <BracketLabel
        label={`Saltar ${section}`}
        bracketed={hover}
        level={hover ? "full" : "hover"}
        raised={hover}
        lined={hover}
        origin="right"
      />
    </button>
  );
}
