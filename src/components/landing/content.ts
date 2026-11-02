/** Duración del túnel de fotos con el contador de marcas (s). */
export const TUNNEL_S = 6;

/** Barra de «CARGANDO MARKETPLACE». */
export const LOADING = {
  /** Sin respuesta del backend, la barra avanza despacio hacia aquí y espera. */
  cap: 0.85,
  /** Constante de tiempo del avance lento (s). */
  slowS: 8,
  /** Con la respuesta ya recibida, lo que tarda en llenarse del todo (s). */
  fastS: 0.6,
} as const;

/** Tiempo que dura la cortina blanca antes de navegar. */
export const CURTAIN_MS = 850;
/** Total de marcas mientras no llega el real (o si el backend no responde). */
export const FALLBACK_TOTAL = 41;
export const GOLDEN_ANGLE = 2.3998;
