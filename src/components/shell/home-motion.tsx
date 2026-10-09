"use client";

import { useEffect } from "react";
import { initSectionTracking } from "@/lib/motion/sections";

/**
 * Seguimiento (`section:change`) de las secciones que aún son placeholders. Las secciones reales
 * se registran a sí mismas con `trackSection` al montarse (sobreviven al streaming).
 */
export function HomeMotion() {
  useEffect(() => initSectionTracking(), []);
  return null;
}
