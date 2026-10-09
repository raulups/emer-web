"use client";

import { useEffect } from "react";
import { HERO_ID } from "@/lib/config/sections";
import { registerHero } from "@/lib/motion/scroll";
import { initSectionTracking } from "@/lib/motion/sections";
import { initHeroKeys } from "@/lib/motion/shortcuts";

/**
 * Registra en el shell lo que depende del DOM de la home: hero (snap + teclado) y
 * seguimiento de secciones. Se monta y desmonta con la página, así que sobrevive a la
 * navegación en cliente. Cuando exista 03-hero, el registro del hero pasará a esa sección.
 */
export function HomeMotion() {
  useEffect(() => {
    const cleanups: Array<() => void> = [initSectionTracking()];
    const hero = document.getElementById(HERO_ID);
    if (hero) cleanups.push(registerHero(hero), initHeroKeys(hero));
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, []);

  return null;
}
