"use client";

import { useEffect } from "react";
import { initSectionTracking } from "@/lib/motion/sections";

/**
 * Registra en el shell lo que depende del DOM de la home y no pertenece a una sección concreta:
 * el seguimiento de secciones (`section:change`). El hero se registra a sí mismo
 * (`registerHero` + `initHeroKeys` en HeroCarousel / HeroError).
 */
export function HomeMotion() {
  useEffect(() => initSectionTracking(), []);
  return null;
}
