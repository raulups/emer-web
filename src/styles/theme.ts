/**
 * Tokens de movimiento para el código que anima en JS (los mismos valores que theme.css).
 * Ver design_handoff_emer_web/README.md → Movimiento.
 */
export const EASE = {
  outExpo: "cubic-bezier(.16,1,.3,1)",
  load: "cubic-bezier(.65,0,.35,1)",
} as const;

/** Suavizado de todo lo ligado al scroll, aplicado en cada frame: `s += (t - s) * LERP`. */
export const LERP = 0.14;

export const WEIGHT = {
  display: 900,
  title: 800,
  text: 300,
  ui: 200,
  active: 500,
} as const;
