/** Decorados de 07-sugiere (tabla del handoff). `top < 6` = anclado arriba en px con jitter. */
type Anchor = { left?: number; right?: number; top?: number; bottom?: number };

export const DECOS: ReadonlyArray<{
  file: string;
  anchor: Anchor;
  w: number;
  r: number;
  ar: number;
  pos: string;
  size: string;
}> = [
  {
    file: "coche-lateral",
    anchor: { right: -6, bottom: -4 },
    w: 40,
    r: 0,
    ar: 2.4,
    pos: "center",
    size: "contain",
  },
  {
    file: "caballos",
    anchor: { left: 2, top: 3 },
    w: 22,
    r: -3,
    ar: 2.6,
    pos: "center",
    size: "cover",
  },
  {
    file: "grupo",
    anchor: { right: 3, top: 2 },
    w: 16,
    r: 0,
    ar: 1.4,
    pos: "center",
    size: "cover",
  },
  {
    file: "monos",
    anchor: { right: 30, top: 5 },
    w: 9,
    r: -6,
    ar: 1.6,
    pos: "45% 51%",
    size: "140% auto",
  },
  {
    file: "tabaco",
    anchor: { left: 4, bottom: 6 },
    w: 13,
    r: -10,
    ar: 1,
    pos: "center",
    size: "contain",
  },
  {
    file: "mecheros",
    anchor: { left: 46, bottom: 3 },
    w: 6,
    r: 8,
    ar: 0.85,
    pos: "center",
    size: "150% auto",
  },
  {
    file: "moto",
    anchor: { right: 6, top: 38 },
    w: 12,
    r: 0,
    ar: 0.9,
    pos: "center 70%",
    size: "cover",
  },
  {
    file: "estrellas",
    anchor: { left: 38, top: 2 },
    w: 4,
    r: 0,
    ar: 0.55,
    pos: "center",
    size: "contain",
  },
  {
    file: "mano",
    anchor: { left: -2, top: 34 },
    w: 12,
    r: -14,
    ar: 1,
    pos: "center",
    size: "contain",
  },
];

/** PRNG determinista (mulberry32): la misma semilla da el mismo jitter en servidor y cliente. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type DecoStyle = {
  file: string;
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  width: string;
  aspectRatio: string;
  rotate: number;
  pos: string;
  size: string;
};

/** Jitter por montaje: j0, j1, j2 ∈ [-.5, .5], s ∈ [.88, 1.18]. */
export function decoStyles(seed: number): DecoStyle[] {
  const next = rng(seed);
  return DECOS.map((d) => {
    const j0 = next() - 0.5;
    const j1 = next() - 0.5;
    const j2 = next() - 0.5;
    const s = 0.88 + next() * 0.3;
    const { left, right, top, bottom } = d.anchor;
    return {
      file: d.file,
      left: left !== undefined ? `${left + j0 * 2}vw` : undefined,
      right: right !== undefined ? `${right + j0 * 2}vw` : undefined,
      top:
        top !== undefined
          ? top < 6
            ? `${12 + Math.abs(j1) * 16}px`
            : `${top + j1 * 3}%`
          : undefined,
      bottom: bottom !== undefined ? `${bottom}%` : undefined,
      width: `${d.w * s}vw`,
      aspectRatio: String(d.ar),
      rotate: d.r + j2 * 6,
      pos: d.pos,
      size: d.size,
    };
  });
}
