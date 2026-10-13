import { LERP } from "@/styles/theme";

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

/**
 * `current += (target − current) · 0.14` por frame a 60 Hz. Se normaliza con el tiempo para que
 * en pantallas de 120 Hz el suavizado dure lo mismo.
 */
export function lerpTo(current: number, target: number, deltaMs: number): number {
  const k = 1 - (1 - LERP) ** (Math.min(deltaMs, 100) / (1000 / 60));
  const next = current + (target - current) * k;
  return Math.abs(target - next) < 0.05 ? target : next;
}

export const pad = (value: number, size: number): string => String(value).padStart(size, "0");
