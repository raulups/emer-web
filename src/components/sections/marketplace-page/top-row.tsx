"use client";

import Link from "next/link";
import { LoopLine } from "@/components/ui/loop-line";
import { bus } from "@/lib/motion/bus";
import s from "./marketplace-page.module.css";

/** Fila superior: ← INICIO y BUSCAR (abre el mismo buscador que la home, también con ⌘K y «/»). */
export function TopRow() {
  return (
    <header className={s.top}>
      <Link href="/">← INICIO</Link>
      <button
        type="button"
        className={s.search}
        data-testid="mk-search"
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => bus.emit("emer:search:open")}
      >
        <span>BUSCAR</span>
        <LoopLine width={34} />
        <span className={s.kbd} aria-hidden="true">
          ⌘K
        </span>
      </button>
    </header>
  );
}
