"use client";

import { type SyntheticEvent, type TransitionEvent, useEffect, useRef, useState } from "react";
import { APP_LINKS, APP_PROMPT_KEY } from "@/lib/app-links";
import { lockScroll } from "@/lib/motion/scroll";
import styles from "./app-prompt.module.css";

/** Si la transición de cierre no llega a terminar (pestaña oculta…), se cierra igual. */
const CLOSE_FALLBACK_MS = 1200;

type State = "hidden" | "open" | "closing";

function shouldShow(): boolean {
  try {
    if (sessionStorage.getItem(APP_PROMPT_KEY)) return false;
    sessionStorage.setItem(APP_PROMPT_KEY, "1");
    return true;
  } catch {
    return true;
  }
}

const STORES = [
  { name: "App Store", href: APP_LINKS.ios },
  { name: "Google Play", href: APP_LINKS.android },
] as const;

/**
 * Aviso de la web de móvil: para una mejor experiencia, la app. Hoja inferior modal (`<dialog>`
 * nativo: página inerte detrás y Escape). Entra y sale con `transform`; con «reducir movimiento», sin animar.
 */
export function AppPrompt() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    const el = dialog.current;
    if (!el || !shouldShow()) return;
    el.showModal();
    // El foco empieza en la hoja (sin marcar ningún botón); Tab entra en sus controles.
    el.focus();
    setState("open");
  }, []);

  useEffect(() => {
    if (state === "hidden") return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [state]);

  const finish = () => {
    dialog.current?.close();
    setState("hidden");
  };

  useEffect(() => {
    if (state !== "closing") return;
    const timer = window.setTimeout(finish, CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  });

  const close = () => setState((current) => (current === "open" ? "closing" : current));

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    close();
  };

  const onTransitionEnd = (event: TransitionEvent<HTMLDialogElement>) => {
    if (
      state === "closing" &&
      event.target === event.currentTarget &&
      event.propertyName === "transform"
    ) {
      finish();
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape llega por `cancel`; el clic es el del fondo
    <dialog
      ref={dialog}
      className={styles.sheet}
      aria-labelledby="app-prompt-title"
      aria-describedby="app-prompt-text"
      data-closing={state === "closing" || undefined}
      data-lenis-prevent
      tabIndex={-1}
      onCancel={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onTransitionEnd={onTransitionEnd}
    >
      <div className={styles.body}>
        <div className={styles.head}>
          <p className={styles.eyebrow}>EMER EN EL MÓVIL</p>
          <button type="button" className={styles.close} aria-label="Cerrar" onClick={close}>
            ×
          </button>
        </div>
        <h2 id="app-prompt-title" className={styles.title}>
          MEJOR EN LA APP
        </h2>
        <p id="app-prompt-text" className={styles.text}>
          Para una mejor experiencia, descarga la app de Emer. Desde el móvil, en la web solo tienes
          el Marketplace.
        </p>
        <ul className={styles.stores}>
          {STORES.map((store) => (
            <li key={store.name}>
              {store.href ? (
                <a
                  className={styles.store}
                  href={store.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {store.name.toUpperCase()}
                </a>
              ) : (
                <span className={styles.store} aria-disabled="true">
                  {store.name.toUpperCase()}
                  <span className={styles.soon}>PRÓXIMAMENTE</span>
                </span>
              )}
            </li>
          ))}
        </ul>
        <button type="button" className={styles.continue} onClick={close}>
          SEGUIR EN LA WEB
        </button>
      </div>
    </dialog>
  );
}
