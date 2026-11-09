"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import typo from "@/components/ui/type.module.css";
import type { ExploraBrand } from "@/lib/explora-data";
import { pad } from "@/lib/motion/math";
import { brandActions } from "./brand-actions";
import { BrandImage } from "./brand-image";
import styles from "./emergentes.module.css";
import { openMarketplace } from "./novedades";

/**
 * Composición del grid (12 columnas), que se repite cada 7 fotos: columna de inicio, ancho,
 * proporción y desfase vertical. Las columnas crecen dentro de cada fila; al volver atrás empieza
 * una fila nueva. Así ninguna fila se parece a la anterior y queda aire entre fotos.
 */
const LAYOUT: readonly { col: number; span: number; ratio: string; shift: number }[] = [
  { col: 1, span: 4, ratio: "4 / 5", shift: 0 },
  { col: 6, span: 3, ratio: "3 / 4", shift: 16 },
  { col: 10, span: 3, ratio: "4 / 5", shift: 6 },
  { col: 2, span: 2, ratio: "1 / 1", shift: 4 },
  { col: 5, span: 5, ratio: "5 / 4", shift: 0 },
  { col: 11, span: 2, ratio: "3 / 4", shift: 20 },
  { col: 3, span: 4, ratio: "4 / 5", shift: 0 },
];

/** Fotos por tanda (dos vueltas completas de `LAYOUT`): las primeras y cada «Ver más». */
const PAGE = LAYOUT.length * 2;

const pieces = (count: number) =>
  count > 0 ? `${count} ${count === 1 ? "pieza" : "piezas"}` : "Sin stock";

/** Una foto del grid: lleva al Marketplace filtrado si la marca tiene piezas; si no, a su web. */
function Tile({ brand }: { brand: ExploraBrand }) {
  const { primary } = brandActions(brand);
  const content = (
    <>
      <span className={styles.photo}>
        <BrandImage
          sources={brand.portrait}
          alt={brand.name}
          width={480}
          height={600}
          request={720}
          loading="lazy"
          className={styles.image}
        />
      </span>
      <span className={`${typo.label} ${styles.caption}`} aria-hidden="true">
        <span className={styles.name}>{brand.name}</span>
        <span>{pieces(brand.count)}</span>
      </span>
    </>
  );
  const shared = {
    className: styles.tile,
    "data-cat-row": brand.id,
    "data-cursor-logo": brand.logo ?? undefined,
  };
  if (primary === "market")
    return (
      <Link
        {...shared}
        href={`/marketplace?brand=${brand.id}`}
        onClick={openMarketplace(brand.id)}
        aria-label={`${brand.name}: ver sus ${brand.count} piezas en el Marketplace`}
      >
        {content}
      </Link>
    );
  if (primary === "store" && brand.url)
    return (
      <a
        {...shared}
        href={brand.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${brand.name}: sin stock, ir a su tienda (se abre en otra pestaña)`}
      >
        {content}
      </a>
    );
  return <span {...shared}>{content}</span>;
}

type Props = { brands: readonly ExploraBrand[] };

/**
 * §4.4 Catálogo: todas las marcas, en blanco tras Emergentes. Solo un grid de fotos, sin títulos ni
 * controles: una composición asimétrica (`LAYOUT`) con tamaños, proporciones y desfases distintos.
 * Con el hover, la foto se acerca, sale su nombre y el resto se apaga (solo `transform` y
 * `opacity`). Enseña `PAGE` marcas y «Ver más» añade otra tanda. Las fotos se cargan al acercarse
 * y entran al llegar a ellas. Scroll normal.
 */
export function Emergentes({ brands }: Props) {
  const root = useRef<HTMLElement>(null);
  const list = useMemo(
    () => [...brands].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
    [brands],
  );
  const [shown, setShown] = useState(PAGE);
  const visible = list.slice(0, shown);
  const more = list.length - visible.length;

  // «Ver más»: el foco pasa a la primera foto nueva (sin mover el scroll) para seguir con el teclado.
  const firstNew = useRef<number | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: corre cuando se pinta la tanda nueva.
  useEffect(() => {
    const index = firstNew.current;
    if (index === null) return;
    firstNew.current = null;
    root.current
      ?.querySelectorAll<HTMLElement>("[data-cat-row]")
      [index]?.focus({ preventScroll: true });
  }, [shown]);
  const showMore = () => {
    firstNew.current = shown;
    setShown((n) => n + PAGE);
  };

  // Cada foto aparece al entrar en pantalla (una vez, en cascada).
  // biome-ignore lint/correctness/useExhaustiveDependencies: se vuelve a observar cuando cambia la lista pintada.
  useEffect(() => {
    const items = root.current?.querySelectorAll<HTMLElement>("[data-cat-item]:not([data-seen])");
    if (!items?.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target as HTMLElement;
          node.style.setProperty("--d", `${Math.min(order++, 6) * 90}ms`);
          node.setAttribute("data-seen", "");
          observer.unobserve(node);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, [shown, list]);

  return (
    <section
      ref={root}
      className={styles.er}
      data-er
      data-scramble-in
      aria-labelledby="catalogo-titulo"
    >
      <h2 id="catalogo-titulo" className="sr-only">
        Catálogo
      </h2>
      <ul className={styles.grid}>
        {visible.map((brand, i) => {
          const spot = LAYOUT[i % LAYOUT.length] ?? LAYOUT[0];
          return (
            <li
              key={brand.id}
              className={styles.item}
              data-cat-item
              style={
                {
                  "--col": spot?.col,
                  "--span": spot?.span,
                  "--ratio": spot?.ratio,
                  "--shift": `${spot?.shift ?? 0}vh`,
                } as CSSProperties
              }
            >
              <Tile brand={brand} />
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <div className={styles.more}>
          <button type="button" className={`${typo.label} ${styles.moreButton}`} onClick={showMore}>
            [ Ver más ]
          </button>
          <span className={`${typo.label} ${styles.moreCount}`} aria-live="polite">
            {pad(visible.length, 2)} / {pad(list.length, 2)}
          </span>
        </div>
      )}
    </section>
  );
}
