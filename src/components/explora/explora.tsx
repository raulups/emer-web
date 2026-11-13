"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { bus } from "@/lib/bus";
import type { ExploraData } from "@/lib/explora-data";
import { clamp01, easeInOutQuad, easeOutCubic } from "@/lib/motion/math";
import { followScroll, getLenis, scrollToY } from "@/lib/motion/scroll";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write } from "@/lib/motion/write";
import { BrandActions } from "./brand-actions";
import { Catalogo } from "./catalogo";
import { Emergentes } from "./emergentes";
import styles from "./explora.module.css";
import { Footer } from "./footer";
import { Llegadas } from "./llegadas";
import { createNovedades } from "./llegadas-motion";
import { Novedades } from "./novedades";
import { describe, Populares } from "./populares";
import { ProductPeek } from "./product-peek";
import { createProgressHint, type Span } from "./progress-hint";
import { type IndexItem, SectionIndex } from "./section-index";
import { SkipButton } from "./skip-button";
import { SuggestBrand } from "./suggest-brand";

gsap.registerPlugin(useGSAP);

/**
 * Secciones que [ SALTAR ] lleva a su final, en orden de scroll (por posición: 1.ª `Populares`,
 * 2.ª `Novedades`, 3.ª `Catalogo`, 4.ª `Llegadas` y 5.ª `Emergentes` como componentes).
 */
const SECTIONS = ["Destacados", "Populares", "Emergentes", "Novedades", "Catálogo"] as const;
const SECTION_DWELL_MS = 1_500;

/** Píxeles que avanza el carrusel de Emergentes por cada píxel de scroll. */
const CAT_SPEED = 1.42;
/** Avance del fondo (0 negro, 1 blanco) en el que el texto oscuro ya se lee mejor que el claro. */
const CAT_LIGHT_AT = 0.5;
/** Tramo de la entrada de Emergentes (q, de 0 a 1) en el que su fondo pasa de negro a blanco. */
const CAT_FADE_FROM = 0.2;
const CAT_FADE_TO = 0.8;

type Props = { data: ExploraData };

/** Duración (s) de un salto animado según la distancia (en pantallas). */
const jumpDuration = (distance: number, vh: number) =>
  Math.min(2.2, 0.6 + (0.12 * Math.abs(distance)) / Math.max(1, vh));

/**
 * Explora §4.2–§4.5: cinco secciones (`lib/explora-data.ts`). Los componentes conservan el
 * nombre de su posición original: `Populares` pinta Destacados, `Novedades` pinta Populares,
 * `Catalogo` pinta Emergentes (entra en negro bajo Populares y pasa a blanco mientras sube),
 * `Llegadas` pinta Novedades (baraja de cartas que retiene el scroll) y `Emergentes` pinta el Catálogo. Una sección sin marcas no se pinta. Destacados es un carrusel con
 * su propio bucle (no depende del scroll); para lo demás, un único bucle (`gsap.ticker`) sigue el scroll (`followScroll`) y escribe estilos en los nodos con geometría medida; React solo
 * guarda las marcas activas.
 */
export function Explora({ data }: Props) {
  const { destacados, populares, emergentes, novedades, todas } = data;
  const root = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState(0);

  // Una vista de sección cuenta si se queda en ella un momento (no al pasar de largo).
  useEffect(() => {
    const timer = window.setTimeout(
      () => track("explora_section_view", { section: SECTIONS[section] ?? SECTIONS[0] }),
      SECTION_DWELL_MS,
    );
    return () => window.clearTimeout(timer);
  }, [section]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      // Una sección sin marcas no se pinta: sus nodos se sustituyen por uno suelto (lo que se
      // escribe en él no tiene efecto y mide 0), así el bucle sigue igual para las demás.
      const one = <T extends HTMLElement>(name: string) =>
        el.querySelector<T>(`[data-${name}]`) ??
        (document.createElement("div") as HTMLElement as T);
      const pop = one("pop");
      const stage = one("pop-stage");
      const nv = one("nv");
      const nvLights = [...el.querySelectorAll<HTMLElement>("[data-nv-light]")];
      const nvTitleOnDark = one("nv-title-on-dark");
      const nvTitleOnLight = one("nv-title-on-light");
      const catDark = one("cat-dark");
      const catTitleOnDark = one("cat-title-on-dark");
      const catTitleOnLight = one("cat-title-on-light");
      const er = one("er");
      const cat = one("cat");
      const pin = one("cat-pin");
      const track = one("cat-track");
      const catTexts = [...el.querySelectorAll<HTMLElement>("[data-cat-t]")];
      const catCols = [...el.querySelectorAll<HTMLElement>("[data-cat-g]")];
      const nw = one("nw");
      const nwPin = one("nw-pin");
      const novedades = createNovedades(nw);
      const hint = createProgressHint(one("hint"), one("hint-fill"), pop);
      const skip = one("skip");
      const index = one("index");
      const goButtons = [...el.querySelectorAll<HTMLElement>("[data-go]")];
      const suggest = el.querySelector<HTMLElement>("#sugerir-marca") ?? one("none");

      scrollToY(0, { immediate: true });

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // ---- Geometría: se mide al montar, al cargar la fuente y al cambiar el tamaño ----
        let vh = 0;
        const box = { pop: [0, 1], nv: [0, 0], nw: [0, 0], er: [0, 1] } as Record<
          "pop" | "nv" | "nw" | "er",
          [number, number]
        >;
        let pinTop = 0;
        let catPinHeight = 0;
        let travel = 0;
        let travelScroll = 0;
        let drift = 0;
        // Final de cada sección de SECTIONS (scrollY en el que termina).
        let ends: number[] = [];
        // Inicio de cada sección del índice (scrollY), por id.
        let starts: Record<string, number> = {};
        // Tramos de las secciones que avanzan con el scroll (para la línea de avance).
        let spans: Span[] = [];
        let dirty = true;
        const docTop = (node: HTMLElement, scroll: number) =>
          node.getBoundingClientRect().top + scroll;
        const measure = () => {
          vh = window.innerHeight;
          // Recorrido medido: la sección fija mide una pantalla + el scroll que necesita la pista. La
          // escalera sube a la vez que avanza: lo que baja la última foto, sin saltos.
          travel = Math.max(0, track.scrollWidth - pin.clientWidth);
          travelScroll = travel / CAT_SPEED;
          drift =
            catCols.length > 1
              ? (catCols.at(-1)?.offsetTop ?? 0) - (catCols[0]?.offsetTop ?? 0)
              : 0;
          const pinHeight = `${Math.round(vh + travelScroll)}px`;
          if (pin.style.height !== pinHeight) pin.style.height = pinHeight;
          // Novedades: una pantalla + lo que tarda en entrar toda la baraja.
          const nwHeight = `${Math.round(vh + novedades.travel(vh))}px`;
          if (nwPin.style.height !== nwHeight) nwPin.style.height = nwHeight;
          const scroll = window.scrollY;
          box.pop = [docTop(pop, scroll), pop.offsetHeight];
          box.nv = [docTop(nv, scroll), nv.offsetHeight];
          box.er = [docTop(er, scroll), er.offsetHeight];
          pinTop = docTop(pin, scroll);
          catPinHeight = pin.offsetHeight;
          box.nw = [docTop(nw, scroll), nw.offsetHeight];
          // Destacados acaba cuando Populares llega arriba; Populares, cuando Emergentes llega arriba;
          // Emergentes, al acabar su pista; Novedades y el Catálogo, cuando su final llega abajo.
          const last = document.documentElement.scrollHeight - vh;
          ends = [
            box.nv[0],
            box.nv[0] + box.nv[1],
            pinTop + travelScroll,
            box.nw[0] + box.nw[1] - vh,
            box.er[0] + box.er[1] - vh,
          ].reduce<number[]>((acc, end) => {
            acc.push(Math.min(last, Math.max(end, acc.at(-1) ?? 0)));
            return acc;
          }, []);
          // Destacados no avanza con el scroll: su tramo lo lleva la línea aparte. Populares no
          // lleva línea (es una lista que sube con la página).
          spans = [
            { start: pinTop, end: ends[2] ?? 0 },
            { start: box.nw[0], end: ends[3] ?? 0 },
            { start: box.er[0], end: ends[4] ?? 0 },
          ];
          starts = {
            destacados: box.pop[0],
            populares: box.nv[0],
            emergentes: pinTop,
            novedades: box.nw[0],
            catalogo: box.er[0],
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

        const frame: Tick = (_time, deltaMs) => {
          // La línea va siempre: en Destacados cambia sin que se mueva el scroll.
          hint({ y: window.scrollY, vh, deltaMs, firstExit: box.nv[0] - vh, spans });
          const next = followScroll(s, deltaMs);
          if (next === s && !dirty) return;
          s = next;
          dirty = false;

          live(pop, box.pop[0], box.pop[1]);
          live(nv, box.nv[0], box.nv[1]);
          live(er, box.er[0], box.er[1]);
          live(cat, pinTop, catPinHeight);
          live(nw, box.nw[0], box.nw[1]);

          // Salida de Destacados: mientras el negro sube por encima, la escena se queda atrás (va a
          // un 45 % de la velocidad del scroll) y se apaga un poco, sin corte seco.
          const out = clamp01((s - (box.nv[0] - vh)) / Math.max(1, vh));
          write(
            stage,
            "transform",
            out > 0 ? `translateY(${(out * vh * 0.55).toFixed(1)}px)` : "none",
          );
          write(stage, "opacity", (1 - out * 0.5).toFixed(3));

          // §4.3 Populares: entrada al llegar al 75 %.
          nv.toggleAttribute("data-in", box.nv[0] - s < vh * 0.75);

          // Populares → Emergentes: nada se queda quieto. Populares sube con el scroll y, mientras la
          // sección siguiente entra por abajo (q de 0 a 1), sus piezas aparecen sobre el mismo negro.
          const q = clamp01((s + vh - (box.nv[0] + box.nv[1])) / Math.max(1, vh));

          // [ SALTAR ]: la primera sección cuyo final aún queda por delante (scroll real).
          const y = window.scrollY;
          const current = ends.findIndex((end) => end - y > 2);
          target = ends[current];
          // En Destacados no: abajo ya está [ BAJAR ].
          skip.toggleAttribute("data-on", current >= 1);
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

          // Novedades: su titular entra al llegar al 75 %; la baraja sigue el scroll dentro de la sección.
          nw.toggleAttribute("data-in", box.nw[0] - s < vh * 0.75);
          novedades.render(s - box.nw[0], vh);

          // §4.4 Catálogo: su titular entra al llegar al 75 % (las filas aparecen por su cuenta).
          er.toggleAttribute("data-in", box.er[0] - s < vh * 0.75);

          // Emergentes: mientras sube por debajo de Populares, todo el fondo (Populares incluida) pasa
          // de negro a blanco y aparecen el título y las fotos; al llegar arriba ya es blanca, se queda
          // fija y la escalera recorre la pantalla en diagonal.
          const kc = q;
          cat.toggleAttribute("data-in", kc > 0.3);
          catTexts.forEach((node, i) => {
            const e = easeOutCubic(clamp01((kc - 0.35 - i * 0.08) / 0.4));
            write(node, "opacity", e.toFixed(3));
            write(node, "transform", `translateY(${((1 - e) * 14).toFixed(1)}px)`);
          });
          catCols.forEach((node, i) => {
            const e = easeOutCubic(clamp01((kc - 0.3 - Math.min(i, 3) * 0.08) / 0.45));
            write(node, "opacity", e.toFixed(3));
            write(node, "transform", e < 1 ? `translateY(${((1 - e) * 12).toFixed(2)}vh)` : "none");
          });
          const light = easeInOutQuad(
            clamp01((kc - CAT_FADE_FROM) / (CAT_FADE_TO - CAT_FADE_FROM)),
          );
          write(catDark, "opacity", (1 - light).toFixed(3));
          // Populares se aclara a la vez: todo el fondo pasa de negro a blanco, sin franjas.
          for (const node of nvLights) write(node, "opacity", light.toFixed(3));
          cat.toggleAttribute("data-light", light > CAT_LIGHT_AT);
          // El título se ve siempre: pasa de blanco a negro con un fundido alrededor de ese punto.
          const ink = clamp01((light - CAT_LIGHT_AT + 0.08) / 0.16);
          const along = travelScroll > 0 ? clamp01((s - pinTop) / travelScroll) : 0;
          write(catTitleOnDark, "opacity", (1 - ink).toFixed(3));
          write(catTitleOnLight, "opacity", ink.toFixed(3));
          write(nvTitleOnDark, "opacity", (1 - ink).toFixed(3));
          write(nvTitleOnLight, "opacity", ink.toFixed(3));
          write(
            track,
            "transform",
            `translate3d(${(-along * travel).toFixed(1)}px, ${(-along * drift).toFixed(1)}px, 0)`,
          );
        };

        const unsubscribe = subscribe(frame, el);
        return () => {
          unsubscribe();
          stop();
          skip.removeEventListener("click", jump);
          index.removeEventListener("click", go);
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

  if (
    destacados.length + populares.length + emergentes.length + novedades.length + todas.length ===
    0
  )
    return null;

  const indexItems: IndexItem[] = [
    destacados.length > 0 && { id: "destacados", label: "Destacados" },
    populares.length > 0 && { id: "populares", label: "Populares" },
    emergentes.length > 0 && { id: "emergentes", label: "Emergentes" },
    novedades.length > 0 && { id: "novedades", label: "Novedades" },
    todas.length > 0 && { id: "catalogo", label: "Catálogo" },
    { id: "sugerir", label: "Sugerir marca" },
  ].filter((item): item is IndexItem => Boolean(item));

  return (
    <div ref={root} className={styles.root}>
      <h1 className="sr-only">Explora</h1>

      {destacados.length > 0 && <Populares popular={destacados} />}
      {populares.length > 0 && <Novedades newest={populares} />}
      {emergentes.length > 0 && <Catalogo brands={emergentes} />}
      {novedades.length > 0 && <Llegadas brands={novedades} />}
      {todas.length > 0 && <Emergentes brands={todas} />}
      <SkipButton section={SECTIONS[section] ?? SECTIONS[0]} />
      <span className={styles.hint} data-hint aria-hidden="true">
        <span className={styles.hintFill} data-hint-fill />
      </span>
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
      <ProductPeek />
      {/* Tras Emergentes en pantalla: las listas de arriba solo se ven con «reducir movimiento». */}
      <SuggestBrand brands={todas} />
      <Footer />
    </div>
  );
}
