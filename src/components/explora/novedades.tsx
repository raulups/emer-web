"use client";

import { type CSSProperties, useState } from "react";
import { DisplayTitle } from "@/components/ui/display-title";
import { ScrambleText } from "@/components/ui/scramble-text";
import typo from "@/components/ui/type.module.css";
import type { ExploraBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { pad } from "@/lib/motion/math";
import { BrandImage } from "./brand-image";
import { NoStock } from "./no-stock";
import styles from "./novedades.module.css";

/** `2026-09-28T…` → `28.09.26`. */
function arrival(iso: string): string {
  return iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}` : "";
}

type Props = { newest: readonly ExploraBrand[] };

/**
 * §4.3: Novedades con fondo negro. Título sticky a la izquierda, lista de marcas por `created_at`
 * (la opacidad de cada fila y la transición a Emergentes las escribe el bucle de `explora.tsx`) y
 * foto de la marca en hover, sin animación. El panel izquierdo va dentro de `data-stk`, que es
 * lo que enmascara la transición.
 */
export function Novedades({ newest }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const brand = hovered === null ? null : newest[hovered];

  return (
    <section
      className={styles.nv}
      data-nv
      onMouseLeave={() => setHovered(null)}
      aria-label="Populares"
    >
      <div className={styles.left}>
        <div className={styles.stk} data-stk>
          <div className={styles.panel}>
            <span className={styles.vline} aria-hidden="true" />
            <span className={styles.hline} aria-hidden="true" />
            <div className={styles.head}>
              <p className={`${typo.label} ${styles.kicker}`}>
                <ScrambleText text="A — 2" />
                <ScrambleText text="Populares" />
                <ScrambleText text={`${pad(newest.length, 2)} marcas`} />
              </p>
              <DisplayTitle lines={[["LAS", "MÁS"], ["*POPULARES"]]} className={styles.title} />
            </div>
            <p className={styles.text}>
              Las marcas que más se mueven en EMER. Pasa por encima de un nombre para verla.
            </p>

            <div className={styles.preview} data-on={brand ? "" : undefined} aria-hidden="true">
              {brand && (
                <>
                  <BrandImage
                    key={brand.id}
                    sources={brand.sources}
                    alt={brand.name}
                    width={960}
                    height={1080}
                    request={1280}
                    className={styles.previewImage}
                  />
                  {brand.products.length === 0 && (
                    <NoStock tone="overlay" className={styles.previewEmpty} />
                  )}
                  <ul className={styles.previewProducts}>
                    {brand.products.slice(0, 3).map((product) => (
                      <li key={product.id} className={styles.previewCard}>
                        <span className={styles.previewPhoto}>
                          <BrandImage
                            sources={product.image ? [product.image] : []}
                            alt=""
                            width={300}
                            height={400}
                            request={600}
                            className={styles.previewProductImage}
                          />
                        </span>
                        <span className={styles.previewMeta}>
                          <span className={`${typo.label} ${styles.previewName}`}>
                            {product.name}
                          </span>
                          <span className={`${typo.label} ${styles.previewPrice}`}>
                            {price(product.price)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
          <div className={styles.sw} data-sw />
        </div>
        <div className={styles.sl} data-sl>
          <span className={styles.slLine} data-sl-line />
        </div>
      </div>

      <div className={styles.right} data-nv-right>
        <ul className={styles.rows}>
          {newest.map((item, i) => (
            <li
              key={item.id}
              className={styles.rowWrap}
              style={{ "--delay": `${300 + i * 110}ms` } as CSSProperties}
            >
              <a
                className={styles.row}
                data-nv-row
                data-scramble-hover
                href={item.url ?? undefined}
                target="_blank"
                rel="noopener"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                <span className={`${typo.editorial} ${styles.rowName}`}>{item.name}</span>
                <span className={styles.plus} aria-hidden="true">
                  +
                </span>
                <ScrambleText
                  text={`${pad(i + 1, 2)} — Llegó el ${arrival(item.createdAt)} · ${item.count} piezas`}
                  className={`${typo.label} ${styles.rowMeta}`}
                />
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.end} data-nv-end />
        <div className={styles.spacer} data-sp />
      </div>
    </section>
  );
}
