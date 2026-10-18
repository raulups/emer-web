"use client";

import { useEffect, useState } from "react";
import { fitLogo, type Logo, normalizeLogo } from "@/lib/logo";
import styles from "./brand-logo.module.css";

type Props = {
  src: string;
  /** Hueco útil para el logo dentro de la caja (px). */
  width: number;
  height: number;
  className?: string;
};

/**
 * Logo de marca recortado a su contenido y con el mismo peso visual que los demás (`lib/logo.ts`).
 * La caja toma el fondo del propio logo. Mientras se analiza no se ve nada (aparece con un
 * fundido); si no se puede leer, se pinta el original con `contain`.
 */
export function BrandLogo({ src, width, height, className }: Props) {
  const [logo, setLogo] = useState<Logo | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    setLogo(undefined);
    normalizeLogo(src).then((result) => {
      if (alive) setLogo(result);
    });
    return () => {
      alive = false;
    };
  }, [src]);

  const size = logo ? fitLogo(logo.ratio, width, height) : { width, height };

  return (
    <span
      className={`${styles.box} ${className ?? ""}`}
      data-ready={logo !== undefined || undefined}
      style={logo ? { background: logo.background } : undefined}
    >
      {logo !== undefined && (
        // biome-ignore lint/performance/noImgElement: logo remoto (o recortado en data URL), tamaño calculado
        <img
          src={logo?.src ?? src}
          alt=""
          width={size.width}
          height={size.height}
          className={styles.image}
          data-fallback={logo === null || undefined}
        />
      )}
    </span>
  );
}
