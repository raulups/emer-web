"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/** «REINTENTAR ↻»: vuelve a pedir los datos del servidor y anuncia el resultado. */
export function RetryButton({ className, subject }: { className?: string; subject: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [attempted, setAttempted] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-disabled={pending}
        onClick={() => {
          if (pending) return;
          setAttempted(true);
          startTransition(() => router.refresh());
        }}
      >
        Reintentar <span aria-hidden="true">↻</span>
      </button>
      <span role="status" className="sr-only">
        {pending
          ? `Cargando las ${subject}…`
          : attempted
            ? `No se han podido cargar las ${subject}.`
            : ""}
      </span>
    </>
  );
}
