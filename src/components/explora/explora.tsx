"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState } from "react";
import { bus } from "@/lib/bus";
import type { ExploraData } from "@/lib/explora-data";
import { clamp01, easeInOutCubic, easeInOutQuad } from "@/lib/motion/math";
import { followScroll, getLenis, scrollToY } from "@/lib/motion/scroll";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write, writeText } from "@/lib/motion/write";
import { BrandActions } from "./brand-actions";
import { Catalogo } from "./catalogo";
import { Emergentes, ER_HOLD_VH } from "./emergentes";
import styles from "./explora.module.css";
import { Footer } from "./footer";
import { Novedades } from "./novedades";
import { describe, Populares } from "./populares";
import { type IndexItem, SectionIndex } from "./section-index";
import { SkipButton } from "./skip-button";
import { SuggestBrand } from "./suggest-brand";

gsap.registerPlugin(useGSAP);

const INTRO_WORDS = ["DES", "TA", "CA", "DOS"] as const;
const INTRO_TEXT = INTRO_WORDS.join("");

/**
 * Intro automática (s desde que se monta Explora). Es la escalera de la intro original, invertida:
 * la columna DES / TA / CA / DOS baja desde arriba y cada sílaba se desplaza a la derecha t²·0.4·vw
 * según lo que le falta para el centro, así que se alinean al llegar (DES a la altura de MARCAS).
 * Después pasan a una fila (DESTACADOS, al tamaño de los nombres y en el sitio de la primera marca)
 * mientras MARCAS sube, la palabra se «desordena» hasta el nombre de la primera marca y se descubre
 * Destacados. Cualquier rueda, tecla o clic la termina.
 */
const INTRO = {
  /** Bajada de la columna. */
  fallS: 1.6,
  /** De columna a fila (y MARCAS arriba). */
  formAt: 1.75,
  formS: 0.9,
  /** Scramble: empieza, retardo por letra y lo que tarda cada letra en fijarse. */
  scrambleAt: 2.7,
  scrambleStagger: 0.06,
  scrambleS: 0.45,
  /** Cada cuánto cambia el carácter aleatorio (s). */
  scrambleTick: 0.05,
  /** Pausa con el nombre ya fijo antes de descubrir la escena. */
  holdS: 0.3,
} as const;
const SCRAMBLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/";

/**
 * Secciones que [ SALTAR ] lleva a su final, en orden de scroll (por posición: 1.ª `Populares`,
 * 2.ª `Novedades`, 3.ª `Emergentes` y 4.ª `Catalogo` como componentes).
 */
const SECTIONS = ["Destacados", "Populares", "Novedades", "Emergentes"] as const;

type Props = { data: ExploraData };

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Destacados: entre dos marcas el paso va con curva para que cada una «asiente» en la línea del
 * 50 %, mezclado con el avance lineal para que el recorrido nunca llegue a pararse.
 */
const settle = (t: number) => t * 0.45 + easeInOutCubic(t) * 0.55;

/** Duración (s) de un salto animado según la distancia (en pantallas). */
const jumpDuration = (distance: number, vh: number) =>
  Math.min(2.2, 0.6 + (0.12 * Math.abs(distance)) / Math.max(1, vh));

/**
 * Explora §4.1–§4.5: intro y cuatro secciones filtradas por tag (`lib/explora-data.ts`). Los
 * componentes conservan el nombre de su posición original: `Populares` pinta Destacados,
 * `Novedades` pinta Populares, `Emergentes` pinta Novedades (con la transición entre estas dos) y
 * `Catalogo` pinta Emergentes. Una sección sin marcas no se pinta. Un único bucle (`gsap.ticker`)
 * sigue el scroll (`followScroll`) y escribe estilos en los nodos con geometría medida; React solo
 * guarda las marcas activas.
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
      const dest = one("dest");
      const introName = one("intro-name");
      const marcasLayer = one("marcas-layer");
      const marcas = one("marcas");
      const marcasSub = one("marcas-sub");
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
      const nvRight = one("nv-right");
      const nvEnd = one("nv-end");
      const spacer = one("sp");
      const er = one("er");
      const erStage = one("er-stage");
      const ediv = one("ediv");
      const car = one("er-car");
      const colA = one("er-a");
      const colB = one("er-b");
      const erInfo = one("er-info");
      const cat = one("cat");
      const pin = one("cat-pin");
      const track = one("cat-track");
      const catH = one("cat-h");
      const catTexts = [...el.querySelectorAll<HTMLElement>("[data-cat-t]")];
      const catCols = [...el.querySelectorAll<HTMLElement>("[data-cat-g]")];
      const skip = one("skip");
      const index = one("index");
      const goButtons = [...el.querySelectorAll<HTMLElement>("[data-go]")];
      const suggest = el.querySelector<HTMLElement>("#sugerir-marca") ?? one("none");

      scrollToY(0, { immediate: true });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Geometría: se mide al montar, al cargar la fuente y al cambiar el tamaño ----
        let vh = 0;
        let stageW = 0;
        let winW = 0;
        const box = { pop: [0, 1], nv: [0, 0], er: [0, 1] } as Record<
          "pop" | "nv" | "er",
          [number, number]
        >;
        let spacerTop = 0;
        let spacerH = 1;
        let rowCenters: number[] = [];
        // Intro: sílabas (alto y ancho de cada una) y sitio y escala de la primera marca.
        let wordH = 1;
        let wordW: number[] = [];
        let wordGap = 0;
        let wordDy = 0;
        let colX = 0;
        let nameK = 1;
        let nameX = 0;
        let nameY = 0;
        let offsets: number[] = [];
        let tile = 1;
        let pinTop = 0;
        let travel = 0;
        let hold = 0;
        // MARCAS: alto, hueco de arriba y escala con la que se queda sobre los nombres.
        let marcasH = 1;
        let marcasTop = 0;
        let marcasScale = 1;
        // Final de cada sección de SECTIONS (scrollY en el que termina).
        let ends: number[] = [];
        // Inicio de cada sección del índice (scrollY), por id.
        let starts: Record<string, number> = {};
        let dirty = true;
        const docTop = (node: HTMLElement, scroll: number) =>
          node.getBoundingClientRect().top + scroll;
        const measure = () => {
          vh = window.innerHeight;
          hold = (vh * ER_HOLD_VH) / 100;
          // Recorrido horizontal medido: la sección fija mide 2·vh (fundido + pantalla) + lo que se
          // desplaza la pista.
          travel = Math.max(0, track.scrollWidth - pin.clientWidth);
          const pinHeight = `${Math.round(vh + hold + travel)}px`;
          if (pin.style.height !== pinHeight) pin.style.height = pinHeight;
          const scroll = window.scrollY;
          // Populares: la transición empieza en cuanto la última marca está entera en pantalla (el
          // spacer sube hasta 100vh), pero nunca antes de que la sección lleve 60vh arriba.
          const nvTop = docTop(nv, scroll);
          const listEnd = docTop(nvEnd, scroll) + nvEnd.offsetHeight;
          const pull = Math.round(Math.max(0, Math.min(vh, listEnd - nvTop - vh * 0.6)));
          const pullMargin = pull > 0 ? `${-pull}px` : "";
          if (spacer.style.marginTop !== pullMargin) spacer.style.marginTop = pullMargin;
          box.pop = [docTop(pop, scroll), pop.offsetHeight];
          box.nv = [docTop(nv, scroll), nv.offsetHeight];
          box.er = [docTop(er, scroll), er.offsetHeight];
          pinTop = docTop(pin, scroll);
          spacerTop = docTop(spacer, scroll);
          spacerH = spacer.offsetHeight;
          stageW = stage.clientWidth;
          winW = imWindow.clientWidth;
          const center = (node: HTMLElement) => {
            const rect = node.getBoundingClientRect();
            return rect.top + scroll + rect.height / 2;
          };
          rowCenters = rows.map(center);
          marcasH = marcas.offsetHeight;
          marcasTop = Math.max(84, vh * 0.09);
          // Hueco entre el borde de arriba y los nombres de Destacados (con la escena fija).
          const namesTop = docTop(nmBase, scroll) - docTop(stage, scroll);
          marcasScale = Math.min(
            0.62,
            Math.max(0.3, (namesTop - marcasTop - vh * 0.04) / Math.max(1, marcasH)),
          );
          tile =
            colA.firstElementChild instanceof HTMLElement
              ? colA.firstElementChild.offsetHeight
              : vh;
          // `offsetLeft` de cada nombre respecto a la pista (ambos se mueven juntos con el transform).
          const base = nmBase.getBoundingClientRect().left;
          const nameNodes = [...nmBase.querySelectorAll<HTMLElement>("[data-nm]")];
          offsets = nameNodes.map((name) => name.getBoundingClientRect().left - base);
          // Intro: la palabra acaba donde está la primera marca con la escena arriba (borde
          // izquierdo en la línea del 50 %) y con el tamaño de los nombres.
          const layer = marcasLayer.getBoundingClientRect();
          const fontPx = (node: HTMLElement | undefined) =>
            node ? Number.parseFloat(getComputedStyle(node).fontSize) || 1 : 1;
          wordH = words[0]?.offsetHeight || 1;
          wordGap = fontPx(words[0]) * 0.12;
          wordW = words.map((word) => word.offsetWidth);
          nameK = fontPx(introName) / fontPx(words[0]);
          const first = nameNodes[0]?.getBoundingClientRect();
          colX = stage.getBoundingClientRect().left - layer.left + stageW * 0.5;
          nameX = colX;
          // Las sílabas tienen el interlineado de los títulos y el nombre el de los nombres: se
          // centran en su línea para que la letra caiga en el mismo sitio.
          nameY = (first?.top ?? 0) - layer.top;
          wordDy = (introName.offsetHeight - wordH * nameK) / 2;
          colX += window.innerWidth * 0.01;
          // Destacados acaba cuando Populares llega arriba; Populares, con la transición completa
          // (q = 1); Novedades, al acabar el fundido a Emergentes; Emergentes, al acabar su pista.
          const last = document.documentElement.scrollHeight - vh;
          const shown = pinTop + hold;
          ends = [box.nv[0], spacerTop + spacerH - vh, shown, shown + travel].reduce<number[]>(
            (acc, end) => {
              acc.push(Math.min(last, Math.max(end, acc.at(-1) ?? 0)));
              return acc;
            },
            [],
          );
          starts = {
            destacados: box.pop[0],
            populares: box.nv[0],
            novedades: spacerTop + spacerH - vh,
            emergentes: shown,
            sugerir: docTop(suggest, scroll),
          };
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
        const goTo = (to: number) => {
          stop();
          const from = window.scrollY;
          const duration = jumpDuration(to - from, vh);
          // Con Lenis, el salto es suyo (la rueda del usuario lo interrumpe sola).
          const lenis = getLenis();
          if (lenis) {
            lenis.scrollTo(to, { duration, easing: easeInOutQuad, force: true });
            return;
          }
          const proxy = { y: from };
          tween = gsap.to(proxy, {
            y: to,
            duration,
            ease: "power2.inOut",
            onUpdate: () => window.scrollTo(0, proxy.y),
            onComplete: () => {
              tween = null;
            },
          });
        };
        const jump = () => {
          if (target !== undefined) goTo(target);
        };
        skip.addEventListener("click", jump);
        // Índice: Sugerir marca baja hasta su formulario (lo resuelve la propia sección).
        const go = (event: MouseEvent) => {
          const id = (event.target as Element | null)?.closest<HTMLElement>("[data-go]")?.dataset
            .go;
          if (!id) return;
          if (id === "sugerir") bus.emit("suggest:open", null);
          else if (starts[id] !== undefined) goTo(starts[id]);
        };
        index.addEventListener("click", go);
        // Si el usuario toma el control a mitad del salto, se lo devolvemos.
        const takeOver = ["wheel", "touchstart", "keydown"] as const;
        for (const type of takeOver) window.addEventListener(type, stop, { passive: true });

        const live = (node: HTMLElement, from: number, height: number) =>
          node.toggleAttribute("data-live", s > from - vh && s < from + height);

        // ---- Intro automática (ver INTRO) ----
        const brandName = el.querySelector("[data-nm-base] [data-nm]")?.textContent ?? "";
        let introOn = words.length > 0 && brandName !== "";
        let introT0 = -1;
        let introSkip = false;
        // MARCAS: 0 = centrada (al empezar la intro), 1 = arriba, sobre los nombres.
        let marcasM = introOn ? 0 : 1;
        const endIntro = () => {
          if (!introOn) return;
          introOn = false;
          marcasM = 1;
          for (const word of words) write(word, "opacity", "0");
          writeText(introName, brandName);
          dest.removeAttribute("data-intro-on");
          write(introName, "opacity", "0");
          dirty = true;
        };
        const skipIntro = () => {
          introSkip = true;
        };
        const introInputs = ["wheel", "keydown", "pointerdown", "touchstart"] as const;
        if (introOn) {
          // Sin `lockScroll`: Lenis parado pone `overflow: clip` en <html>, quita la barra de scroll
          // y al volver desplaza el carrusel. Toda rueda, tecla o toque acaba la intro, y mientras
          // dura el scroll se devuelve a 0.
          dest.setAttribute("data-intro-on", "");
          writeText(introName, INTRO_TEXT);
          for (const type of introInputs) {
            window.addEventListener(type, skipIntro, { passive: true });
          }
        }
        const scrambleLength = Math.max(INTRO_TEXT.length, brandName.length);
        /** Texto del scramble a los `t` s de empezar: cada letra se fija en orden. */
        const scrambled = (t: number) => {
          const tick = Math.floor(t / INTRO.scrambleTick);
          let out = "";
          for (let i = 0; i < scrambleLength; i++) {
            const from = i * INTRO.scrambleStagger;
            const to = brandName[i];
            if (t < from) out += INTRO_TEXT[i] ?? "";
            else if (t >= from + INTRO.scrambleS) out += to ?? "";
            else if (to === " ") out += " ";
            else {
              // Pseudoaleatorio estable por letra y tick (no cambia en cada frame).
              const pick = Math.abs(Math.sin((i + 1) * 12.9898 + tick * 78.233)) * 43758.5453;
              out += SCRAMBLE_CHARS[Math.floor(pick % SCRAMBLE_CHARS.length)] ?? "";
            }
          }
          return out;
        };
        const introEnd =
          INTRO.scrambleAt + scrambleLength * INTRO.scrambleStagger + INTRO.scrambleS + INTRO.holdS;
        const introFrame = (time: number) => {
          if (introT0 < 0) introT0 = time;
          if (window.scrollY !== 0) scrollToY(0, { immediate: true });
          const t = time - introT0;
          if (introSkip || t >= introEnd) {
            endIntro();
            return;
          }
          dirty = true;
          const form = easeInOutCubic(clamp01((t - INTRO.formAt) / INTRO.formS));
          marcasM = form;
          // Columna en la mitad derecha: baja desde fuera de pantalla hasta que DES queda a la altura
          // de MARCAS (centrada). Por encima del centro, cada sílaba va desplazada t²·0.4·vw.
          const colH = words.length * wordH + (words.length - 1) * wordGap;
          const colTop = (vh - wordH) / 2;
          const fall = easeOutCubic(clamp01(t / INTRO.fallS));
          const drop = (1 - fall) * (colTop + colH);
          const scrambling = t >= INTRO.scrambleAt;
          let rowX = 0;
          words.forEach((word, i) => {
            const yCol = colTop + i * (wordH + wordGap) - drop;
            const k = Math.max(0, Math.min(1.4, (vh / 2 - (yCol + wordH / 2)) / (vh / 2)));
            const xCol = colX + k * k * stageW * 0.4;
            const x = xCol + (nameX + rowX * nameK - xCol) * form;
            const y = yCol + (nameY + wordDy - yCol) * form;
            const scale = 1 + (nameK - 1) * form;
            rowX += wordW[i] ?? 0;
            write(
              word,
              "transform",
              `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${scale.toFixed(4)})`,
            );
            write(word, "opacity", scrambling ? "0" : "1");
          });
          // Ya en fila, la palabra entera (con el estilo de los nombres) toma el relevo y se desordena.
          write(introName, "transform", `translate(${nameX.toFixed(1)}px,${nameY.toFixed(1)}px)`);
          write(introName, "opacity", scrambling ? "1" : "0");
          if (scrambling) writeText(introName, scrambled(t - INTRO.scrambleAt));
        };

        const frame: Tick = (time, deltaMs) => {
          if (introOn) introFrame(time);
          const next = followScroll(s, deltaMs);
          if (next === s && !dirty) return;
          s = next;
          dirty = false;

          live(pop, box.pop[0], box.pop[1]);
          live(nv, box.nv[0], box.nv[1]);
          live(er, box.er[0] + vh, box.er[1]);
          live(cat, pinTop, pin.offsetHeight);

          // MARCAS: centrada al empezar la intro; sube mientras DESTACADOS pasa a fila y se queda
          // arriba, más pequeña, sobre los nombres.
          const m = marcasM;
          const mScale = 1 + (marcasScale - 1) * m;
          const mY = (vh - marcasH) / 2 + (marcasTop - (vh - marcasH) / 2) * m;
          write(marcas, "transform", `translateY(${mY.toFixed(1)}px) scale(${mScale.toFixed(4)})`);
          write(
            marcasSub,
            "transform",
            `translateY(${(mY + marcasH * mScale + 18 - 6 * m).toFixed(1)}px)`,
          );

          // §4.2 Populares: interpola entre los `offsetLeft` medidos (activo en la línea del 50 %).
          const count = offsets.length;
          if (count > 0) {
            const t = clamp01((s - box.pop[0]) / Math.max(1, box.pop[1] - vh));
            const p = t * (count - 1);
            const a = Math.min(count - 1, Math.floor(p));
            const b = Math.min(count - 1, a + 1);
            const f = settle(p - a);
            const from = offsets[a] ?? 0;
            const off = from + ((offsets[b] ?? from) - from) * f;
            const names = `translateX(${(stageW * 0.5 - off).toFixed(1)}px)`;
            write(nmBase, "transform", names);
            write(nmTop, "transform", names);
            write(imTrack, "transform", `translateX(${(-(a + f) * winW).toFixed(1)}px)`);
            const idx = Math.max(0, Math.min(count - 1, Math.round(p)));
            if (idx !== shownIndex) {
              shownIndex = idx;
              setIndex(idx);
            }
          }

          // Salida de Destacados: mientras el negro sube por encima, la escena se queda atrás (va a
          // un 45 % de la velocidad del scroll) y se apaga un poco, sin corte seco.
          const out = clamp01((s - (box.nv[0] - vh)) / Math.max(1, vh));
          write(
            stage,
            "transform",
            out > 0 ? `translateY(${(out * vh * 0.55).toFixed(1)}px)` : "none",
          );
          write(stage, "opacity", (1 - out * 0.5).toFixed(3));
          // La capa de MARCAS (sticky con margin-bottom negativo) se suelta una pantalla más tarde
          // que la escena: aquí se le aplica el mismo movimiento neto (sube al 45 %).
          write(
            marcasLayer,
            "transform",
            out > 0 ? `translateY(${(-out * vh * 0.45).toFixed(1)}px)` : "none",
          );
          write(marcasLayer, "opacity", (1 - out * 0.5).toFixed(3));

          // §4.3 Novedades: entrada al llegar al 75 % y opacidad de cada fila según su distancia.
          nv.toggleAttribute("data-in", box.nv[0] - s < vh * 0.75);
          rows.forEach((row, i) => {
            const d = Math.abs((rowCenters[i] ?? 0) - s - vh / 2) / (vh / 2);
            write(row, "opacity", Math.max(0.22, 1 - d * 0.85).toFixed(3));
          });

          // Transición: con q = −spacerTop / (spacerH − vh) la línea gira 180° (con curva: arranca
          // y llega suave) y la máscara conic-gradient deja ver Emergentes (ya fija debajo) por el
          // lado que barre.
          const spacerScreen = spacerTop - s;
          const on = spacerScreen <= 0;
          const q = clamp01(-spacerScreen / Math.max(1, spacerH - vh));
          const angle = easeInOutCubic(q) * 180;
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
          // La lista sigue a la vista por encima y se desvanece mientras la línea empieza a girar.
          const fade = on ? clamp01(q / 0.35) : 0;
          write(nvRight, "opacity", (1 - fade).toFixed(3));
          write(nvRight, "pointer-events", fade > 0.5 ? "none" : "auto");
          write(ediv, "opacity", q >= 1 ? "1" : "0");

          // Novedades → Emergentes: con Emergentes ya fija debajo, la escena de Novedades se queda
          // quieta, sube un poco y se funde (sin pantalla en blanco ni fotos cortadas).
          const x = clamp01((s - pinTop) / Math.max(1, hold * 0.75));
          const xe = easeInOutCubic(x);
          write(erStage, "opacity", (1 - xe).toFixed(3));
          write(
            erStage,
            "transform",
            x > 0 ? `translateY(${(-xe * vh * 0.05).toFixed(1)}px)` : "none",
          );
          write(er, "visibility", on && x < 1 ? "visible" : "hidden");

          // [ SALTAR ]: la primera sección cuyo final aún queda por delante (scroll real).
          const y = window.scrollY;
          const current = ends.findIndex((end) => end - y > 2);
          target = ends[current];
          skip.toggleAttribute("data-on", current >= 0);
          if (current >= 0 && current !== shownSection) {
            shownSection = current;
            setSection(current);
          }

          // Índice: la última sección cuyo inicio ya ha pasado el tercio de la pantalla.
          let activeId = "";
          for (const button of goButtons) {
            const start = starts[button.dataset.go ?? ""];
            if (start !== undefined && start <= y + vh * 0.35) activeId = button.dataset.go ?? "";
          }
          for (const button of goButtons) {
            const isOn = button.dataset.go === activeId;
            if (button.hasAttribute("data-on") !== isOn) {
              button.toggleAttribute("data-on", isOn);
              if (isOn) button.setAttribute("aria-current", "true");
              else button.removeAttribute("aria-current");
            }
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
          // (La pantalla extra del final es para el fundido: el carrusel ya ha llegado.)
          const t = clamp01(-erScreen / Math.max(1, box.er[1] - vh - hold));
          const rowsA = colA.children.length;
          const fit = Math.ceil(vh / Math.max(1, tile));
          const carTravel = Math.max(0, Math.min(rowsA, colB.children.length) - fit) * tile;
          const yA = -carTravel * (1 - t);
          const yB = -carTravel * t;
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

          // §4.5 Catálogo: durante el fundido aparecen la línea, el título y las columnas; después
          // la pista se desplaza.
          const kc = clamp01((s - pinTop) / Math.max(1, hold));
          write(
            catH,
            "transform",
            `scaleX(${easeOutCubic(clamp01((kc - 0.25) / 0.6)).toFixed(4)})`,
          );
          catTexts.forEach((node, i) => {
            const e = easeOutCubic(clamp01((kc - 0.35 - i * 0.08) / 0.4));
            write(node, "opacity", e.toFixed(3));
            write(node, "transform", `translateY(${((1 - e) * 14).toFixed(1)}px)`);
          });
          catCols.forEach((node, i) => {
            write(
              node,
              "opacity",
              easeOutCubic(clamp01((kc - 0.3 - Math.min(i, 3) * 0.08) / 0.45)).toFixed(3),
            );
          });
          const along = travel > 0 ? clamp01((s - pinTop - hold) / travel) : 0;
          write(track, "transform", `translateX(${(-along * travel).toFixed(1)}px)`);
        };

        const unsubscribe = subscribe(frame, el);
        return () => {
          unsubscribe();
          stop();
          for (const type of introInputs) window.removeEventListener(type, skipIntro);
          dest.removeAttribute("data-intro-on");
          skip.removeEventListener("click", jump);
          index.removeEventListener("click", go);
          spacer.style.marginTop = "";
          for (const button of goButtons) {
            button.removeAttribute("data-on");
            button.removeAttribute("aria-current");
          }
          for (const type of takeOver) window.removeEventListener(type, stop);
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

  const indexItems: IndexItem[] = [
    destacados.length > 0 && { id: "destacados", label: "Destacados" },
    populares.length > 0 && { id: "populares", label: "Populares" },
    novedades.length > 0 && { id: "novedades", label: "Novedades" },
    emergentes.length > 0 && { id: "emergentes", label: "Emergentes" },
    { id: "sugerir", label: "Sugerir marca" },
  ].filter((item): item is IndexItem => Boolean(item));

  return (
    <div ref={root} className={styles.root}>
      <h1 className="sr-only">Explora</h1>

      {destacados.length > 0 && (
        // MARCAS y la intro automática van en una capa fija sobre Destacados.
        <div className={styles.dest} data-dest>
          <div className={styles.marcasLayer} data-marcas-layer aria-hidden="true">
            <span className={styles.marcas} data-marcas>
              MARCAS
            </span>
            <span className={styles.marcasSub} data-marcas-sub>
              Destacados
            </span>
            {INTRO_WORDS.map((word) => (
              <span key={word} className={styles.introWord} data-pw>
                {word}
              </span>
            ))}
            <span className={styles.introName} data-intro-name>
              {INTRO_TEXT}
            </span>
          </div>
          <Populares popular={destacados} index={index} />
        </div>
      )}
      {populares.length > 0 && <Novedades newest={populares} />}
      {novedades.length > 0 && <Emergentes brands={novedades} near={near} />}
      {emergentes.length > 0 && <Catalogo brands={emergentes} />}
      <SkipButton section={SECTIONS[section] ?? SECTIONS[0]} />
      <SectionIndex items={indexItems} />

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
