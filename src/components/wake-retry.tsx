"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, startTransition, useEffect, useState } from "react";
import { holdWake, wakeFetch } from "@/lib/backend-wake";

type Props = {
  /** Cambia en cada render del servidor: si tras refrescar sigue sin datos, se vuelve a intentar. */
  attempt: number;
  /** Lo que se enseña si se agota la espera. */
  error: ReactNode;
};

/**
 * Lo pinta una sección de servidor cuando no tiene datos: retiene el aviso de `BackendWake`, repite
 * `/api/warm` hasta que el backend responde (deja los datos en caché) y refresca la ruta, que ya
 * pinta la sección de verdad y desmonta este componente.
 */
export function WakeRetry({ attempt, error }: Props) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (gaveUp) return;
    return holdWake();
  }, [gaveUp]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` es lo que relanza el intento
  useEffect(() => {
    const controller = new AbortController();
    wakeFetch("/api/warm", { cache: "no-store", signal: controller.signal, graceMs: 0 })
      .then((res) => {
        if (res.ok) startTransition(() => router.refresh());
        else setGaveUp(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setGaveUp(true);
      });
    return () => controller.abort();
  }, [attempt, router]);

  return gaveUp ? error : null;
}
