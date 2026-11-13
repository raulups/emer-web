"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import button from "@/components/ui/button.module.css";
import { type Consent, MEASUREMENT_ID, setConsent } from "@/lib/analytics";
import { bus } from "@/lib/bus";
import styles from "./consent-banner.module.css";

type Props = { consent: Consent | null };

/**
 * Aviso de cookies de analítica: aparece mientras no se haya decidido y vuelve con
 * `bus.emit("consent:open")` (footer, política de cookies). Aceptar y Rechazar pesan lo mismo.
 */
export function ConsentBanner({ consent }: Props) {
  const [reopened, setReopened] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => bus.on("consent:open", () => setReopened(true)), []);

  if (!mounted || !MEASUREMENT_ID || (consent !== null && !reopened)) return null;

  const answer = (value: Consent) => {
    setConsent(value);
    setReopened(false);
  };

  return (
    <section className={styles.banner} aria-label="Cookies de analítica" aria-live="polite">
      <p className={styles.text}>
        <span className={styles.label}>[ Cookies ]</span>
        ¿Nos ayudas a mejorar Emer? Con tu permiso usamos cookies de Google Analytics para saber qué
        secciones y marcas se visitan. Sin publicidad y sin vender datos.{" "}
        <Link href="/cookies" className={styles.link}>
          Política de cookies
        </Link>
      </p>
      <div className={styles.actions}>
        <button type="button" className={button.box} onClick={() => answer("denied")}>
          Rechazar
        </button>
        <button type="button" className={button.box} onClick={() => answer("granted")}>
          Aceptar
        </button>
      </div>
    </section>
  );
}
