"use client";

import button from "@/components/ui/button.module.css";
import { bus } from "@/lib/bus";

/** Vuelve a abrir el aviso de cookies para cambiar la elección. */
export function ConsentButton() {
  return (
    <button type="button" className={button.box} onClick={() => bus.emit("consent:open", null)}>
      Configurar cookies
    </button>
  );
}
