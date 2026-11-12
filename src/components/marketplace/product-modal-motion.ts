import gsap from "gsap";
import { copyFit } from "@/lib/image-fit";

/**
 * Coreografía del popup de producto. La foto no se escala dentro del popup (la grande puede no
 * haber llegado y la galería se deformaría): vuela un «fantasma», una copia de la foto que ya se
 * ve en la tarjeta, desde la tarjeta hasta el marco del popup. Las dos son 3:4, así que basta una
 * escala uniforme. Al aterrizar, el marco real aparece debajo y el fantasma se funde cuando la
 * foto grande está decodificada. La caja blanca crece a la vez desde la caja de la tarjeta y el
 * contenido entra detrás. Solo `transform` y `opacity`; `will-change` solo durante el vuelo.
 */

const OPEN = { duration: 0.9, ease: "expo.out" } as const;
const CLOSE = { duration: 0.6, ease: "expo.inOut" } as const;
const PANEL_IN = { duration: 0.45, delay: 0.28, ease: "power2.out" } as const;
const RISE_IN = { duration: 0.7, delay: 0.32, ease: "expo.out", stagger: 0.045 } as const;
const GHOST_OUT = 0.25;
const FADE = { duration: 0.35, ease: "expo.out" } as const;
/** Cierre: la caja se apaga en la segunda mitad del encogido y la tarjeta vuelve al final. */
const SHEET_OUT = {
  duration: CLOSE.duration * 0.55,
  delay: CLOSE.duration * 0.3,
  ease: "power1.in",
} as const;
const CARD_BACK = { duration: 0.3, delay: CLOSE.duration - 0.3, ease: "power1.out" } as const;

export type Stage = {
  /** Caja blanca con borde. */
  sheet: HTMLElement;
  /** Contenido (galería + información). */
  panel: HTMLElement;
  /** Marco de la galería (3:4). */
  frame: HTMLElement;
  /** Copia de la foto que vuela (`position: fixed`). */
  ghost: HTMLImageElement;
};

type Box = { left: number; top: number; width: number; height: number };

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Transform que lleva `to` a ocupar `from` (FLIP), escalado desde su esquina. */
function flip(from: Box, to: Box, uniform: boolean) {
  const scaleX = from.width / Math.max(1, to.width);
  return {
    x: from.left - to.left,
    y: from.top - to.top,
    scaleX,
    scaleY: uniform ? scaleX : from.height / Math.max(1, to.height),
    transformOrigin: "0 0",
  };
}

const visible = (box: DOMRect) =>
  box.width > 0 && box.bottom > 0 && box.right > 0 && box.top < window.innerHeight;

/** Tarjeta del grid de la pieza (si sigue montada) y su foto a la vista. */
export function cardOf(
  id: string,
): { card: HTMLElement; media: HTMLElement; image: HTMLImageElement | null } | null {
  const card = document.querySelector<HTMLElement>(`[data-product="${id}"]`);
  const media = card?.querySelector<HTMLElement>("[data-media]");
  if (!card || !media) return null;
  const box = media.getBoundingClientRect();
  // La galería de la tarjeta puede estar en otra foto: la que cae dentro del marco.
  const image =
    [...media.querySelectorAll<HTMLImageElement>("img")].find((img) => {
      const r = img.getBoundingClientRect();
      return Math.abs(r.left - box.left) < r.width / 2 && img.complete && img.naturalWidth > 0;
    }) ?? null;
  return { card, media, image };
}

function copyGhost(ghost: HTMLImageElement, from: HTMLImageElement): void {
  // Mismo modo CORS que el original (antes que `src`): así sale de la caché sin pedirla otra vez.
  copyFit(from, ghost);
  ghost.src = from.currentSrc || from.src;
}

/** El fantasma copia la foto (y su encaje, `image-fit`) y se coloca sobre el marco del popup. */
function placeGhost(ghost: HTMLImageElement, from: HTMLImageElement, at: DOMRect): void {
  copyGhost(ghost, from);
  gsap.set(ghost, {
    left: at.left,
    top: at.top,
    width: at.width,
    height: at.height,
    opacity: 1,
    clearProps: "transform",
  });
  ghost.hidden = false;
}

function hideGhost(ghost: HTMLImageElement): void {
  ghost.hidden = true;
  gsap.set(ghost, { clearProps: "all" });
}

/**
 * Caja de la foto tal como se ve: con el hover, la tarjeta la acerca (`scale`, centrado); el
 * fantasma sale ya acercado para que no dé un salto.
 */
function zoomed(box: DOMRect, image: HTMLImageElement): Box {
  const zoom = image.getBoundingClientRect().width / Math.max(1, image.offsetWidth);
  if (!Number.isFinite(zoom) || Math.abs(zoom - 1) < 0.001) return box;
  const width = box.width * zoom;
  const height = box.height * zoom;
  return {
    left: box.left - (width - box.width) / 2,
    top: box.top - (height - box.height) / 2,
    width,
    height,
  };
}

/** Foto del marco que se ve ahora (la de la diapositiva activa). */
function frameImage(frame: HTMLElement): HTMLImageElement | null {
  const box = frame.getBoundingClientRect();
  return (
    [...frame.querySelectorAll<HTMLImageElement>("img")].find(
      (img) => Math.abs(img.getBoundingClientRect().left - box.left) < 2,
    ) ?? null
  );
}

/** Apertura. `id`: pieza que se abre (para buscar su tarjeta); `null` si viene de un enlace. */
export function openStage(stage: Stage, id: string | null): void {
  const { sheet, panel, frame, ghost } = stage;
  const rise = panel.querySelectorAll("[data-rise]");
  gsap.killTweensOf([sheet, panel, frame, ghost, ...rise]);
  hideGhost(ghost);
  gsap.set([sheet, panel, frame], { clearProps: "all" });
  if (reduced()) return;

  const from = id ? cardOf(id) : null;
  const frameBox = frame.getBoundingClientRect();
  const mediaBox = from?.media.getBoundingClientRect();

  gsap.fromTo(panel, { opacity: 0 }, { opacity: 1, ...PANEL_IN, clearProps: "opacity" });
  gsap.fromTo(
    rise,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, ...RISE_IN, clearProps: "opacity,transform" },
  );

  if (!from?.image || !mediaBox || !visible(mediaBox) || frameBox.width === 0) {
    gsap.fromTo(
      [sheet, frame],
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, ...FADE, clearProps: "opacity,transform" },
    );
    return;
  }

  const { card, image } = from;
  const start = zoomed(mediaBox, image);
  placeGhost(ghost, image, frameBox);
  gsap.set(card, { opacity: 0 });
  gsap.set(frame, { opacity: 0 });
  gsap.fromTo(
    sheet,
    {
      ...flip(card.getBoundingClientRect(), sheet.getBoundingClientRect(), false),
      willChange: "transform",
    },
    { x: 0, y: 0, scaleX: 1, scaleY: 1, ...OPEN, clearProps: "transform,willChange" },
  );
  gsap.fromTo(
    ghost,
    { ...flip(start, frameBox, true), willChange: "transform" },
    {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      ...OPEN,
      clearProps: "willChange",
      onComplete: () => land(stage),
    },
  );
}

/** El fantasma ha llegado: el marco real aparece debajo y el fantasma se va cuando la foto grande está lista. */
function land({ frame, ghost }: Stage): void {
  gsap.set(frame, { clearProps: "opacity" });
  const big = frameImage(frame);
  const ready = big ? big.decode().catch(() => undefined) : Promise.resolve();
  void ready.then(() => {
    if (ghost.hidden) return;
    gsap.to(ghost, { opacity: 0, duration: GHOST_OUT, onComplete: () => hideGhost(ghost) });
  });
}

/**
 * Cierre: el contenido se apaga y la foto (la que se esté viendo) y la caja vuelven a encoger hasta
 * la tarjeta, que reaparece. Si la tarjeta ya no está a la vista, el popup se desvanece.
 * `done` cierra el diálogo; devuelve la limpieza (temporizador de seguridad).
 */
export function closeStage(stage: Stage, id: string, done: () => void): () => void {
  const { sheet, panel, frame, ghost } = stage;
  const rise = panel.querySelectorAll("[data-rise]");
  gsap.killTweensOf([sheet, panel, frame, ghost, ...rise]);
  let finished = false;
  const to = cardOf(id);
  const finish = () => {
    if (finished) return;
    finished = true;
    if (to) gsap.set(to.card, { clearProps: "opacity" });
    hideGhost(ghost);
    gsap.set([sheet, panel, frame, ...rise], { clearProps: "all" });
    done();
  };
  if (reduced()) {
    finish();
    return () => undefined;
  }
  const timer = window.setTimeout(finish, (CLOSE.duration + 0.3) * 1000);

  gsap.to(panel, { opacity: 0, duration: 0.2, ease: "power2.out" });
  const mediaBox = to?.media.getBoundingClientRect();
  const shown = frameImage(frame);
  if (to && mediaBox && visible(mediaBox) && shown) {
    const frameBox = frame.getBoundingClientRect();
    if (ghost.hidden) placeGhost(ghost, shown, frameBox);
    else copyGhost(ghost, shown);
    gsap.set(to.card, { opacity: 0 });
    gsap.to(sheet, {
      ...flip(to.card.getBoundingClientRect(), sheet.getBoundingClientRect(), false),
      ...CLOSE,
      willChange: "transform",
    });
    // La caja blanca se va mientras encoge (si no, tapa el nombre de la tarjeta hasta el final) y
    // la tarjeta reaparece debajo antes de que la foto aterrice.
    gsap.to(sheet, { opacity: 0, ...SHEET_OUT });
    gsap.to(to.card, { opacity: 1, ...CARD_BACK });
    gsap.to(ghost, {
      ...flip(mediaBox, frameBox, true),
      opacity: 1,
      ...CLOSE,
      willChange: "transform",
      onComplete: finish,
    });
  } else {
    gsap.to([sheet, ghost], {
      opacity: 0,
      y: 16,
      duration: 0.3,
      ease: "power2.in",
      onComplete: finish,
    });
  }
  return () => window.clearTimeout(timer);
}
