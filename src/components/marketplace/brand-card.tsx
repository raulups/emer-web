"use client";

import { useState } from "react";
import type { Brand } from "@/lib/data";
import { brandImage } from "@/lib/format";
import { sizedImage } from "@/lib/marketplace";
import styles from "./brand-card.module.css";

/** Ancho de la ficha (260px de menú − 72px de padding), a 2x. */
const IMAGE_WIDTH = 380;

/**
 * Ficha de marca bajo FILTROS: imagen 4:5, logo en caja de 64×40, nombre y «estilo · año».
 * Si la imagen de la marca falla, usa la del primer producto.
 */
export function BrandCard({ brand }: { brand: Brand }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const fallback = brand.preview_products[0]?.main_image_url ?? null;
  const src = failed.has(brand.id) ? fallback : brandImage(brand, fallback);
  const meta = [brand.style, brand.founded_year].filter(Boolean).join(" · ");

  return (
    <figure className={styles.card} aria-label={`Marca: ${brand.name}`}>
      <div className={styles.media}>
        {src && (
          // biome-ignore lint/performance/noImgElement: imágenes remotas de varios orígenes, tamaño fijo
          <img
            key={src}
            src={sizedImage(src, IMAGE_WIDTH)}
            alt={brand.name}
            width={IMAGE_WIDTH}
            height={IMAGE_WIDTH * 1.25}
            className={styles.image}
            onError={() => setFailed((prev) => new Set(prev).add(brand.id))}
          />
        )}
        {brand.logo && (
          <span className={styles.logo}>
            {/* biome-ignore lint/performance/noImgElement: logo remoto, tamaño fijo */}
            <img src={brand.logo} alt="" width={52} height={28} />
          </span>
        )}
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.name}>{brand.name}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </figcaption>
    </figure>
  );
}
