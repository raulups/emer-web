"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import type { ExploraData } from "@/lib/explora-data";
import { clamp01, easeInOutQuad, lerpTo } from "@/lib/motion/math";
import { getLenis, scrollToY } from "@/lib/motion/scroll";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write } from "@/lib/motion/write";
import { BrandActions } from "./brand-actions";
import { Catalogo } from "./catalogo";
import { Emergentes } from "./emergentes";
import styles from "./explora.module.css";
import { Footer } from "./footer";
import { Novedades } from "./novedades";
import { describe, Populares } from "./populares";
import { SkipButton } from "./skip-button";
import { SuggestBrand } from "./suggest-brand";

gsap.registerPlugin(useGSAP);

const INTRO_WORDS = ["DES", "TA", "CA", "DOS"] as const;

/**
 * Secciones que [ SALTAR ] lleva a su final, en orden de scroll (por posición: 1.ª `Populares`,
 * 2.ª `Novedades`, 3.ª `Emergentes` y 4.ª `Catalogo` como componentes).
 */
const SECTIONS = ["Destacados", "Populares", "Novedades", "Emergentes"] as const;

type Props = { data: ExploraData };

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Explora §4.1–§4.5: intro y cuatro secciones filtradas por tag (`lib/explora-data.ts`). Los
 * componentes conservan el nombre de su posición original: `Populares` pinta Destacados,
 * `Novedades` pinta Populares, `Emergentes` pinta Novedades (con la transición entre estas dos) y
 * `Catalogo` pinta Emergentes. Una sección sin marcas no se pinta. Un único bucle (`gsap.ticker`) suaviza el scroll con lerp 0.14 (`s`) y escribe estilos
 * en los nodos con geometría medida; React solo guarda las marcas activas.
 */
export function Explora({ data }: Props) {
  const { destacados, populares, novedades, emergentes, todas } = data;
  const root = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [near, setNear] = useState(0);
  const [section, setSection] = useState(0);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      // Una sección sin marcas no se pinta: sus nodos se sustituyen por uno suelto (lo que se
      // escribe en él no tiene efecto y mide 0), así el bucle sigue igual para las demás.
      const one = <T extends HTMLElement>(name: string) =>
        el.querySelector<T>(`[data-${name}]`) ??
        (document.createElement("div") as HTMLElement as T);
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
      const skip = one("skip");

      scrollToY(0, { immediate: true });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Geometría: se mide al montar, al cargar la fuente y al cambiar el tamaño ----
        let vh = 0;
        let vw = 0;
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
        // Final de cada sección de SECTIONS (scrollY en el que termina).
        let ends: number[] = [];
        // Controles fijos (switch del Shell, [ SALTAR ]) y su centro en pantalla, para su tono.
        let probes: { node: HTMLElement; x: number; y: number }[] = [];
        let dirty = true;
        const docTop = (node: HTMLElement, scroll: number) =>
          node.getBoundingClientRect().top + scroll;
        const measure = () => {
          vh = window.innerHeight;
          vw = window.innerWidth;
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
          // Populares acaba cuando Novedades llega arriba; Novedades, con la transición completa
          // (q = 1); Emergentes, al soltarse su escena fija; Catálogo, al acabar su pista.
          const last = document.documentElement.scrollHeight - vh;
          const catEnd = pinTop + travel;
          ends = [box.nv[0], spacerTop + spacerH - vh, box.er[0] + box.er[1] - vh, catEnd].reduce<
            number[]
          >((acc, end) => {
            acc.push(Math.min(last, Math.max(end, acc.at(-1) ?? 0)));
            return acc;
          }, []);
          probes = [...document.querySelectorAll<HTMLElement>("[data-tone-probe]")].map((node) => {
            const rect = node.getBoundingClientRect();
            return { node, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
          });
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
        let shownSection = 0;
        let target: number | undefined;

        // ---- [ SALTAR ]: scroll animado hasta el final de la sección actual ----
        let tween: gsap.core.Tween | null = null;
        const stop = () => {
          tween?.kill();
          tween = null;
        };
        const jump = () => {
          if (target === undefined) return;
          stop();
          const from = window.scrollY;
          const duration = Math.min(2.2, 0.6 + (0.12 * Math.abs(target - from)) / Math.max(1, vh));
          // Con Lenis, el salto es suyo (la rueda del usuario lo interrumpe sola).
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(target, { duration, easing: easeInOutQuad, force: true });
            return;
          }
          const proxy = { y: from };
          tween = gsap.to(proxy, {
            y: target,
            duration,
            ease: "power2.inOut",
            onUpdate: () => window.scrollTo(0, proxy.y),
            onComplete: () => {
              tween = null;
            },
          });
        };
        skip.addEventListener("click", jump);
        // Si el usuario toma el control a mitad del salto, se lo devolvemos.
        const takeOver = ["wheel", "touchstart", "keydown"] as const;
        for (const type of takeOver) window.addEventListener(type, stop, { passive: true });

        // ---- Tono: ¿el punto (x, y) de la pantalla está sobre el negro de Novedades? ----
        const darkAt = (x: number, y: number, on: boolean, q: number, angle: number) => {
          const top = box.nv[0] - s;
          if (y < top || y >= top + box.nv[1]) return false;
          if (!on || q <= 0) return true;
          if (q >= 1) return false;
          // La máscara conic deja ver Emergentes en [0, angle) y [180, 180 + angle).
          const p = (Math.atan2(x - vw / 2, vh / 2 - y) * 180) / Math.PI;
          const deg = p < 0 ? p + 360 : p;
          return !(deg < angle || (deg >= 180 && deg < 180 + angle));
        };
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

          // Tono de cada control fijo según lo que tiene justo debajo de su centro.
          for (const { node, x, y } of probes) {
            const tone = darkAt(x, y, on, q, angle) ? "dark" : "light";
            if (node.dataset.tone !== tone) node.dataset.tone = tone;
          }

          // [ SALTAR ]: la primera sección cuyo final aún queda por delante (scroll real).
          const y = window.scrollY;
          const current = ends.findIndex((end) => end - y > 2);
          target = ends[current];
          skip.toggleAttribute("data-on", current >= 0);
          if (current >= 0 && current !== shownSection) {
            shownSection = current;
            setSection(current);
          }

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
          stop();
          skip.removeEventListener("click", jump);
          for (const type of takeOver) window.removeEventListener(type, stop);
          for (const { node } of probes) delete node.dataset.tone;
          observer.disconnect();
          window.removeEventListener("resize", measure);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  if (destacados.length + populares.length + novedades.length + emergentes.length === 0)
    return null;

  return (
    <div ref={root} className={styles.root}>
      <h1 className="sr-only">Explora</h1>

      {destacados.length > 0 && (
        <section className={styles.intro} data-intro aria-label="Destacados">
          <div className={styles.grid} aria-hidden="true">
            <span className={styles.gridV} />
            <span className={styles.gridH} />
          </div>
          <div className={styles.introRow}>
            <div className={styles.introLeft}>
              <div className={styles.introSticky}>
                <span className={styles.introTitle}>MARCAS</span>
                <span className={styles.introSub}>Destacados</span>
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
      )}

      {destacados.length > 0 && <Populares popular={destacados} index={index} />}
      {populares.length > 0 && <Novedades newest={populares} />}
      {novedades.length > 0 && <Emergentes brands={novedades} near={near} />}
      {emergentes.length > 0 && <Catalogo brands={emergentes} />}
      <SkipButton section={SECTIONS[section] ?? SECTIONS[0]} />

      {destacados.length > 0 && (
        <ul className={styles.staticList} data-static aria-label="Destacados">
          {destacados.map((brand) => (
            <li key={brand.id} className={styles.staticItem}>
              <span className={styles.staticName}>{brand.name}</span>
              <span className={styles.desc}>{describe(brand)}</span>
              <BrandActions brand={brand} />
            </li>
          ))}
        </ul>
      )}
      {novedades.length > 0 && (
        <ul className={styles.staticList} data-static-emergent aria-label="Novedades">
          {novedades.map((brand) => (
            <li key={brand.id} className={styles.staticItem}>
              <span className={styles.staticName}>{brand.name}</span>
              <span className={styles.desc}>
                Desde {brand.foundedYear ?? "—"} · {brand.count} piezas
              </span>
            </li>
          ))}
        </ul>
      )}
      {/* Tras Emergentes en pantalla: las listas de arriba solo se ven con «reducir movimiento». */}
      <SuggestBrand brands={todas} />
      <Footer />
    </div>
  );
}
