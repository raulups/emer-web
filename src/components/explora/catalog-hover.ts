/**
 * Hover del Catálogo: el nombre (en grande) y las piezas salen en el espacio libre alrededor de
 * la foto, nunca encima. En cada hover se mide el hueco de cada lado y se elige al azar una
 * composición que quepa (nombre y piezas en lados distintos, alineados al principio o al final),
 * distinta de la anterior de esa foto. Arriba y abajo el nombre va en horizontal y las piezas en
 * fila; a los lados, el nombre en vertical y las piezas en columna. Solo se escriben atributos
 * `data-*` en la casilla; la colocación y la entrada son CSS (`emergentes.module.css`).
 */

type Side = "top" | "bottom" | "left" | "right";
type Align = "start" | "end";
type Place = { side: Side; align: Align };
type Combo = { name: Place; pieces: Place };

const SIDES: readonly Side[] = ["top", "bottom", "left", "right"];
const ALIGNS: readonly Align[] = ["start", "end"];

/** Separación entre la foto y lo que sale a su alrededor (igual que `--gap` en el CSS). */
export const GAP = { min: 22, vw: 0.022, max: 44 } as const;
/** Margen con el borde de la pantalla (abajo) y de la sección (izquierda). */
const EDGE = 12;
/** Arriba queda el switch fijo (MARKETPLACE / EXPLORA): nada sale por encima de esta línea. */
const TOP_RESERVE = 84;
/** Lo que se deja libre a la derecha de la sección ([ SALTAR ] y el índice de secciones). */
const RIGHT_RESERVE_VW = 0.11;
/** Separación entre piezas (igual que `gap` de `.pieces`). */
const PIECE_GAP = 10;
/** Igual que el corte del CSS: sin hover o estrecho, el nombre va fijo bajo la foto, sin piezas. */
const STATIC = "(hover: none), (max-width: 900px)";

const vertical = (side: Side) => side === "left" || side === "right";

type Box = { left: number; top: number; right: number; bottom: number };

type Sizes = {
  photo: DOMRect;
  bounds: Box;
  gap: number;
  /** Nombre en horizontal: largo (`w`) y grueso (`h`). En vertical se intercambian. */
  name: { w: number; h: number };
  /** Bloque de piezas: largo en fila / en columna y grueso. */
  pieces: { row: number; column: number; across: { row: number; column: number } };
};

/** ¿Cabe un bloque de `length × thickness` en `place` alrededor de la foto? */
function fits(s: Sizes, place: Place, length: number, thickness: number): boolean {
  const { photo, bounds, gap } = s;
  const room = {
    top: photo.top - gap - bounds.top,
    bottom: bounds.bottom - photo.bottom - gap,
    left: photo.left - gap - bounds.left,
    right: bounds.right - photo.right - gap,
  }[place.side];
  if (room < thickness) return false;
  // El bloque arranca en un borde de la foto: ese borde también tiene que estar a la vista.
  if (vertical(place.side)) {
    return place.align === "start"
      ? photo.top >= bounds.top && photo.top + length <= bounds.bottom
      : photo.bottom <= bounds.bottom && photo.bottom - length >= bounds.top;
  }
  return place.align === "start"
    ? photo.left >= bounds.left && photo.left + length <= bounds.right
    : photo.right <= bounds.right && photo.right - length >= bounds.left;
}

function nameFits(s: Sizes, place: Place): boolean {
  // En vertical el texto gira: su largo corre a lo alto y su grueso a lo ancho.
  return fits(s, place, s.name.w, s.name.h);
}

function piecesFit(s: Sizes, place: Place): boolean {
  return vertical(place.side)
    ? fits(s, place, s.pieces.column, s.pieces.across.column)
    : fits(s, place, s.pieces.row, s.pieces.across.row);
}

const keyOf = (c: Combo) => `${c.name.side}-${c.name.align}/${c.pieces.side}-${c.pieces.align}`;

function combos(s: Sizes, withPieces: boolean): Combo[] {
  const places = SIDES.flatMap((side) => ALIGNS.map((align) => ({ side, align })));
  const names = places.filter((p) => nameFits(s, p));
  if (!withPieces)
    return names.map((name) => ({ name, pieces: { side: name.side, align: "start" } }));
  const pieces = places.filter((p) => piecesFit(s, p));
  return names.flatMap((name) =>
    pieces.filter((p) => p.side !== name.side).map((p) => ({ name, pieces: p })),
  );
}

function measure(tile: HTMLElement): Sizes | null {
  const photoEl = tile.querySelector<HTMLElement>("[data-cat-photo]");
  const nameEl = tile.querySelector<HTMLElement>("[data-cat-name]");
  const piecesEl = tile.querySelector<HTMLElement>("[data-cat-pieces]");
  const section = tile.closest<HTMLElement>("[data-er]");
  if (!photoEl || !nameEl || !piecesEl || !section) return null;
  const vw = window.innerWidth;
  const area = section.getBoundingClientRect();
  // El nombre se mide en horizontal (el modo de la composición anterior no cuenta).
  tile.dataset.name = "top";
  const name = { w: nameEl.offsetWidth, h: nameEl.offsetHeight };
  const piece = piecesEl.firstElementChild as HTMLElement | null;
  const pw = piece?.offsetWidth ?? piecesEl.offsetWidth;
  const ph = piece?.offsetHeight ?? piecesEl.offsetHeight;
  const count = Math.max(1, piecesEl.childElementCount);
  return {
    photo: photoEl.getBoundingClientRect(),
    bounds: {
      left: area.left + EDGE,
      right: area.right - vw * RIGHT_RESERVE_VW,
      top: TOP_RESERVE,
      bottom: window.innerHeight - EDGE,
    },
    gap: Math.min(GAP.max, Math.max(GAP.min, vw * GAP.vw)),
    name,
    pieces: {
      row: count * pw + (count - 1) * PIECE_GAP,
      column: count * ph + (count - 1) * PIECE_GAP,
      across: { row: ph, column: pw },
    },
  };
}

function apply(tile: HTMLElement, combo: Combo): void {
  tile.dataset.name = combo.name.side;
  tile.dataset.nameAlign = combo.name.align;
  tile.dataset.pieces = combo.pieces.side;
  tile.dataset.piecesAlign = combo.pieces.align;
  tile.dataset.combo = keyOf(combo);
}

/** Recoloca nombre y piezas de la casilla para este hover. */
export function placeHover(tile: HTMLElement): void {
  if (window.matchMedia(STATIC).matches) return;
  const previous = tile.dataset.combo;
  const sizes = measure(tile);
  if (!sizes) return;
  const withPieces = tile.querySelector("[data-cat-piece]") !== null;
  const all = combos(sizes, withPieces);
  const fresh = all.filter((c) => keyOf(c) !== previous);
  const pool = fresh.length > 0 ? fresh : all;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  if (pick) {
    apply(tile, pick);
    return;
  }
  // Sin sitio para todo: el nombre donde haya más aire (arriba o abajo) y las piezas al lado.
  const { photo, bounds } = sizes;
  const up = photo.top - bounds.top >= bounds.bottom - photo.bottom;
  const roomRight = bounds.right - photo.right >= photo.left - bounds.left;
  apply(tile, {
    name: { side: up ? "top" : "bottom", align: "start" },
    pieces: { side: roomRight ? "right" : "left", align: up ? "end" : "start" },
  });
}
