"use client";

import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { APP_LINKS, APP_PROMPT_KEY } from "@/lib/app-links";
import styles from "./app-prompt.module.css";

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

/** Aviso de la web de móvil: para una mejor experiencia, la app. Una vez por sesión. */
export function AppPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (shouldShow()) setOpen(true);
  }, []);

  const close = () => setOpen(false);

  return (
    <BottomSheet
      open={open}
      onClose={close}
      title="EMER EN EL MÓVIL"
      labelledBy="app-prompt-title"
      describedBy="app-prompt-text"
    >
      <div className={styles.content}>
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
    </BottomSheet>
  );
}
