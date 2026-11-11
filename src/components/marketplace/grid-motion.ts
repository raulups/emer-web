import gsap from "gsap";
import { scrollToY } from "@/lib/motion/scroll";

/** Fotos que viajan al cambiar VISTA: las que están cerca de la pantalla (±20 %). */
const NEAR = 0.2;
const FLIP = { duration: 0.9, ease: "expo.inOut", stagger: 0.008 } as const;
const INFO_IN = { duration: 0.5, delay: 0.5, stagger: 0.01 } as const;
const FRESH_IN = { duration: 0.7, delay: 0.3, ease: "expo.out", stagger: 0.015 } as const;
const RESULTS_IN = { duration: 0.7, ease: "expo.out", stagger: 0.03 } as const;
/** Resultados que entran animados: los que caben en la primera vista (más, no se ven). */
const RESULTS_MAX = 30;

const near = (rect: DOMRect, vh: number) => rect.bottom > -vh * NEAR && rect.top < vh * (1 + NEAR);

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Cambio de VISTA (productos por fila). Antes de recolocar el grid se mide dónde está cada foto
 * cercana a la pantalla y cuál es la primera tarjeta a la vista; después, la página se corrige
 * para que esa tarjeta siga en el mismo sitio (nada salta bajo el cursor) y cada foto viaja de su
 * posición vieja a la nueva (FLIP a mano: solo `transform`, escalada desde su esquina, así la
 * foto no se deforma porque la foto es siempre 3:4). El texto de las tarjetas se apaga mientras
 * viajan y vuelve al final; las tarjetas que entran en pantalla aparecen subiendo.
 * `anchorTop`: borde inferior de lo que tapa el grid por arriba (barra fija).
 */
export function animateColumns(grid: HTMLElement, apply: () => void, anchorTop: number): void {
  const vh = window.innerHeight;
  const cards = [...grid.children] as HTMLElement[];
  const medias = cards.map((card) => card.querySelector<HTMLElement>("[data-media]"));
  const rects = cards.map((card, i) => (medias[i] ?? card).getBoundingClientRect());
  // La primera tarjeta cuya foto aún se ve: esa se queda donde está.
  const anchor = rects.findIndex((rect) => rect.bottom > anchorTop);
  const anchorY = rects[anchor]?.top ?? 0;

  if (reduced()) {
    apply();
    keepAnchor(medias[anchor] ?? cards[anchor], anchorY);
    return;
  }

  const moving = cards
    .map((card, i) => ({
      card,
      media: medias[i],
      info: card.querySelector<HTMLElement>("[data-info]"),
      wasNear: near(rects[i] as DOMRect, vh),
    }))
    .filter((item) => item.wasNear && item.media);
  const before = moving.map((item) => (item.media as HTMLElement).getBoundingClientRect());
  const infos = moving.map((item) => item.info).filter((n): n is HTMLElement => n !== null);
  gsap.set(infos, { opacity: 0, overwrite: true });

  apply();
  keepAnchor(medias[anchor] ?? cards[anchor], anchorY);

  moving.forEach((item, i) => {
    const media = item.media as HTMLElement;
    const from = before[i] as DOMRect;
    const to = media.getBoundingClientRect();
    gsap.fromTo(
      media,
      {
        x: from.left - to.left,
        y: from.top - to.top,
        scaleX: from.width / Math.max(1, to.width),
        scaleY: from.height / Math.max(1, to.height),
        transformOrigin: "0 0",
      },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: FLIP.duration,
        ease: FLIP.ease,
        delay: i * FLIP.stagger,
        overwrite: true,
        clearProps: "transform",
      },
    );
  });
  gsap.to(infos, { opacity: 1, ...INFO_IN, overwrite: true, clearProps: "opacity" });

  const traveling = new Set(moving.map((item) => item.card));
  const nowNear = cards.filter(
    (card) => !traveling.has(card) && near(card.getBoundingClientRect(), vh),
  );
  if (nowNear.length > 0) {
    gsap.from(nowNear, { opacity: 0, y: 28, ...FRESH_IN, clearProps: "opacity,transform" });
  }
}

/** La foto de referencia vuelve a la misma altura de pantalla que tenía (scroll inmediato). */
function keepAnchor(node: HTMLElement | undefined, previousTop: number): void {
  if (!node) return;
  const delta = node.getBoundingClientRect().top - previousTop;
  if (Math.abs(delta) > 1) scrollToY(window.scrollY + delta, { immediate: true });
}

/** Resultados nuevos (tras un cambio de filtro): las tarjetas a la vista suben y aparecen. */
export function animateResults(grid: HTMLElement): void {
  if (reduced()) return;
  const vh = window.innerHeight;
  const cards = ([...grid.children] as HTMLElement[])
    .filter((card) => near(card.getBoundingClientRect(), vh))
    .slice(0, RESULTS_MAX);
  if (cards.length === 0) return;
  gsap.from(cards, { opacity: 0, y: 24, ...RESULTS_IN, clearProps: "opacity,transform" });
}
