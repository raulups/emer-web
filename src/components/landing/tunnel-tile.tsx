"use client";

import { useState } from "react";
import { sizedImage } from "@/lib/marketplace";
import styles from "./landing.module.css";

/** Ancho a 2x de la tarjeta de 14vw que llega a crecer ×4 (se pide con margen, no a pantalla completa). */
const IMAGE_WIDTH = 480;

type Props = { sources: readonly string[]; name: string };

/** Foto de marca del túnel. Si falla la de la marca, prueba la siguiente (primer producto). */
export function TunnelTile({ sources, name }: Props) {
  const [index, setIndex] = useState(0);
  const src = sources[index];

  return (
    <div className={styles.tile} data-tile>
      {src && (
        // biome-ignore lint/performance/noImgElement: imágenes remotas de varios orígenes, tamaño fijo
        <img
          key={src}
          src={sizedImage(src, IMAGE_WIDTH)}
          alt=""
          title={name}
          width={IMAGE_WIDTH}
          height={IMAGE_WIDTH * (4 / 3)}
          decoding="async"
          className={styles.tileImage}
          onError={() => setIndex((i) => i + 1)}
        />
      )}
    </div>
  );
}
