"use client";

import { useEffect } from "react";

/** Lleva el foco a un elemento al montar (páginas de error/404 tras navegar en cliente). */
export function FocusOnMount({ targetId }: { targetId: string }) {
  useEffect(() => {
    document.getElementById(targetId)?.focus({ preventScroll: true });
  }, [targetId]);
  return null;
}
