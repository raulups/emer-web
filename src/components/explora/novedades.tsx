"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { type CSSProperties, type MouseEvent, useRef, useState } from "react";
import { DisplayTitle } from "@/components/ui/display-title";
import { ScrambleText } from "@/components/ui/scramble-text";
import typo from "@/components/ui/type.module.css";
import { bus } from "@/lib/bus";
import type { ExploraBrand } from "@/lib/explora-data";
import { domain } from "@/lib/format";
import { pad } from "@/lib/motion/math";
import { BrandImage } from "./brand-image";
import styles from "./novedades.module.css";

gsap.registerPlugin(useGSAP);

/** Entrada de cada imagen: el marco baja desde arriba mientras la foto sube dentro de él. */
const REVEAL = { duration: 0.5, ease: "power4.inOut" } as const;
const FRAME_FROM = -100;
const IMAGE_FROM = 90;

type Props = { newest: readonly ExploraBrand[] };

/** El Marketplace filtrado por la marca, sin salir del Shell (como «Ver marca»). */
export const openMarketplace = (id: string) => (event: MouseEvent<HTMLAnchorElement>) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  bus.emit("market:filters", { brands: [id] });
  bus.emit("view", "market");
};

/**
 * §4.3: Populares con fondo negro. Título fijo a la izquierda y lista de marcas a la derecha. Al
 * pasar por una fila, esta se invierte y la foto de la marca entra siempre en el centro de la
 * lista, encima de la anterior. Nunca retiene el scroll: sube con la página, sobre el mismo negro
 * con el que empieza Emergentes.
 */
export function Novedades({ newest }: Props) {
  const root = useRef<HTMLElement>(null);
  const [preload, setPreload] = useState(false);

  useGSAP(
    () => {
      const section = root.current;
      const list = section?.querySelector<HTMLElement>("[data-nv-rows]");
      const stage = section?.querySelector<HTMLElement>("[data-nv-stage]");
      if (!section || !list || !stage) return;

      // Las fotos se piden al acercarse a la sección: al pasar por una fila ya están descargadas.
      const near = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          near.disconnect();
          setPreload(true);
        },
        { rootMargin: "100% 0px" },
      );
      near.observe(section);

      const mm = gsap.matchMedia();
      mm.add(
        {
          moving: "(prefers-reduced-motion: no-preference)",
          still: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const moving = Boolean(context.conditions?.moving);
          let active = -1;

          const dispose = (frame: Element) => {
            gsap.killTweensOf([frame, frame.firstElementChild]);
            frame.remove();
          };

          const clear = () => {
            for (const frame of [...stage.children]) dispose(frame);
          };

          const show = (index: number) => {
            if (index === active) return;
            active = index;
            stage.toggleAttribute("data-on", true);

            const frame = document.createElement("div");
            frame.className = styles.frame ?? "";
            const source = section.querySelector<HTMLImageElement>(`[data-nv-src="${index}"] img`);
            const image = source?.cloneNode() as HTMLImageElement | undefined;
            if (image) {
              image.className = styles.frameImage ?? "";
              image.decoding = "sync";
              frame.append(image);
            }
            stage.append(frame);

            const covered = () => {
              while (frame.previousElementSibling) dispose(frame.previousElementSibling);
            };
            if (!moving) {
              covered();
              return;
            }
            gsap.fromTo(
              frame,
              { yPercent: FRAME_FROM },
              { yPercent: 0, ...REVEAL, onComplete: covered },
            );
            if (image) gsap.fromTo(image, { yPercent: IMAGE_FROM }, { yPercent: 0, ...REVEAL });
          };

          const hide = () => {
            active = -1;
            stage.removeAttribute("data-on");
            clear();
          };

          const rowOf = (target: EventTarget | null) =>
            (target as Element | null)?.closest<HTMLElement>("[data-nv-row]");
          const onOver = (event: PointerEvent) => {
            if (event.pointerType === "touch") return;
            const row = rowOf(event.target);
            if (row) show(Number(row.dataset.nvRow));
          };
          const onFocus = (event: FocusEvent) => {
            const row = rowOf(event.target);
            if (row?.matches(":focus-visible")) show(Number(row.dataset.nvRow));
          };

          list.addEventListener("pointerover", onOver);
          list.addEventListener("pointerleave", hide);
          list.addEventListener("focusin", onFocus);
          list.addEventListener("focusout", hide);
          list.addEventListener("click", hide);
          return () => {
            list.removeEventListener("pointerover", onOver);
            list.removeEventListener("pointerleave", hide);
            list.removeEventListener("focusin", onFocus);
            list.removeEventListener("focusout", hide);
            list.removeEventListener("click", hide);
            hide();
          };
        },
      );

      return () => {
        near.disconnect();
        mm.revert();
      };
    },
    { scope: root, dependencies: [newest], revertOnUpdate: true },
  );

  return (
    <section ref={root} className={styles.nv} data-nv data-scramble-in aria-label="Populares">
      <div className={styles.left}>
        {/* Blanco que el bucle funde mientras sube Emergentes: toda la pantalla pasa a blanco. */}
        <span className={styles.light} data-nv-light aria-hidden="true" />
        <div className={styles.stk} data-stk>
          <div className={styles.panel}>
            <div className={styles.head}>
              <div data-nv-title-on-dark>
                <DisplayTitle lines={[["LAS", "MÁS"], ["*POPULARES"]]} className={styles.title} />
              </div>
              {/* La misma, en oscuro: se funde con la de arriba cuando el fondo se aclara. */}
              <div className={styles.titleOnLight} data-nv-title-on-light aria-hidden="true">
                <DisplayTitle
                  as="h3"
                  lines={[["LAS", "MÁS"], ["*POPULARES"]]}
                  className={styles.titleInk}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.light} data-nv-light aria-hidden="true" />
        <div className={styles.fill}>
          <div className={styles.list}>
            <ul className={styles.rows} data-nv-rows>
              {newest.map((item, i) => {
                const site = domain(item.url);
                return (
                  <li
                    key={item.id}
                    className={styles.rowWrap}
                    style={{ "--delay": `${300 + i * 110}ms` } as CSSProperties}
                  >
                    <Link
                      className={styles.row}
                      data-nv-row={i}
                      data-scramble-hover
                      data-cursor-logo={item.logo ?? undefined}
                      {...(site && item.url
                        ? { href: item.url, target: "_blank", rel: "noopener noreferrer" }
                        : {
                            href: `/marketplace?brand=${item.id}`,
                            onClick: openMarketplace(item.id),
                          })}
                    >
                      <span className={styles.rowContent}>
                        <ScrambleText
                          text={pad(i + 1, 2)}
                          className={`${typo.label} ${styles.number}`}
                          onIn
                        />
                        <span className={`${typo.editorial} ${styles.name}`}>{item.name}</span>
                        {item.style && (
                          <ScrambleText
                            text={`(${item.style})`}
                            className={`${typo.label} ${styles.tag}`}
                            onIn
                          />
                        )}
                        <span className={`${typo.label} ${styles.more}`}>
                          <ScrambleText
                            text={site ?? "Ver productos"}
                            className={styles.site}
                            onIn
                          />
                          {site && <span className="sr-only"> (se abre en otra pestaña)</span>}
                          <svg
                            className={styles.arrow}
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            aria-hidden="true"
                          >
                            <path d="M5 11 11 5M6 5h5v5" />
                          </svg>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className={styles.end} />

            {/* Encima de las filas y sin eventos: la lista sigue respondiendo por debajo. */}
            <div className={styles.stage} data-nv-stage aria-hidden="true" />
            {preload && (
              <div className={styles.sources} aria-hidden="true">
                {newest.map((item, i) => (
                  <span key={item.id} data-nv-src={i}>
                    <BrandImage
                      sources={item.portrait}
                      alt=""
                      width={480}
                      height={600}
                      request={960}
                    />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
