"use client";

import { type CSSProperties, useState } from "react";
import type { ExploraBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { BrandImage } from "./brand-image";
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
            <h2 className={styles.title}>POPULARES</h2>
            <p className={styles.text}>
              Las últimas marcas en llegar a EMER. Pasa por encima de un nombre para verla.
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
                  <ul className={styles.previewProducts}>
                    {brand.products.map((product) => (
                      <li key={product.id} className={styles.previewCard}>
                        <span className={styles.previewPhoto}>
                          <BrandImage
                            sources={product.image ? [product.image] : []}
                            alt=""
                            width={240}
                            height={320}
                            request={320}
                            className={styles.previewProductImage}
                          />
                        </span>
                        <span className={styles.previewMeta}>
                          <span className={styles.previewName}>{product.name}</span>
                          <span className={styles.previewPrice}>{price(product.price)}</span>
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

      <div className={styles.right}>
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
                href={item.url ?? undefined}
                target="_blank"
                rel="noopener"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
              >
                <span className={styles.rowName}>{item.name}</span>
                <span className={styles.plus} aria-hidden="true">
                  +
                </span>
                <span className={styles.rowMeta}>
                  Llegó el {arrival(item.createdAt)} · {item.count} piezas
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className={styles.end} />
        <div className={styles.spacer} data-sp />
      </div>
    </section>
  );
}
