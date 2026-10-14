"use client";

import { BracketLabel } from "@/components/ui/bracket-label";
import { Halo } from "@/components/ui/halo";
import styles from "./view-switch.module.css";

export type View = "market" | "explora";

const OPTIONS: readonly { view: View; label: string; origin: "left" | "right" }[] = [
  { view: "market", label: "Marketplace", origin: "right" },
  { view: "explora", label: "Explora", origin: "left" },
];

type Props = {
  view: View;
  hover: View | null;
  onSelect: (view: View) => void;
  onHover: (view: View | null) => void;
};

/**
 * Switch [ MARKETPLACE ] / EXPLORA (README §2, `Web.dc.html`).
 * La línea está en la opción en hover o, si no hay hover, en la activa. Cada opción lleva su halo
 * y su tono (`data-tone-probe`): sobre una frontera blanco/negro cada una se lee por separado.
 */
export function ViewSwitch({ view, hover, onSelect, onHover }: Props) {
  const lined = hover ?? view;

  return (
    <nav className={styles.nav} aria-label="Vista" onMouseLeave={() => onHover(null)}>
      {OPTIONS.map((option) => {
        const active = option.view === view;
        const hovered = option.view === hover;
        return (
          <button
            key={option.view}
            type="button"
            className={styles.option}
            data-tone-probe
            aria-pressed={active}
            onClick={() => onSelect(option.view)}
            onMouseEnter={() => onHover(option.view)}
            onFocus={() => onHover(option.view)}
            onBlur={() => onHover(null)}
          >
            <Halo spread={40} />
            <BracketLabel
              label={option.label}
              bracketed={active}
              level={active ? "full" : hovered ? "hover" : "dim"}
              raised={hovered && !active}
              lined={option.view === lined}
              origin={option.origin}
            />
          </button>
        );
      })}
    </nav>
  );
}
