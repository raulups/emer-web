import type { Metadata } from "next";
import Link from "next/link";
import { FocusOnMount } from "@/components/shell/focus-on-mount";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="flex min-h-svh flex-col items-start justify-center gap-4 bg-paper px-page font-sans text-ink outline-none"
    >
      <FocusOnMount targetId="contenido" />
      <h1 className="text-4xl font-bold uppercase tracking-tight">
        <span className="sr-only">Error 404. </span>Esta página no existe
      </h1>
      <Link href="/" className="text-xs uppercase tracking-[0.24em] underline underline-offset-4">
        Volver al inicio <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
