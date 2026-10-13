"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import type { PopularBrand } from "@/lib/explora-data";
import { price } from "@/lib/format";
import { clamp01, lerpTo, pad } from "@/lib/motion/math";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write } from "@/lib/motion/write";
import { BrandImage } from "./brand-image";
import styles from "./explora.module.css";

gsap.registerPlugin(useGSAP);

const INTRO_WORDS = ["PO", "PU", "LA", "RES"] as const;

type Props = { popular: readonly PopularBrand[] };

/** «Estilo. etiquetas, sin repetir el estilo. Desde AAAA.» (README §4.2). */
function describe(brand: PopularBrand): string {
  const style = brand.style?.toLowerCase();
  return [
    brand.style && `${brand.style}.`,
    brand.tags
      .filter((tag) => tag.toLowerCase() !== style)
      .slice(0, 3)
      .join(", "),
    brand.foundedYear && `Desde ${brand.foundedYear}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Explora §4.1 y §4.2: intro MARCAS + PO/PU/LA/RES en escalera y Populares. Un único bucle
 * (`gsap.ticker`) suaviza el scroll con lerp 0.14 y escribe transform en los nodos; React solo
 * guarda la marca activa.
 */
export function Explora({ popular }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const total = popular.length;
  const current = popular[index];

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const one = <T extends HTMLElement>(name: string) => {
        const node = el.querySelector<T>(`[data-${name}]`);
        if (!node) throw new Error(`Explora: falta [data-${name}]`);
        return node;
      };
      const intro = one("intro");
      const pop = one("pop");
      const stage = one("pop-stage");
      const words = [...el.querySelectorAll<HTMLElement>("[data-pw]")];
      const nmBase = one("nm-base");
      const nmTop = one("nm-top");
      const imWindow = one("im-window");
      const imTrack = one("im-track");

      window.scrollTo(0, 0);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Geometría: se mide al montar, al cargar la fuente y al cambiar el tamaño ----
        let vh = 0;
        let stageW = 0;
        let winW = 0;
        let introTop = 0;
        let introH = 0;
        let popTop = 0;
        let popH = 1;
        let wordCenters: number[] = [];
        let offsets: number[] = [];
        let dirty = true;
        const measure = () => {
          vh = window.innerHeight;
          const scroll = window.scrollY;
          introTop = intro.getBoundingClientRect().top + scroll;
          introH = intro.offsetHeight;
          popTop = pop.getBoundingClientRect().top + scroll;
          popH = pop.offsetHeight;
          stageW = stage.clientWidth;
          winW = imWindow.clientWidth;
          wordCenters = words.map((word) => {
            const rect = word.getBoundingClientRect();
            return rect.top + scroll + rect.height / 2;
          });
          // `offsetLeft` de cada nombre respecto a la pista (ambos se mueven juntos con el transform).
          const base = nmBase.getBoundingClientRect().left;
          offsets = [...nmBase.querySelectorAll<HTMLElement>("[data-nm]")].map(
            (name) => name.getBoundingClientRect().left - base,
          );
          dirty = true;
        };
        measure();
        window.addEventListener("resize", measure);
        document.fonts.ready.then(measure);

        // ---- Bucle ----
        let s = window.scrollY;
        let shown = 0;
        const frame: Tick = (_time, deltaMs) => {
          const next = lerpTo(s, window.scrollY, deltaMs);
          if (next === s && !dirty) return;
          s = next;
          dirty = false;

          intro.toggleAttribute("data-live", s > introTop - vh && s < introTop + introH);
          pop.toggleAttribute("data-live", s > popTop - vh && s < popTop + popH);

          // Intro: cada palabra se desplaza t²·0.4·vw según su distancia al centro de la pantalla.
          words.forEach((word, i) => {
            const t = Math.max(0, Math.min(1.4, ((wordCenters[i] ?? 0) - s - vh / 2) / (vh / 2)));
            write(word, "transform", `translateX(${(t * t * stageW * 0.4).toFixed(1)}px)`);
          });

          // Populares: interpola entre los `offsetLeft` medidos para que el activo caiga en el 50 %.
          const count = offsets.length;
          if (count === 0) return;
          const t = clamp01((s - popTop) / Math.max(1, popH - vh));
          const p = t * (count - 1);
          const a = Math.floor(p);
          const b = Math.min(count - 1, a + 1);
          const f = p - a;
          const from = offsets[a] ?? 0;
          const off = from + ((offsets[b] ?? from) - from) * f;
          const names = `translateX(${(stageW * 0.5 - off).toFixed(1)}px)`;
          write(nmBase, "transform", names);
          write(nmTop, "transform", names);
          write(imTrack, "transform", `translateX(${(-p * winW).toFixed(1)}px)`);

          const idx = Math.max(0, Math.min(count - 1, Math.round(p)));
          if (idx !== shown) {
            shown = idx;
            setIndex(idx);
          }
        };

        const unsubscribe = subscribe(frame, el);
        return () => {
          unsubscribe();
          window.removeEventListener("resize", measure);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  if (!current) return null;

  return (
    <div ref={root} className={styles.root}>
      <h1 className="sr-only">Explora</h1>

      <section className={styles.intro} data-intro aria-label="Populares">
        <div className={styles.grid} aria-hidden="true">
          <span className={styles.gridV} />
          <span className={styles.gridH} />
        </div>
        <div className={styles.introRow}>
          <div className={styles.introLeft}>
            <div className={styles.introSticky}>
              <span className={styles.introTitle}>MARCAS</span>
              <span className={styles.introSub}>Populares</span>
            </div>
          </div>
          <div className={styles.introWords} aria-hidden="true">
            {INTRO_WORDS.map((word) => (
              <span key={word} className={styles.introWord} data-pw>
                {word}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        className={styles.pop}
        data-pop
        style={{ height: `${total * 100}vh` }}
        aria-label="Marcas populares"
      >
        <div className={styles.stage} data-pop-stage>
          <span className={styles.lineV} aria-hidden="true" />
          <span className={styles.lineH} aria-hidden="true" />

          <div className={styles.names}>
            <div className={styles.namesBase} data-nm-base>
              {popular.map((brand) => (
                <span key={brand.id} className={styles.name} data-nm>
                  {brand.name}
                </span>
              ))}
            </div>
            <div className={styles.namesClip} aria-hidden="true">
              <div className={styles.namesTop} data-nm-top>
                {popular.map((brand) => (
                  <span key={brand.id} className={styles.name}>
                    {brand.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.imWindow} data-im-window>
            <div className={styles.imTrack} data-im-track>
              {popular.map((brand) => (
                <div key={brand.id} className={styles.imTile}>
                  <BrandImage
                    sources={brand.sources}
                    alt={brand.name}
                    width={480}
                    height={900}
                    request={640}
                    className={styles.imImage}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={styles.info}>
            <p className={styles.desc}>{describe(current)}</p>
            {current.url && (
              <a className={styles.brandLink} href={current.url} target="_blank" rel="noopener">
                <span>Ver marca · {current.count} piezas</span>
                <span className={styles.brandLine} aria-hidden="true" />
              </a>
            )}
          </div>

          <ul className={styles.products}>
            {current.products.map((product) => (
              <li key={product.id}>
                <a className={styles.product} href={product.url} target="_blank" rel="noopener">
                  <span className={styles.productPhoto}>
                    <BrandImage
                      sources={product.image ? [product.image] : []}
                      alt=""
                      width={280}
                      height={373}
                      request={320}
                      className={styles.productImage}
                    />
                  </span>
                  <span className={styles.productName}>{product.name}</span>
                  <span className={styles.productPrice}>{price(product.price)}</span>
                </a>
              </li>
            ))}
          </ul>

          <p className={styles.counter} aria-live="polite">
            <span>{current.name}</span>
            <span className={styles.counterNum}>
              <span>{pad(index + 1, 2)}</span>
              <span className={styles.counterBar} aria-hidden="true" />
              <span>{pad(total, 2)}</span>
            </span>
          </p>
        </div>
      </section>

      <ul className={styles.staticList} data-static>
        {popular.map((brand) => (
          <li key={brand.id} className={styles.staticItem}>
            <span className={styles.staticName}>{brand.name}</span>
            <span className={styles.desc}>{describe(brand)}</span>
            {brand.url && (
              <a className={styles.brandLink} href={brand.url} target="_blank" rel="noopener">
                <span>Ver marca · {brand.count} piezas</span>
                <span className={styles.brandLine} aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
