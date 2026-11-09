"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";
import { DisplayTitle } from "@/components/ui/display-title";
import typo from "@/components/ui/type.module.css";
import type { ExploraBrand } from "@/lib/explora-data";
import { pad } from "@/lib/motion/math";
import { write } from "@/lib/motion/write";
import { brandActions } from "./brand-actions";
import { BrandImage } from "./brand-image";
import styles from "./llegadas.module.css";
import { openMarketplace } from "./novedades";

/** Recorrido (en % de su alto) de un nombre al rodar: más de 100 para que no asome el vecino. */
const ROLL_PCT = 140;

/** Más de esto en horizontal entre pulsar y soltar sobre la foto es un deslizamiento. */
const SWIPE_PX = 40;

/** «2026-09-01T10:00:00Z» → «01.09.2026» (sin zona horaria: igual en servidor y cliente). */
const arrival = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}.${m}.${y}` : "";
};

/** La foto de una llegada: lleva a sus piezas en el Marketplace o, sin stock, a su tienda. */
function Frame({ brand, index, on }: { brand: ExploraBrand; index: number; on: boolean }) {
  const { primary } = brandActions(brand);
  const image = (
    <span className={styles.imageWrap} data-nw-img>
      <BrandImage
        sources={brand.portrait}
        alt=""
        width={480}
        height={600}
        request={960}
        loading={index < 2 ? "eager" : "lazy"}
        className={styles.image}
      />
    </span>
  );
  // Solo la que está a la vista responde al ratón y al teclado.
  const shared = {
    className: styles.frame,
    "data-nw-frame": index,
    "data-on": on ? "" : undefined,
    "aria-hidden": on ? undefined : true,
    tabIndex: on ? 0 : -1,
    // Sin arrastre nativo del enlace: deslizar sobre la foto pasa de marca.
    draggable: false,
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
        {image}
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
        {image}
      </a>
    );
  return (
    <span {...shared} tabIndex={undefined}>
      {image}
    </span>
  );
}

type Props = { brands: readonly ExploraBrand[] };

/**
 * Novedades (tras Emergentes): las últimas marcas en llegar a Emer, recorridas a mano. Una pantalla
 * que no retiene el scroll. Se pasa de marca con ANTERIOR / SIGUIENTE, las flechas (con el foco en
 * la sección), deslizando sobre la foto o pulsando una miniatura. En cada paso la foto nueva entra
 * como una persiana (marco e imagen en sentidos opuestos) y el nombre, gigante y en negativo sobre
 * la foto (modo diferencia), rueda como un contador junto a la línea de datos; al saltar varias,
 * ruedan todas. Una sola animación GSAP sobre un número (`f`) que se escribe en los nodos (solo
 * `transform`); con «reducir movimiento», el cambio es inmediato.
 */
export function Llegadas({ brands }: Props) {
  const root = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(0);
  const pos = useRef({ f: 0 });
  const render = useRef<(f: number) => void>(() => {});
  const down = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const count = brands.length;
  const current = brands[index];

  const { contextSafe } = useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const frames = [...el.querySelectorAll<HTMLElement>("[data-nw-frame]")];
      const images = frames.map((frame) => frame.querySelector<HTMLElement>("[data-nw-img]"));
      const rolls = [...el.querySelectorAll<HTMLElement>("[data-nw-roll]")];
      render.current = (f: number) => {
        frames.forEach((frame, i) => {
          // La i entra mientras f va de i − 1 a i; aún sin entrar, un poco más abajo (no asoma).
          const t = i === 0 ? 1 : Math.min(1, Math.max(0, f - (i - 1)));
          const off = ((1 - t) * 100).toFixed(2);
          write(
            frame,
            "transform",
            t >= 1 ? "none" : t <= 0 ? "translateY(102%)" : `translateY(${off}%)`,
          );
          const image = images[i];
          if (image) write(image, "transform", t >= 1 ? "none" : `translateY(-${off}%)`);
        });
        // Los vecinos quedan bien lejos (los trazos que sobresalen de la línea no asoman) y, fuera
        // de la máscara, ocultos del todo.
        for (const roll of rolls) {
          const d = Math.max(-1.05, Math.min(1.05, Number(roll.dataset.nwRoll) - f));
          write(roll, "transform", d === 0 ? "none" : `translateY(${(d * ROLL_PCT).toFixed(2)}%)`);
          write(roll, "opacity", Math.abs(d) >= 1 ? "0" : "1");
        }
      };
      render.current(pos.current.f);
    },
    { scope: root, dependencies: [brands] },
  );

  const go = contextSafe((to: number) => {
    if (count === 0) return;
    const next = ((to % count) + count) % count;
    setIndex(next);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const distance = Math.abs(next - pos.current.f);
    gsap.to(pos.current, {
      f: next,
      duration: still ? 0 : Math.min(1.5, 0.75 + distance * 0.09),
      ease: "power3.inOut",
      overwrite: true,
      onUpdate: () => render.current(pos.current.f),
    });
  });

  // Flechas solo con el foco dentro de la sección (en sus botones o en la foto).
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
    else return;
    event.preventDefault();
  };

  // Deslizar sobre la foto: pasa de marca y no abre el enlace.
  const onPointerDown = (event: PointerEvent) => {
    down.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = down.current;
    down.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(event.clientY - start.y)) {
      swiped.current = true;
      go(index + (dx < 0 ? 1 : -1));
    }
  };
  const onClickCapture = (event: MouseEvent) => {
    if (!swiped.current) return;
    swiped.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  if (!current) return null;

  return (
    <section
      ref={root}
      className={styles.nw}
      data-nw
      data-scramble-in
      aria-label="Novedades"
      onKeyDown={onKeyDown}
    >
      <div className={styles.head}>
        <DisplayTitle lines={[["LAS"], ["*NOVEDADES"]]} className={styles.title} />
        <p className={`${typo.label} ${styles.kicker}`}>Últimas {pad(count, 2)} en llegar</p>
      </div>

      {/* Deslizar es un atajo de puntero: con teclado están ANTERIOR / SIGUIENTE y las flechas. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: gesto de puntero con alternativa accesible en los botones */}
      <div
        className={styles.photo}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
      >
        {brands.map((brand, i) => (
          <Frame key={brand.id} brand={brand} index={i} on={i === index} />
        ))}
      </div>

      {/* Encima de la foto y en modo diferencia; sin eventos: la foto sigue respondiendo. */}
      <div className={styles.names} aria-hidden="true">
        {brands.map((brand, i) => (
          <span
            key={brand.id}
            className={`${typo.editorial} ${styles.name}`}
            data-nw-roll={i}
            style={{ "--len": Math.max(4, brand.name.length) } as CSSProperties}
          >
            {brand.name}
          </span>
        ))}
      </div>

      <div className={styles.meta} aria-hidden="true">
        {brands.map((brand, i) => (
          <span key={brand.id} className={`${typo.label} ${styles.metaRow}`} data-nw-roll={i}>
            <span>Alta · {arrival(brand.createdAt)}</span>
            <span className={styles.metaStyle}>{brand.style ?? ""}</span>
            <span>
              {pad(i + 1, 2)} / {pad(count, 2)}
            </span>
          </span>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {current.name}, {index + 1} de {count}. Alta el {arrival(current.createdAt)}.
      </p>

      <div className={styles.controls}>
        <button
          type="button"
          className={`${typo.label} ${styles.step}`}
          onClick={() => go(index - 1)}
          aria-label="Novedad anterior"
        >
          ← Anterior
        </button>
        <ol className={styles.thumbs} aria-label="Ir a una novedad">
          {brands.map((brand, i) => (
            <li key={brand.id}>
              <button
                type="button"
                className={styles.thumb}
                data-on={i === index ? "" : undefined}
                aria-current={i === index ? "true" : undefined}
                aria-label={`${pad(i + 1, 2)}: ${brand.name}`}
                onClick={() => go(i)}
              >
                <BrandImage
                  sources={brand.portrait}
                  alt=""
                  width={36}
                  height={45}
                  request={120}
                  loading="lazy"
                  className={styles.thumbImage}
                />
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={`${typo.label} ${styles.step}`}
          onClick={() => go(index + 1)}
          aria-label="Novedad siguiente"
        >
          Siguiente →
        </button>
      </div>
    </section>
  );
}
