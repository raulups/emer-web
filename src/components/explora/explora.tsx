"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import type { ExploraData } from "@/lib/explora-data";
import { clamp01, lerpTo } from "@/lib/motion/math";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write } from "@/lib/motion/write";
import { Catalogo } from "./catalogo";
import { Emergentes } from "./emergentes";
import styles from "./explora.module.css";
import { Novedades } from "./novedades";
import { describe, Populares } from "./populares";

gsap.registerPlugin(useGSAP);

const INTRO_WORDS = ["PO", "PU", "LA", "RES"] as const;

type Props = { data: ExploraData };

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Explora §4.1–§4.5: intro, Populares, Novedades, Emergentes (con la transición entre las dos
 * últimas) y Catálogo. Un único bucle (`gsap.ticker`) suaviza el scroll con lerp 0.14 (`s`) y escribe estilos
 * en los nodos con geometría medida; React solo guarda las marcas activas.
 */
export function Explora({ data }: Props) {
  const { popular, newest, emergent } = data;
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [near, setNear] = useState(0);

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
      const nv = one("nv");
      const rows = [...el.querySelectorAll<HTMLElement>("[data-nv-row]")];
      const stk = one("stk");
      const sw = one("sw");
      const sl = one("sl");
      const slLine = one("sl-line");
      const spacer = one("sp");
      const er = one("er");
      const ediv = one("ediv");
      const car = one("er-car");
      const colA = one("er-a");
      const colB = one("er-b");
      const erInfo = one("er-info");
      const cat = one("cat");
      const lead = one("cat-lead");
      const catLine = one("cat-line");
      const pin = one("cat-pin");
      const track = one("cat-track");
      const catH = one("cat-h");
      const catTexts = [...el.querySelectorAll<HTMLElement>("[data-cat-t]")];
      const catCols = [...el.querySelectorAll<HTMLElement>("[data-cat-g]")];

      window.scrollTo(0, 0);

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Geometría: se mide al montar, al cargar la fuente y al cambiar el tamaño ----
        let vh = 0;
        let stageW = 0;
        let winW = 0;
        const box = { intro: [0, 0], pop: [0, 1], nv: [0, 0], er: [0, 1] } as Record<
          "intro" | "pop" | "nv" | "er",
          [number, number]
        >;
        let spacerTop = 0;
        let spacerH = 1;
        let rowCenters: number[] = [];
        let wordCenters: number[] = [];
        let offsets: number[] = [];
        let tile = 1;
        let leadTop = 0;
        let leadH = 1;
        let pinTop = 0;
        let travel = 0;
        let dirty = true;
        const docTop = (node: HTMLElement, scroll: number) =>
          node.getBoundingClientRect().top + scroll;
        const measure = () => {
          vh = window.innerHeight;
          // Recorrido horizontal medido: la sección fija mide vh + lo que se desplaza la pista.
          travel = Math.max(0, track.scrollWidth - pin.clientWidth);
          const pinHeight = `${Math.round(vh + travel)}px`;
          if (pin.style.height !== pinHeight) pin.style.height = pinHeight;
          const scroll = window.scrollY;
          box.intro = [docTop(intro, scroll), intro.offsetHeight];
          box.pop = [docTop(pop, scroll), pop.offsetHeight];
          box.nv = [docTop(nv, scroll), nv.offsetHeight];
          box.er = [docTop(er, scroll), er.offsetHeight];
          leadTop = docTop(lead, scroll);
          leadH = lead.offsetHeight;
          pinTop = docTop(pin, scroll);
          spacerTop = docTop(spacer, scroll);
          spacerH = spacer.offsetHeight;
          stageW = stage.clientWidth;
          winW = imWindow.clientWidth;
          const center = (node: HTMLElement) => {
            const rect = node.getBoundingClientRect();
            return rect.top + scroll + rect.height / 2;
          };
          wordCenters = words.map(center);
          rowCenters = rows.map(center);
          tile =
            colA.firstElementChild instanceof HTMLElement
              ? colA.firstElementChild.offsetHeight
              : vh;
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
        const observer = new ResizeObserver(measure);
        observer.observe(el);

        // ---- Bucle ----
        let s = window.scrollY;
        let shownIndex = 0;
        let shownNear = 0;
        const live = (node: HTMLElement, from: number, height: number) =>
          node.toggleAttribute("data-live", s > from - vh && s < from + height);

        const frame: Tick = (_time, deltaMs) => {
          const next = lerpTo(s, window.scrollY, deltaMs);
          if (next === s && !dirty) return;
          s = next;
          dirty = false;

          live(intro, box.intro[0], box.intro[1]);
          live(pop, box.pop[0], box.pop[1]);
          live(nv, box.nv[0], box.nv[1]);
          live(er, box.er[0] + vh, box.er[1]);
          live(cat, leadTop - vh, leadH + pin.offsetHeight + vh);

          // §4.1 Intro: cada palabra se desplaza t²·0.4·vw según su distancia al centro.
          words.forEach((word, i) => {
            const t = Math.max(0, Math.min(1.4, ((wordCenters[i] ?? 0) - s - vh / 2) / (vh / 2)));
            write(word, "transform", `translateX(${(t * t * stageW * 0.4).toFixed(1)}px)`);
          });

          // §4.2 Populares: interpola entre los `offsetLeft` medidos (activo en la línea del 50 %).
          const count = offsets.length;
          if (count > 0) {
            const t = clamp01((s - box.pop[0]) / Math.max(1, box.pop[1] - vh));
            const p = t * (count - 1);
            const a = Math.floor(p);
            const b = Math.min(count - 1, a + 1);
            const from = offsets[a] ?? 0;
            const off = from + ((offsets[b] ?? from) - from) * (p - a);
            const names = `translateX(${(stageW * 0.5 - off).toFixed(1)}px)`;
            write(nmBase, "transform", names);
            write(nmTop, "transform", names);
            write(imTrack, "transform", `translateX(${(-p * winW).toFixed(1)}px)`);
            const idx = Math.max(0, Math.min(count - 1, Math.round(p)));
            if (idx !== shownIndex) {
              shownIndex = idx;
              setIndex(idx);
            }
          }

          // §4.3 Novedades: entrada al llegar al 75 % y opacidad de cada fila según su distancia.
          nv.toggleAttribute("data-in", box.nv[0] - s < vh * 0.75);
          rows.forEach((row, i) => {
            const d = Math.abs((rowCenters[i] ?? 0) - s - vh / 2) / (vh / 2);
            write(row, "opacity", Math.max(0.22, 1 - d * 0.85).toFixed(3));
          });

          // Transición: con q = −spacerTop / (spacerH − vh) la línea gira q·180° y la máscara
          // conic-gradient deja ver Emergentes (ya fija debajo) por el lado que barre.
          const spacerScreen = spacerTop - s;
          const on = spacerScreen <= 0;
          const q = clamp01(-spacerScreen / Math.max(1, spacerH - vh));
          const angle = q * 180;
          const mask =
            on && q > 0
              ? `conic-gradient(from 0deg at 50% 50%, transparent 0deg ${angle}deg, #000 ${angle}deg 180deg, transparent 180deg ${180 + angle}deg, #000 ${180 + angle}deg)`
              : "none";
          write(sw, "display", on ? "block" : "none");
          write(stk, "-webkit-mask-image", mask);
          write(stk, "mask-image", mask);
          write(stk, "visibility", q >= 1 ? "hidden" : "visible");
          write(sl, "visibility", on && q < 1 ? "visible" : "hidden");
          write(slLine, "transform", `rotate(${angle.toFixed(2)}deg)`);
          write(er, "visibility", on ? "visible" : "hidden");
          write(ediv, "opacity", q >= 1 ? "1" : "0");

          // §4.4 Emergentes: el carrusel y la info entran con el scroll (fade + translate).
          const erScreen = box.er[0] - s;
          const k = clamp01(-erScreen / (vh * 0.45));
          const ke = easeOutCubic(k);
          write(car, "opacity", ke.toFixed(3));
          write(car, "transform", `translateY(${((1 - ke) * 6).toFixed(2)}vh)`);
          const e2 = easeOutCubic(clamp01((k - 0.25) / 0.75));
          write(erInfo, "opacity", e2.toFixed(3));
          write(erInfo, "transform", `translateY(${((1 - e2) * 18).toFixed(1)}px)`);

          // Carrusel: A baja y B sube (modo «Inverso»); al final las filas quedan alineadas.
          const t = clamp01(-erScreen / Math.max(1, box.er[1] - vh));
          const rowsA = colA.children.length;
          const fit = Math.ceil(vh / Math.max(1, tile));
          const travel = Math.max(0, Math.min(rowsA, colB.children.length) - fit) * tile;
          const yA = -travel * (1 - t);
          const yB = -travel * t;
          write(colA, "transform", `translateY(${yA.toFixed(1)}px)`);
          write(colB, "transform", `translateY(${yB.toFixed(1)}px)`);
          const nearest = Math.max(
            0,
            Math.min(rowsA - 1, Math.round((vh / 2 - tile / 2 - yA) / Math.max(1, tile))),
          );
          if (nearest !== shownNear) {
            shownNear = nearest;
            setNear(nearest);
          }

          // §4.5 Catálogo: la línea baja, el título y las columnas aparecen y la pista se desplaza.
          write(
            catLine,
            "transform",
            `scaleY(${clamp01((vh - (leadTop - s)) / Math.max(1, leadH)).toFixed(4)})`,
          );
          const pinScreen = pinTop - s;
          const kc = clamp01(1 - pinScreen / vh);
          write(catH, "transform", `scaleX(${easeOutCubic(clamp01((kc - 0.4) / 0.6)).toFixed(4)})`);
          catTexts.forEach((node, i) => {
            const e = easeOutCubic(clamp01((kc - 0.55 - i * 0.08) / 0.35));
            write(node, "opacity", e.toFixed(3));
            write(node, "transform", `translateY(${((1 - e) * 14).toFixed(1)}px)`);
          });
          catCols.forEach((node, i) => {
            write(
              node,
              "opacity",
              easeOutCubic(clamp01((kc - 0.5 - Math.min(i, 3) * 0.08) / 0.4)).toFixed(3),
            );
          });
          const along = travel > 0 ? clamp01(-pinScreen / travel) : 0;
          write(track, "transform", `translateX(${(-along * travel).toFixed(1)}px)`);
        };

        const unsubscribe = subscribe(frame, el);
        return () => {
          unsubscribe();
          observer.disconnect();
          window.removeEventListener("resize", measure);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  if (popular.length === 0 || newest.length === 0 || emergent.length === 0) return null;

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

      <Populares popular={popular} index={index} />
      <Novedades newest={newest} />
      <Emergentes brands={emergent} near={near} />
      <Catalogo brands={emergent} />

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
      <ul className={styles.staticList} data-static-emergent aria-label="Emergentes">
        {emergent.map((brand) => (
          <li key={brand.id} className={styles.staticItem}>
            <span className={styles.staticName}>{brand.name}</span>
            <span className={styles.desc}>
              Desde {brand.foundedYear ?? "—"} · {brand.count} piezas
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
