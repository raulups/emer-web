"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { LoopLine } from "@/components/ui/loop-line";
import type { SectionId } from "@/lib/config/sections";
import { EASE, gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { bus } from "@/lib/motion/bus";
import { isReduced, subscribeReduced } from "@/lib/motion/reduced";
import { scheduleScrollRefresh, trackSection } from "@/lib/motion/sections";
import s from "./catalog.module.css";
import type { CatalogCell } from "./layout";

const REVEAL_BASE_S = 0.08;
const REVEAL_STEP_S = 0.045;
const NEW_TAB = " (se abre en una pestaña nueva)";

type Props = { nextId: SectionId } & (
  | { state: "ready"; rows: CatalogCell[][] }
  | { state: "empty" }
  | { state: "error" }
);

function Head({ children }: { children?: ReactNode }) {
  return (
    <div className={s.head}>
      <div className={s.reveal} data-reveal="">
        <div className={s.headInner} data-reveal-inner="">
          <p className={s.eyebrow}>CATÁLOGO</p>
          <div className={s.headBody}>
            <h2 id="cat-title" tabIndex={-1} className={s.title}>
              Todas las <br />
              marcas
            </h2>
            {children}
            <button
              type="button"
              data-js-only=""
              aria-haspopup="dialog"
              className={s.search}
              onClick={() => bus.emit("emer:search:open")}
            >
              BUSCAR <LoopLine width={40} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandCell({
  cell,
  span,
}: {
  cell: Extract<CatalogCell, { kind: "brand" }>;
  span: boolean;
}) {
  const { brand, base, grow } = cell;
  const style = { "--base": base, "--grow": grow } as CSSProperties;

  const onImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.parentElement?.setAttribute("data-loaded", "");
  };
  // Imagen que falla: se oculta y queda el nombre en trazo (estado de carga/sin imagen).
  const onImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.parentElement?.setAttribute("data-error", "");
  };

  const content = (
    <div className={s.reveal} data-reveal="">
      <div className={s.revealInner} data-reveal-inner="">
        <span className={s.ghost} aria-hidden="true">
          {brand.name}
        </span>
        {brand.img ? (
          <div className={s.media} aria-hidden="true">
            <Image
              src={brand.img}
              alt=""
              fill
              sizes="(min-width: 760px) 40vw, 50vw"
              className={s.img}
              onLoad={onImageLoad}
              onError={onImageError}
            />
            <Image
              src={brand.img}
              alt=""
              fill
              sizes="(min-width: 760px) 40vw, 50vw"
              className={s.imgGray}
            />
          </div>
        ) : (
          <span className={s.noImg} aria-hidden="true">
            {brand.name}
          </span>
        )}
        <span className={s.veil} aria-hidden="true" />
        <span className={s.label} aria-hidden="true">
          {brand.name}
        </span>
        <div className={s.open}>
          <ul className={s.prods} aria-hidden="true">
            {brand.products.map((product, j) => (
              <li
                key={product.id}
                className={s.prod}
                style={{ "--d": `${380 + j * 90}ms` } as CSSProperties}
              >
                <span className={s.prodImg}>
                  <Image src={product.imageUrl} alt="" fill sizes="96px" className={s.img} />
                </span>
                <span className={s.prodPrice}>{product.price}</span>
              </li>
            ))}
          </ul>
          <div className={s.nameBlock}>
            <h3 className={s.nameMask}>
              <span className={s.name}>{brand.name}</span>
            </h3>
            <span className={s.cta} aria-hidden="true">
              VER MARCA <LoopLine width={40} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const common = {
    className: s.cell,
    style,
    "data-cell": "",
    ...(span && { "data-span": "" }),
  };

  if (!brand.url) return <div {...common}>{content}</div>;
  return (
    <a {...common} href={brand.url} target="_blank" rel="noopener">
      {content}
      <span className="sr-only">{NEW_TAB}</span>
    </a>
  );
}

function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [attempted, setAttempted] = useState(false);
  return (
    <>
      <button
        type="button"
        className={s.retry}
        aria-disabled={pending}
        onClick={() => {
          if (pending) return;
          setAttempted(true);
          startTransition(() => router.refresh());
        }}
      >
        Reintentar <span aria-hidden="true">↻</span>
      </button>
      <span role="status" className="sr-only">
        {pending ? "Cargando las marcas…" : attempted ? "No se han podido cargar las marcas." : ""}
      </span>
    </>
  );
}

/** 05-catalogo: grid irregular con todas las marcas. */
export function CatalogGrid(props: Props) {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);
  const sectionRef = useRef<HTMLElement>(null);
  const hovered = useRef<HTMLElement | null>(null);
  const prevState = useRef(props.state);
  const total = props.state === "ready" ? props.rows.reduce((n, row) => n + row.length, 0) : 1;

  useEffect(() => {
    const el = sectionRef.current;
    return el ? trackSection(el, "catalogo") : undefined;
  }, []);

  // La altura cambia entre estados (p. ej. reintentar con éxito): recalcular triggers.
  // Si se pasa de error a listo, el foco va al título (el botón de reintentar desaparece).
  // biome-ignore lint/correctness/useExhaustiveDependencies: `total` no se lee, pero cambia la altura de la sección y debe recalcular los triggers.
  useEffect(() => {
    scheduleScrollRefresh();
    if (prevState.current === "error" && props.state === "ready") {
      document.getElementById("cat-title")?.focus({ preventScroll: true });
    }
    prevState.current = props.state;
  }, [props.state, total]);

  // Revelado: doble translateY (máscara sin clip-path), una sola vez al 75 % del viewport.
  useGSAP(
    () => {
      const root = sectionRef.current;
      if (!root) return;
      const outers = gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
      const inners = gsap.utils.toArray<HTMLElement>("[data-reveal-inner]", root);

      const tl = gsap.timeline({ paused: true });
      if (reduced) {
        gsap.set(outers, { opacity: 0 });
        tl.to(outers, { opacity: 1, duration: 0.2, ease: EASE.standard });
      } else {
        gsap.set(outers, { yPercent: 100 });
        gsap.set(inners, { yPercent: -100 });
        const reveal = { yPercent: 0, duration: 1.1, ease: EASE.outExpo, stagger: REVEAL_STEP_S };
        tl.to(outers, reveal, REVEAL_BASE_S).to(inners, reveal, REVEAL_BASE_S);
      }

      ScrollTrigger.create({
        trigger: root,
        start: "top 75%",
        end: "max",
        once: true,
        onEnter: () => {
          tl.play();
        },
        // Si la página cambia de altura (secciones de arriba que se miden tarde) y al recalcular
        // ya estamos dentro, se revela igualmente: el disparo «una vez» no se puede perder.
        onRefresh: (self) => {
          if (self.progress > 0) tl.play();
        },
      });

      // Si llega el foco de teclado antes de que termine, se completa al momento.
      const onFocusIn = () => tl.progress(1);
      root.addEventListener("focusin", onFocusIn);
      return () => root.removeEventListener("focusin", onFocusIn);
    },
    { scope: sectionRef, dependencies: [reduced], revertOnUpdate: true },
  );

  // Hover persistente como en el diseño: cambia al entrar en otra celda y solo se quita al
  // salir de la sección (cruzar las líneas de 1px no lo cierra).
  const onMouseOver = (event: MouseEvent<HTMLElement>) => {
    const cell = (event.target as Element).closest<HTMLElement>("[data-cell]");
    if (!cell || cell === hovered.current) return;
    hovered.current?.removeAttribute("data-hover");
    cell.setAttribute("data-hover", "");
    hovered.current = cell;
    event.currentTarget.setAttribute("data-has-hover", "");
  };

  const clearHover = (section: HTMLElement) => {
    hovered.current?.removeAttribute("data-hover");
    hovered.current = null;
    section.removeAttribute("data-has-hover");
  };

  const onMouseLeave = (event: MouseEvent<HTMLElement>) => clearHover(event.currentTarget);

  const skip = (
    <a href={`#${props.nextId}`} className={s.skip}>
      Saltar el catálogo
    </a>
  );

  if (props.state !== "ready") {
    return (
      <section
        ref={sectionRef}
        id="catalogo"
        data-section="CATÁLOGO"
        data-state="empty"
        aria-labelledby="cat-title"
        className={s.section}
      >
        <div className={s.row}>
          <Head>
            <p className={s.message}>
              {props.state === "empty"
                ? "Aún no hay marcas. Vuelve pronto."
                : "No hemos podido cargar las marcas."}
            </p>
            {props.state === "error" && <RetryButton />}
          </Head>
        </div>
      </section>
    );
  }

  const lastK = total - 1;

  return (
    <section
      ref={sectionRef}
      id="catalogo"
      data-section="CATÁLOGO"
      aria-labelledby="cat-title"
      className={s.section}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      // El teclado usa :focus-visible; al entrar el foco se limpia el hover del ratón.
      onFocus={(event) => clearHover(event.currentTarget)}
    >
      {skip}
      {props.rows.map((row) => (
        <div key={row[0]?.k} className={s.row}>
          {row.map((cell) =>
            cell.kind === "head" ? (
              <Head key="head" />
            ) : (
              <BrandCell
                key={cell.brand.id}
                cell={cell}
                span={total % 2 === 1 && cell.k === lastK}
              />
            ),
          )}
        </div>
      ))}
    </section>
  );
}
