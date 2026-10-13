"use client";

import { type CSSProperties, useState } from "react";
import type { ExploraBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { BrandImage } from "./brand-image";
import styles from "./catalogo.module.css";

/** Columnas del grid irregular (README §4.5, `LAY`): ancho y alto relativo de cada celda. */
const LAY: readonly { width: string; heights: readonly number[] }[] = [
  { width: "26vw", heights: [1] },
  { width: "20vw", heights: [0.62, 0.38] },
  { width: "32vw", heights: [0.45, 0.55] },
  { width: "18vw", heights: [1, 1, 1] },
  { width: "28vw", heights: [1] },
  { width: "22vw", heights: [0.5, 0.5] },
  { width: "30vw", heights: [0.7, 0.3] },
];

type Cell = { brand: ExploraBrand; height: number; first: boolean };
type Column = { width: string; cells: Cell[] };

/** Reparte las marcas por las columnas de `LAY`, de forma cíclica, hasta agotarlas. */
function layout(brands: readonly ExploraBrand[]): Column[] {
  const columns: Column[] = [];
  let next = 0;
  for (let c = 0; next < brands.length; c++) {
    const lay = LAY[c % LAY.length];
    if (!lay) break;
    const cells = lay.heights.slice(0, brands.length - next).map((height, k) => {
      const brand = brands[next++];
      if (!brand) throw new Error("Catálogo: marca fuera de rango");
      return { brand, height, first: k === 0 };
    });
    columns.push({ width: lay.width, cells });
  }
  return columns;
}

type Props = { brands: readonly ExploraBrand[] };

/**
 * §4.5: entrada de 70vh con la línea vertical bajando y bloque sticky cuya pista (título incluido)
 * se desplaza en horizontal con el scroll. El bucle de `explora.tsx` escribe todos los
 * `transform` y `opacity`; el hover (zoom, atenuado de las demás, miniaturas, «Ver marca ↗») es
 * de este componente. Las celdas nunca cambian de tamaño.
 */
export function Catalogo({ brands }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);
  const columns = layout(brands);

  return (
    <section
      className={styles.cat}
      data-cat
      onMouseLeave={() => setHovered(null)}
      aria-label="Catálogo"
    >
      <div className={styles.lead} data-cat-lead>
        <span className={styles.lineV} data-cat-line aria-hidden="true" />
      </div>
      <div className={styles.pin} data-cat-pin>
        <div className={styles.stage}>
          <div className={styles.track} data-cat-track>
            <div className={styles.panel}>
              <span className={styles.lineH} data-cat-h aria-hidden="true" />
              <h2 className={styles.title} data-cat-t>
                CATÁLOGO
              </h2>
              <p className={styles.text} data-cat-t>
                Todas las marcas de EMER. Baja para recorrerlas.
              </p>
              <p className={styles.count} data-cat-t>
                {brands.length} marcas
              </p>
            </div>
            {columns.map((column) => (
              <div
                key={column.cells[0]?.brand.id}
                className={styles.column}
                style={{ width: column.width }}
                data-cat-g
              >
                {column.cells.map(({ brand, height, first }) => {
                  const on = hovered === brand.id;
                  const dim = hovered !== null && !on;
                  return (
                    <a
                      key={brand.id}
                      className={styles.cell}
                      style={{ "--grow": height } as CSSProperties}
                      data-first={first || undefined}
                      data-on={on || undefined}
                      data-dim={dim || undefined}
                      href={brand.url ?? undefined}
                      target="_blank"
                      rel="noopener"
                      onMouseEnter={() => setHovered(brand.id)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(brand.id)}
                      onBlur={() => setHovered(null)}
                    >
                      <span className={styles.frame}>
                        <BrandImage
                          sources={brand.sources}
                          alt={brand.name}
                          width={480}
                          height={640}
                          request={640}
                          className={styles.photo}
                        />
                        <span className={styles.labels}>
                          <span className={styles.name}>{brand.name}</span>
                          <span className={styles.cta}>Ver marca ↗</span>
                        </span>
                        <span className={styles.thumbs}>
                          {brand.products.slice(0, 3).map((product, j) => (
                            <span
                              key={product.id}
                              className={styles.thumb}
                              style={{ "--delay": `${120 + j * 70}ms` } as CSSProperties}
                            >
                              <BrandImage
                                sources={product.image ? [product.image] : []}
                                alt=""
                                width={168}
                                height={224}
                                request={240}
                                className={styles.thumbImage}
                              />
                              <span className="sr-only">{price(product.price)}</span>
                            </span>
                          ))}
                          {brand.products.length === 0 && (
                            <span className={styles.soon}>Catálogo pronto</span>
                          )}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
