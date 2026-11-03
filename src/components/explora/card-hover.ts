import { lerpBy } from "@/lib/motion/math";
import { HOVER, type Hover, type Placement, pointerIn } from "./carousel-path";

/** Por debajo de esto el hover se da por asentado y el bucle puede parar. */
const EPSILON = 0.002;

/** Controles de la ficha (encima de las fotos): sobre ellos no hay hover de foto. */
const CONTROL = "a, button:not([data-card])";

type Card = { place: Placement; width: number; height: number; shown: boolean };
type Hit = { i: number; px: number; py: number };

type Options = {
  count: number;
  /** Índice de la foto centrada (la única que se endereza y sigue al cursor). */
  active: () => number;
  /** El carrusel está quieto: solo entonces entrar en una vecina navega a ella. */
  still: () => boolean;
  /** El cursor ha entrado en la anterior o la siguiente. */
  onNeighbour: (index: number) => void;
};

/** Foto bajo el cursor (la de delante si se solapan) y dónde está el cursor en ella. */
function hitTest(cards: readonly Card[], x: number, y: number): Hit | null {
  let best: (Hit & { z: number }) | null = null;
  cards.forEach((card, i) => {
    if (!card.shown) return;
    const at = pointerIn(card.place, card.width, card.height, x, y);
    if (at && (!best || card.place.z > best.z)) best = { i, ...at, z: card.place.z };
  });
  return best;
}

/**
 * Hover de las fotos del carrusel (solo ratón o lápiz). La centrada se endereza y sigue al cursor;
 * entrar en la anterior o la siguiente navega a ella. Solo cuenta lo que hace el cursor (eventos
 * `pointermove`), nunca una foto que se desliza bajo un cursor quieto: así no encadena saltos.
 */
export function createCardHover({ count, active, still, onNeighbour }: Options) {
  let pointer: { x: number; y: number } | null = null;
  let cards: readonly Card[] = [];
  let entered = -1;
  let states: readonly Hover[] = Array.from({ length: count }, () => ({
    amount: 0,
    px: 0,
    py: 0,
  }));

  const onMove = (event: PointerEvent) => {
    const section = event.currentTarget as HTMLElement;
    const overControl = (event.target as Element | null)?.closest(CONTROL);
    if ((event.pointerType !== "mouse" && event.pointerType !== "pen") || overControl) {
      pointer = null;
      entered = -1;
      return;
    }
    const rect = section.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const over = hitTest(cards, pointer.x, pointer.y)?.i ?? -1;
    if (over === entered) return;
    entered = over;
    if (over >= 0 && Math.abs(over - active()) === 1 && still()) onNeighbour(over);
  };
  const onLeave = () => {
    pointer = null;
    entered = -1;
  };

  const bind = (section: HTMLElement) => {
    section.addEventListener("pointermove", onMove);
    section.addEventListener("pointerleave", onLeave);
    return () => {
      section.removeEventListener("pointermove", onMove);
      section.removeEventListener("pointerleave", onLeave);
    };
  };

  /** Avanza un frame; devuelve el hover de cada foto y si alguno sigue moviéndose. */
  const update = (placed: readonly Card[], deltaMs: number) => {
    cards = placed;
    const over = pointer ? hitTest(placed, pointer.x, pointer.y) : null;
    const center = active();
    let moving = false;
    states = states.map((state, i) => {
      const on = over?.i === i && i === center;
      const goal = {
        amount: on ? 1 : 0,
        px: on ? (over?.px ?? 0) : 0,
        py: on ? (over?.py ?? 0) : 0,
      };
      const next = {
        amount: lerpBy(state.amount, goal.amount, HOVER.lerp, deltaMs),
        px: lerpBy(state.px, goal.px, HOVER.lerp, deltaMs),
        py: lerpBy(state.py, goal.py, HOVER.lerp, deltaMs),
      };
      const far =
        Math.abs(next.amount - goal.amount) > EPSILON ||
        Math.abs(next.px - goal.px) > EPSILON ||
        Math.abs(next.py - goal.py) > EPSILON;
      moving ||= far || state.amount !== goal.amount || state.px !== goal.px;
      return far ? next : goal;
    });
    return { states, moving };
  };

  return { bind, update };
}
