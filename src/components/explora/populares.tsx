"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import { ScrambleText } from "@/components/ui/scramble-text";
import typo from "@/components/ui/type.module.css";
import type { ExploraBrand } from "@/lib/explora-data";
import { isSectionTag } from "@/lib/explora-tags";
import { price } from "@/lib/format";
import { easeInOutQuad, lerpBy, pad } from "@/lib/motion/math";
import { scrollToY } from "@/lib/motion/scroll";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write } from "@/lib/motion/write";
import { BrandActions } from "./brand-actions";
import { BrandImage } from "./brand-image";
import { createCardHover } from "./card-hover";
import { dealCard, dealDuration } from "./carousel-deal";
import { bindCarouselInput } from "./carousel-input";
import { cardTransform, PATH, placeCard, stepIndex } from "./carousel-path";
import { NoStock } from "./no-stock";
import styles from "./populares.module.css";
import { peekProps } from "./product-peek";

gsap.registerPlugin(useGSAP);

/** Fracción del camino hasta la marca elegida que recorre el carrusel por frame (a 60 Hz). */
const CAROUSEL_LERP = 0.075;
/** Artículos de la marca en la ficha (en fila, repartiéndose el ancho). */
const PRODUCTS = 3;
/** Distancia (en fotos) a la que el carrusel se da por quieto para navegar con el hover. */
const STILL = 0.05;
/** Duración (s) del scroll hasta la siguiente sección. */
const LEAVE_S = 1.1;
/** Con la página más abajo de esto, la rueda vuelve a ser scroll. */
const TOP_PX = 2;
/** La entrada en baraja se ve la primera vez que se abre Explora en la sesión. */
const DEAL_SEEN_KEY = "emer:destacados-deal";

/** ¿Toca la entrada en baraja? (y la marca como vista). Sin `sessionStorage`, siempre. */
function takeDeal(): boolean {
  try {
    if (sessionStorage.getItem(DEAL_SEEN_KEY)) return false;
    sessionStorage.setItem(DEAL_SEEN_KEY, "1");
  } catch {
    // Almacenamiento bloqueado (modo privado estricto): se enseña la entrada.
  }
  return true;
}

/** Tags que describen la marca (sin los de sección: destacada, popular…). */
const brandTags = (brand: ExploraBrand) =>
  brand.tags.filter(
    (tag) => tag.toLowerCase() !== brand.style?.toLowerCase() && !isSectionTag(tag),
  );

/** «Estilo. etiquetas, sin repetir el estilo. Desde AAAA.» (README §4.2). */
export function describe(brand: ExploraBrand): string {
  return [
    brand.style && `${brand.style}.`,
    brandTags(brand).slice(0, 3).join(", "),
    brand.foundedYear && `Desde ${brand.foundedYear}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

type Props = { popular: readonly ExploraBrand[] };

/**
 * Destacados: carrusel a pantalla completa (sin título). La rueda, las flechas o un swipe pasan de
 * marca en marca por la diagonal de `carousel-path.ts`; la ficha cambia con scramble. Pasada la
 * última (o con [ BAJAR ]) baja a la siguiente sección. Las fotos se mueven en su propio bucle
 * (no depende del scroll) y React solo guarda la marca activa.
 */
export function Populares({ popular }: Props) {
  const root = useRef<HTMLElement>(null);
  // Se decide una vez por montaje (el ref sobrevive al doble efecto de Strict Mode).
  const deal = useRef<boolean | null>(null);
  const [index, setIndex] = useState(0);
  const total = popular.length;
  const current = popular[index];

  useGSAP(
    () => {
      const section = root.current;
      if (!section) return;
      const cards = [...section.querySelectorAll<HTMLElement>("[data-card]")];
      const down = section.querySelector<HTMLElement>("[data-pop-down]");

      const leave = () => {
        const bottom = section.getBoundingClientRect().bottom + window.scrollY;
        scrollToY(bottom, { duration: LEAVE_S, easing: easeInOutQuad, lock: true });
      };
      down?.addEventListener("click", leave);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let width = window.innerWidth;
        let height = window.innerHeight;
        let cardW = 0;
        let cardH = 0;
        let target = 0;
        let pos = 0;
        let dirty = true;
        let wasMoving = false;
        // Entrada en baraja: hasta que acaba no se puede mover el carrusel (ver `carousel-deal.ts`).
        deal.current ??= total > 0 && takeDeal();
        let dealing = deal.current;
        let dealT0 = -1;
        const dealEnd = dealDuration(total);
        section.dataset.ready = String(!dealing);

        const select = (next: number) => {
          if (next === target) return;
          target = next;
          section.dataset.last = String(next === total - 1);
          dirty = true;
          setIndex(next);
        };
        section.dataset.last = String(total === 1);

        const measure = () => {
          width = section.clientWidth;
          height = section.clientHeight;
          cardW = cards[0]?.offsetWidth ?? 0;
          cardH = cards[0]?.offsetHeight ?? 0;
          dirty = true;
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(section);

        const unbind = bindCarouselInput({
          active: () => window.scrollY < TOP_PX,
          step: (dir) => {
            if (dealing) return;
            if (dir > 0 && target === total - 1) leave();
            else select(stepIndex(target, dir, total));
          },
        });
        // Pulsar una foto que no es la activa la trae al centro.
        const onClick = (event: MouseEvent) => {
          const card = (event.target as Element | null)?.closest<HTMLElement>("[data-card]");
          const i = card && !dealing ? cards.indexOf(card) : -1;
          if (i >= 0) select(i);
        };
        section.addEventListener("click", onClick);
        // Hover: la centrada sigue al cursor; entrar en la anterior o la siguiente navega a ella.
        const hover = createCardHover({
          count: cards.length,
          active: () => target,
          still: () => !dealing && Math.abs(pos - target) < STILL,
          onNeighbour: select,
        });
        const unbindHover = hover.bind(section);

        /** Un frame de la entrada: cada foto entre la baraja y su sitio. */
        const dealFrame = (time: number) => {
          if (dealT0 < 0) dealT0 = time;
          const t = time - dealT0;
          cards.forEach((card, i) => {
            const place = dealCard(i, total, t, width, height);
            write(card, "visibility", place.opacity > 0.001 ? "visible" : "hidden");
            write(card, "transform", cardTransform(place));
            write(card, "opacity", place.opacity.toFixed(3));
            write(card, "z-index", String(place.z));
            write(card, "will-change", "transform, opacity");
          });
          if (t < dealEnd) return;
          dealing = false;
          deal.current = false;
          section.dataset.ready = "true";
          dirty = true;
        };

        const frame: Tick = (time, deltaMs) => {
          if (dealing) {
            dealFrame(time);
            return;
          }
          const next = lerpBy(pos, target, CAROUSEL_LERP, deltaMs);
          const settled = Math.abs(target - next) < 0.001 ? target : next;
          const placed = cards.map((_, i) => {
            const o = i - settled;
            const place = placeCard(o, width, height);
            const shown = place.opacity > 0 && o > PATH.back - PATH.fade - 0.5;
            return { place, shown, width: cardW, height: cardH };
          });
          const hovers = hover.update(placed, deltaMs);
          const moving = settled !== target || hovers.moving;
          // Un frame más al parar, para quitar `will-change`.
          if (settled === pos && !dirty && !moving && !wasMoving) return;
          pos = settled;
          dirty = false;
          wasMoving = moving;
          placed.forEach(({ place, shown }, i) => {
            const card = cards[i];
            if (!card) return;
            write(card, "visibility", shown ? "visible" : "hidden");
            if (!shown) return;
            write(card, "transform", cardTransform(place, hovers.states[i]));
            write(card, "opacity", place.opacity.toFixed(3));
            write(card, "z-index", String(place.z));
            write(card, "will-change", moving ? "transform, opacity" : "auto");
          });
        };
        const unsubscribe = subscribe(frame, section);

        return () => {
          unsubscribe();
          unbind();
          unbindHover();
          observer.disconnect();
          section.removeEventListener("click", onClick);
        };
      });

      return () => {
        mm.revert();
        down?.removeEventListener("click", leave);
      };
    },
    { scope: root },
  );

  if (!current) return null;

  return (
    <section
      ref={root}
      className={styles.pop}
      data-pop
      // Posición en el carrusel (0–1): la lee la línea de avance común de Explora.
      data-progress={total > 1 ? (index / (total - 1)).toFixed(4) : "1"}
      aria-label="Marcas destacadas"
    >
      <div className={styles.stage} data-pop-stage>
        <div className={styles.cards}>
          {popular.map((brand, i) => (
            <button
              key={brand.id}
              type="button"
              className={styles.card}
              data-card
              data-active={i === index}
              data-cursor-logo={brand.logo ?? undefined}
              aria-label={`${brand.name}, marca ${i + 1} de ${total}`}
              aria-current={i === index ? "true" : undefined}
            >
              <span className={styles.photo}>
                <BrandImage
                  sources={brand.portrait}
                  alt=""
                  width={480}
                  height={640}
                  request={720}
                  className={styles.image}
                />
              </span>
            </button>
          ))}
        </div>

        <div className={styles.info}>
          <h2 className={styles.name}>
            <ScrambleText text={current.name} hover={false} />
          </h2>
          <span className={styles.rule} aria-hidden="true" />
          {current.products.length > 0 ? (
            <ul className={styles.products}>
              {current.products.slice(0, PRODUCTS).map((product) => (
                <li key={product.id}>
                  <a
                    className={styles.product}
                    data-scramble-hover
                    {...peekProps(product, current.name)}
                    href={product.url ?? current.url ?? undefined}
                    target="_blank"
                    rel="noopener"
                  >
                    <span className={styles.productPhoto}>
                      <BrandImage
                        sources={product.image ? [product.image] : []}
                        alt=""
                        width={300}
                        height={400}
                        request={480}
                        className={styles.productImage}
                      />
                    </span>
                    <ScrambleText
                      text={product.name ?? ""}
                      className={`${typo.label} ${styles.productName}`}
                    />
                    <ScrambleText
                      text={price(product.price)}
                      className={`${typo.label} ${styles.productPrice}`}
                    />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <NoStock className={styles.noStock} />
          )}
          <span className={styles.rule} aria-hidden="true" />
          <BrandActions brand={current} />
        </div>

        <button
          type="button"
          className={`${typo.label} ${styles.down}`}
          data-pop-down
          data-scramble-hover
          aria-label="Bajar a la siguiente sección"
        >
          <ScrambleText text="Bajar" view={false} />
          <span className={styles.downLine} aria-hidden="true">
            <span className={styles.downTick} />
          </span>
        </button>

        <p className="sr-only" aria-live="polite">
          {current.name} · {pad(index + 1, 2)} / {pad(total, 2)}
        </p>
        <p className={`${typo.label} ${styles.counter}`} aria-hidden="true">
          <ScrambleText text={`A — ${pad(index + 1, 2)}`} view={false} hover={false} />
          <span className={styles.counterBar} />
          <span>{pad(total, 2)}</span>
        </p>
      </div>
    </section>
  );
}
