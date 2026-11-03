"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./cursor.module.css";

const FINE_POINTER = "(pointer: fine)";
const ACTIVE_CLASS = "has-cursor";
/** Zona de marca: el cursor pasa a ser su logo (`data-cursor-logo="<url>"`). */
const LOGO_ZONE = "[data-cursor-logo]";
/** Controles dentro de una marca: con ellos vuelve el punto. */
const CONTROL = 'a, button, input, select, textarea, label, [role="button"], [data-cursor="link"]';

/** Logo de la marca bajo `target`, o `null` si toca el punto (fuera de marca o sobre un control suyo). */
function logoAt(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const zone = target.closest<HTMLElement>(LOGO_ZONE);
  const logo = zone?.dataset.cursorLogo;
  if (!zone || !logo) return null;
  const control = target.closest(CONTROL);
  // La propia marca puede ser un enlace (filas, tarjetas): solo cuentan los controles de dentro.
  if (control && control !== zone && zone.contains(control)) return null;
  return logo;
}

/**
 * Cursor propio global: punto de 12px con `mix-blend-mode: difference` que sigue al ratón.
 * Sobre una marca (`data-cursor-logo`) el punto se cambia por el logo de la marca; sobre un botón
 * de esa marca vuelve el punto. Los cambios solo animan `scale` y `opacity`.
 * Solo con `pointer: fine`; el cursor del sistema se oculta únicamente mientras este está activo.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLDivElement>(null);
  const [logo, setLogo] = useState<string | null>(null);
  /** Último logo pintado: se conserva al salir para que se desvanezca con él. */
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    const el = dot.current;
    const box = badge.current;
    if (!el || !box) return;
    const root = document.documentElement;
    const query = window.matchMedia(FINE_POINTER);
    let x = -1;
    let y = -1;

    const update = (next: string | null) => {
      setLogo(next);
      if (next) setShown(next);
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      // En `translate`, no en `transform`: `scale` (al recogerse sobre una marca) se aplica por fuera
      // de `transform` y encogería también el desplazamiento, llevando el punto hacia (0,0).
      const at = `${x}px ${y}px`;
      el.style.translate = at;
      box.style.translate = at;
      el.hidden = false;
      box.hidden = false;
    };
    const over = (e: PointerEvent) => update(logoAt(e.target));
    // Con scroll el contenido se mueve bajo un ratón quieto: se vuelve a mirar qué hay debajo.
    const scrolled = () => {
      if (x >= 0) update(logoAt(document.elementFromPoint(x, y)));
    };
    const hide = () => {
      el.hidden = true;
      box.hidden = true;
      update(null);
    };

    const enable = () => {
      root.classList.add(ACTIVE_CLASS);
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerover", over, { passive: true });
      window.addEventListener("scroll", scrolled, { passive: true });
      root.addEventListener("pointerleave", hide);
    };
    const disable = () => {
      root.classList.remove(ACTIVE_CLASS);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("scroll", scrolled);
      root.removeEventListener("pointerleave", hide);
      hide();
    };

    const sync = () => (query.matches ? enable() : disable());
    sync();
    query.addEventListener("change", sync);

    return () => {
      query.removeEventListener("change", sync);
      disable();
    };
  }, []);

  return (
    <>
      <div
        ref={dot}
        className={styles.dot}
        data-cursor
        data-off={logo ? "" : undefined}
        aria-hidden="true"
        hidden
      />
      <div
        ref={badge}
        className={styles.logo}
        data-on={logo ? "" : undefined}
        aria-hidden="true"
        hidden
      >
        {shown && (
          // biome-ignore lint/performance/noImgElement: logo remoto (PNG sin fondo), tamaño acotado por CSS
          <img key={shown} src={shown} alt="" decoding="async" className={styles.logoImage} />
        )}
      </div>
    </>
  );
}
