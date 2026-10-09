"use client";

import { useEffect } from "react";
import { FocusOnMount } from "@/components/shell/focus-on-mount";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="flex min-h-svh flex-col items-start justify-center gap-4 bg-paper px-page font-sans text-ink outline-none"
    >
      <title>Error · Emer</title>
      <FocusOnMount targetId="contenido" />
      <h1 className="text-4xl font-bold uppercase tracking-tight">Algo se ha roto</h1>
      <p className="text-base">Vuelve a intentarlo en un momento.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="border border-ink px-4 py-2 text-xs uppercase tracking-[0.24em] hover:bg-ink hover:text-paper"
      >
        Reintentar
      </button>
    </main>
  );
}
