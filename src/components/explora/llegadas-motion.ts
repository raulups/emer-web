import { clamp01, easeInOutCubic, easeOutCubic } from "@/lib/motion/math";
import { write, writeText } from "@/lib/motion/write";

/** Scroll (en pantallas) que cuesta pasar de una carta a la siguiente. */
export const NW_STEP = 0.5;
/** Scroll (en pantallas) que aguanta la última carta ya colocada antes de soltar la sección. */
export const NW_HOLD = 0.35;
/** Cartas que se ven detrás de la actual; más atrás, apagadas. */
const DEPTH = 4;
/** Cada carta que queda detrás encoge esto y sube esta fracción de la pantalla. */
const SHRINK = 0.045;
const RISE = 0.024;
/** Cuánto se apaga cada carta que queda detrás. */
const FADE = 0.18;
/** Inclinación (grados) con la que entra una carta; alterna de lado. */
const TILT = 4;
/** La carta que entra arranca desde esta fracción de la pantalla por debajo de su sitio. */
const FROM = 1.05;
/** Recorrido (en % de su alto) de un nombre al rodar: más de 100 para que no asome el vecino. */
const ROLL_PCT = 140;
/** Piezas: tramo de cada paso (0–1) en el que cambian y retraso entre una y la siguiente. */
const PIECE_FROM = 0.2;
const PIECE_SPAN = 0.36;
const PIECE_STAGGER = 0.1;
/** Desplazamiento (px) de una pieza al irse o al llegar. */
const PIECE_SHIFT = 22;

export type NovedadesMotion = {
  /** Scroll (px) que retiene la sección más allá de su pantalla. */
  travel: (vh: number) => number;
  /** Pinta la baraja para un scroll (px desde el inicio de la sección) y un alto de pantalla. */
  render: (scrolled: number, vh: number) => void;
};

const nodesOf = (root: HTMLElement, name: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-${name}]`),
];

/** Índice fraccionario de la carta a la vista: avanza `NW_STEP` pantallas por carta. */
const novedadesIndex = (scrolled: number, vh: number, count: number): number =>
  Math.min(Math.max(0, count - 1), Math.max(0, scrolled / Math.max(1, vh * NW_STEP)));

/** Carta que entra: desde abajo e inclinada, se endereza al aterrizar (`t` de 0 a 1). */
const entering = (t: number, tilt: number, vh: number): string => {
  const e = easeOutCubic(t);
  return `translate3d(0, ${((1 - e) * FROM * vh).toFixed(1)}px, 0) rotate(${((1 - e) * tilt).toFixed(2)}deg)`;
};

/** Carta ya colocada: retrocede en la pila (`k` cartas por detrás de la actual). */
const stacked = (k: number, vh: number): string =>
  k <= 0
    ? "none"
    : `translate3d(0, ${(-k * RISE * vh).toFixed(1)}px, 0) scale(${(1 - k * SHRINK).toFixed(4)})`;

/**
 * Baraja de Novedades: lo que `explora.tsx` escribe en cada frame a partir del scroll. Cada carta
 * entra desde abajo mientras el scroll recorre su paso (de `i − 1` a `i`) y, una vez colocada,
 * retrocede en la pila con las siguientes: sube, encoge y se apaga. El nombre rueda como un
 * contador (con el cambio apurado al centro de cada paso) y las piezas cambian en cascada. Solo
 * `transform` y `opacity`; los atributos de la carta actual (enlace accesible, piezas con hover y
 * aviso para lectores) cambian solo al cambiar de carta.
 */
export function createNovedades(root: HTMLElement): NovedadesMotion {
  const cards = nodesOf(root, "nw-card");
  const rolls = nodesOf(root, "nw-roll");
  // Índice de marca de cada rodillo (nombres y datos repiten índices): se lee una vez.
  const rollAt = rolls.map((roll) => Number(roll.dataset.nwRoll) || 0);
  const pieces = nodesOf(root, "nw-piece").map((node) => ({
    node,
    brand: Number(node.dataset.nwPiece) || 0,
    slot: Number(node.closest<HTMLElement>("[data-nw-slot]")?.dataset.nwSlot) || 0,
  }));
  const live = root.querySelector<HTMLElement>("[data-nw-live]");
  const count = cards.length;
  let current = 0;

  const select = (index: number) => {
    const previous = cards[current];
    const focused = previous === document.activeElement;
    current = index;
    cards.forEach((card, i) => {
      const on = i === index;
      card.toggleAttribute("data-on", on);
      if (on) {
        card.removeAttribute("aria-hidden");
        if (card.dataset.nwLink !== undefined) card.tabIndex = 0;
      } else {
        card.setAttribute("aria-hidden", "true");
        card.tabIndex = -1;
      }
    });
    for (const piece of pieces) piece.node.toggleAttribute("data-on", piece.brand === index);
    // El foco no se queda en una carta ya oculta: pasa a la actual (o se suelta).
    if (focused) {
      const next = cards[index];
      if (next?.dataset.nwLink !== undefined) next.focus({ preventScroll: true });
      else previous?.blur();
    }
    const label = cards[index]?.dataset.nwLabel;
    if (live && label) writeText(live, label);
  };

  const render = (scrolled: number, vh: number) => {
    if (count === 0) return;
    const f = novedadesIndex(scrolled, vh, count);

    cards.forEach((card, i) => {
      const d = f - i;
      if (d <= -1) {
        write(card, "transform", `translate3d(0, ${(FROM * vh).toFixed(1)}px, 0)`);
        write(card, "opacity", "1");
        return;
      }
      if (d < 0) {
        write(card, "transform", entering(d + 1, i % 2 === 0 ? -TILT : TILT, vh));
        write(card, "opacity", "1");
        return;
      }
      const k = Math.min(d, DEPTH + 1);
      write(card, "transform", stacked(k, vh));
      write(card, "opacity", clamp01(1 - k * FADE).toFixed(3));
    });

    // Nombre y datos: ruedan de golpe en el centro de cada paso, mientras la carta aún viaja.
    const whole = Math.floor(f);
    const r = whole + easeInOutCubic(f - whole);
    rolls.forEach((roll, i) => {
      const d = Math.max(-1.05, Math.min(1.05, (rollAt[i] ?? 0) - r));
      write(roll, "transform", d === 0 ? "none" : `translateY(${(d * ROLL_PCT).toFixed(2)}%)`);
      write(roll, "opacity", Math.abs(d) >= 1 ? "0" : "1");
    });

    // Piezas: cada hueco cambia en cascada (de arriba abajo). La saliente sube y se apaga; ya
    // apagada, la nueva sube desde un poco más abajo y se enciende (nunca se ven las dos).
    for (const { node, brand, slot } of pieces) {
      const t = clamp01((f - whole - PIECE_FROM - slot * PIECE_STAGGER) / PIECE_SPAN);
      const d = Math.max(-1, Math.min(1, brand - (whole + easeInOutCubic(t))));
      write(
        node,
        "transform",
        d === 0 ? "none" : `translate3d(0, ${(d * PIECE_SHIFT).toFixed(1)}px, 0)`,
      );
      write(node, "opacity", clamp01(1 - Math.abs(d) * 2).toFixed(3));
    }

    const index = Math.round(f);
    if (index !== current) select(index);
  };

  return {
    // Con una sola carta no hay nada que barajar: la sección no retiene el scroll.
    travel: (vh) => (count > 1 ? Math.round(vh * (NW_STEP * (count - 1) + NW_HOLD)) : 0),
    render,
  };
}
