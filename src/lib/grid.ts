/** Columnas del grid del Marketplace: opciones por dispositivo y su cookie (el servidor pinta ya con ellas, sin saltos). */
export type Device = "desktop" | "mobile";

export const GRID: Record<Device, { options: readonly number[]; fallback: number }> = {
  desktop: { options: [2, 3, 4, 5, 6], fallback: 4 },
  mobile: { options: [1, 2, 3], fallback: 2 },
};

export const gridCookie = (device: Device): string => `emer-grid-${device}`;

export function parseColumns(device: Device, value: string | undefined): number {
  const n = Number(value);
  return GRID[device].options.includes(n) ? n : GRID[device].fallback;
}

/** La siguiente opción (vuelve a la primera tras la última): el botón único del móvil. */
export function nextColumns(device: Device, current: number): number {
  const { options } = GRID[device];
  return options[(options.indexOf(current) + 1) % options.length] ?? GRID[device].fallback;
}
