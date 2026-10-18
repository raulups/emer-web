"use client";

import { useState } from "react";
import { BracketLabel } from "@/components/ui/bracket-label";
import styles from "./menu-toggle.module.css";

type Props = {
  open: boolean;
  controls: string;
  onToggle: () => void;
};

/** [ MENÚ ] fijo arriba a la izquierda, a la altura del switch y con su mismo estilo. */
export function MenuToggle({ open, controls, onToggle }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <button
      type="button"
      className={styles.toggle}
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <BracketLabel
        label="Menú"
        bracketed={open}
        level={open || hover ? "full" : "dim"}
        raised={hover}
        lined={hover}
        origin="left"
      />
    </button>
  );
}
