"use client";

import { pad2 } from "@/lib/format";
import type { CategoryVM } from "@/lib/marketplace/types";
import s from "./marketplace-page.module.css";

type Props = {
  subs: readonly CategoryVM[];
  counts: Readonly<Record<string, number>>;
  total: number;
  active: string | null;
  onPick: (id: string | null) => void;
};

function Cat({
  label,
  count,
  pressed,
  disabled,
  id,
  onClick,
}: {
  label: string;
  count: number;
  pressed: boolean;
  disabled?: boolean;
  id: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={s.cat}
      data-in="cat"
      data-cat={id}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <span className={s.catText}>
        <span className={s.catLabel}>{label}</span>
        <span className={s.ghost} aria-hidden="true">
          {label}
        </span>
        <span className={s.catLine} aria-hidden="true" />
      </span>
      <sup className={s.catN}>{pad2(count)}</sup>
    </button>
  );
}

export function CategoryNav({ subs, counts, total, active, onPick }: Props) {
  return (
    <nav className={s.cats} aria-label="Categorías" data-testid="mk-cats">
      <Cat
        id=""
        label="TODO"
        count={total}
        pressed={active === null}
        onClick={() => onPick(null)}
      />
      {subs.map((c) => {
        const n = counts[c.id] ?? 0;
        return (
          <Cat
            key={c.id}
            id={c.id}
            label={c.name.toLocaleUpperCase("es")}
            count={n}
            pressed={active === c.id}
            disabled={n === 0}
            onClick={() => onPick(c.id)}
          />
        );
      })}
    </nav>
  );
}
