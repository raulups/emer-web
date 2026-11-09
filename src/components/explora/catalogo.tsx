"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useRef } from "react";
import { DisplayTitle } from "@/components/ui/display-title";
import typo from "@/components/ui/type.module.css";
import type { ExploraBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { BrandImage } from "./brand-image";
import styles from "./catalogo.module.css";
import { NoStock } from "./no-stock";
import { openMarketplace } from "./novedades";
import { peekProps } from "./product-peek";

const PRODUCTS = 3;
/** Cada cuántas marcas va una siempre abierta (con nombre y productos a la vista). */
const OPEN_EVERY = 3;

/** 1 de cada 3 marcas va abierta; si le toca a una sin piezas, pasa a la siguiente que tenga. */
function openFlags(brands: readonly ExploraBrand[]): boolean[] {
  let since = OPEN_EVERY;
  return brands.map((brand) => {
    since += 1;
    if (since <= OPEN_EVERY || brand.products.length === 0) return false;
    since = 1;
    return true;
  });
}

type Props = { brands: readonly ExploraBrand[] };

/** La foto lleva al Marketplace filtrado si la marca tiene piezas; si no, a su web. */
function PhotoLink({ brand }: { brand: ExploraBrand }) {
  const photo = (
    <BrandImage
      sources={brand.portrait}
      alt={brand.name}
      width={480}
      height={600}
      request={640}
      className={styles.image}
    />
  );
  if (brand.count > 0)
    return (
      <Link
        className={styles.photo}
        data-cursor-logo={brand.logo ?? undefined}
        href={`/marketplace?brand=${brand.id}`}
        onClick={openMarketplace(brand.id)}
      >
        {photo}
      </Link>
    );
  if (brand.url)
    return (
      <a
        className={styles.photo}
        data-cursor-logo={brand.logo ?? undefined}
        href={brand.url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {photo}
      </a>
    );
  return (
    <span className={styles.photo} data-cursor-logo={brand.logo ?? undefined}>
      {photo}
    </span>
  );
}

/**
 * Emergentes (va justo después de Populares): entra con el mismo negro que Populares y, mientras
 * sube con el scroll y sus piezas aparecen, el fondo pasa a blanco. Al llegar arriba ya es blanca,
 * se queda fija y una escalera de fotos, cada una algo más abajo que la anterior, recorre la
 * pantalla en diagonal. `explora.tsx` escribe
 * todos los `transform` y `opacity`. Línea, nombre que se escribe y tres productos son CSS y no
 * cambian el tamaño de nada: en 1 de cada 3 marcas (más grande) salen solos al entrar en pantalla;
 * en las demás, con el hover.
 */
export function Catalogo({ brands }: Props) {
  const root = useRef<HTMLElement>(null);
  const open = openFlags(brands);

  // Las marcas abiertas se escriben una vez, al entrar en pantalla.
  useEffect(() => {
    const tiles = root.current?.querySelectorAll<HTMLElement>("[data-open]");
    if (!tiles) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-seen", "");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.4 },
    );
    for (const tile of tiles) observer.observe(tile);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={root} className={styles.cat} data-cat data-scramble-in aria-label="Emergentes">
      <div className={styles.pin} data-cat-pin>
        <div className={styles.stage}>
          <span className={styles.dark} data-cat-dark aria-hidden="true" />
          <div className={styles.head}>
            <div className={styles.headIn} data-cat-t>
              <div className={styles.titleOnDark} data-cat-title-on-dark>
                <DisplayTitle lines={[["LAS"], ["*EMERGENTES"]]} className={styles.title} />
              </div>
              {/* La misma, en oscuro: se funde con la de arriba cuando el fondo se aclara. */}
              <div className={styles.titleOnLight} data-cat-title-on-light aria-hidden="true">
                <DisplayTitle
                  as="h3"
                  lines={[["LAS"], ["*EMERGENTES"]]}
                  className={styles.titleInk}
                />
              </div>
            </div>
          </div>
          <div className={styles.rail}>
            <ul className={styles.track} data-cat-track>
              {brands.map((brand, i) => (
                <li
                  key={brand.id}
                  className={styles.tile}
                  data-cat-cell
                  data-cat-g
                  data-open={open[i] || undefined}
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className={styles.line} aria-hidden="true" />
                  <h3 className={styles.name} aria-label={brand.name}>
                    {[...brand.name].map((letter, j) => (
                      <span
                        // biome-ignore lint/suspicious/noArrayIndexKey: las letras de un nombre fijo no se reordenan
                        key={j}
                        className={styles.letter}
                        style={{ "--j": j } as CSSProperties}
                      >
                        {letter}
                      </span>
                    ))}
                  </h3>
                  <PhotoLink brand={brand} />
                  {brand.products.length > 0 ? (
                    <ul className={styles.products}>
                      {brand.products.slice(0, PRODUCTS).map((product, j) => (
                        <li
                          key={product.id}
                          className={styles.product}
                          style={{ "--j": j } as CSSProperties}
                          {...peekProps(product, brand.name)}
                        >
                          <span className={styles.productPhoto}>
                            <BrandImage
                              sources={product.image ? [product.image] : []}
                              alt=""
                              width={200}
                              height={267}
                              request={400}
                              className={styles.image}
                            />
                          </span>
                          <span className={`${typo.label} ${styles.price}`}>
                            {price(product.price)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <NoStock className={styles.soon} />
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
