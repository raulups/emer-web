import { bus } from "./bus";
import { handleSnapKey } from "./scroll";

/**
 * Las teclas de una sola pulsación (/, ←, →, Espacio, AvPág) solo actúan con el foco "neutro":
 * en el documento o en un contenedor con tabindex=-1 sin rol de widget (p. ej. main#contenido).
 * Así nunca se secuestran teclas de campos, botones, checkboxes, sliders, tabs, etc.
 */
function isNeutralFocus(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return true;
  if (target === document.body || target === document.documentElement) return true;
  return target.tabIndex === -1 && !target.hasAttribute("role") && !target.isContentEditable;
}

/** Atajos globales del buscador: ⌘K / Ctrl+K siempre; «/» con el foco neutro. */
export function initShortcuts(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;

    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (!bus.isSearchOpen()) bus.emit("emer:search:open");
      return;
    }

    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      if (bus.isSearchOpen() || !isNeutralFocus(event.target)) return;
      event.preventDefault();
      bus.emit("emer:search:open");
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}

/** Teclado del hero: ←/→ cambian de marca y AvPág/Espacio hacen snap al contenido. */
export function initHeroKeys(heroEl: HTMLElement): () => void {
  const heroInView = () => {
    const rect = heroEl.getBoundingClientRect();
    const middle = window.innerHeight / 2;
    return rect.top < middle && rect.bottom > middle;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (bus.isSearchOpen()) return;
    const neutral = isNeutralFocus(event.target);
    // Las flechas también funcionan con el foco en los segmentos del hero (navegación del carrusel).
    const onSegments =
      event.target instanceof Element && event.target.closest("[data-hero-segments]") !== null;

    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && (neutral || onSegments)) {
      if (!heroInView()) return;
      event.preventDefault();
      bus.emit("hero:step", { dir: event.key === "ArrowRight" ? 1 : -1 });
      return;
    }

    if (!neutral) return;
    if ((event.key === "PageDown" || event.key === " ") && handleSnapKey()) {
      event.preventDefault();
    }
  };

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
