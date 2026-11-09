"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DisplayTitle } from "@/components/ui/display-title";
import { isWaking, subscribeWake, wakeSince } from "@/lib/backend-wake";
import { pad } from "@/lib/motion/math";
import { subscribe } from "@/lib/motion/ticker";
import { writeText } from "@/lib/motion/write";
import styles from "./backend-wake.module.css";
import { WakeGame } from "./wake-game";

const serverSnapshot = () => false;

function WakeScreen({ active, onHidden }: { active: boolean; onHidden: () => void }) {
  const counter = useRef<HTMLSpanElement>(null);

  useEffect(
    () =>
      subscribe(() => {
        const start = wakeSince();
        if (start === null || !counter.current) return;
        const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
        writeText(counter.current, `${pad(Math.floor(seconds / 60), 2)}:${pad(seconds % 60, 2)}`);
      }),
    [],
  );

  return (
    <div
      className={styles.screen}
      data-wake
      data-active={active || undefined}
      onTransitionEnd={(event) => {
        if (!active && event.target === event.currentTarget) onHidden();
      }}
    >
      <p className="sr-only" role="status">
        El servidor se está despertando. Volvemos a intentarlo automáticamente.
      </p>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>[ SERVIDOR DORMIDO ]</p>
        <DisplayTitle
          lines={[
            ["ANDAMOS", "*JUSTOS"],
            ["DE", "*PRESUPUESTO"],
          ]}
          className={styles.title}
          play="load"
        />
        <p className={styles.text}>
          Te lo contamos con franqueza: aún no podemos pagar un servidor de los que nunca duermen.
          El nuestro es gratuito y se echa una siesta cuando nadie lo usa, así que a veces las
          peticiones tardan más de lo normal. Suele rondar el minuto.
        </p>
        <p className={styles.text}>
          Gracias por tu paciencia. Seguimos intentándolo por nuestra cuenta: no hace falta que
          recargues.
        </p>
      </div>
      <WakeGame />
      <div className={styles.clock}>
        <span className={styles.counter} ref={counter} data-wake-counter aria-hidden="true">
          00:00
        </span>
        <span className={styles.eyebrow}>TIEMPO DE ESPERA · REINTENTANDO</span>
      </div>
    </div>
  );
}

/**
 * Aviso a pantalla completa mientras se espera a que despierte el backend (`lib/backend-wake.ts`).
 * Vive en el layout: sirve para la Landing, las secciones de servidor y los filtros del Marketplace.
 * Solo se monta mientras hace falta; aparece y se va con `opacity`.
 */
export function BackendWake() {
  const active = useSyncExternalStore(subscribeWake, isWaking, serverSnapshot);
  const [mounted, setMounted] = useState(false);
  if (active && !mounted) setMounted(true);

  return mounted ? <WakeScreen active={active} onHidden={() => setMounted(false)} /> : null;
}
