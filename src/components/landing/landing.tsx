"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { Halo } from "@/components/ui/halo";
import { clamp01, easeInOutCubic, easeInOutQuad, lerpTo, pad } from "@/lib/motion/math";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write, writeText } from "@/lib/motion/write";
import {
  AUTO_MIN_MS,
  AUTO_PX_PER_MS,
  CURTAIN_MS,
  DECO,
  EXIT_PROGRESS,
  FALLBACK_TOTAL,
  GOLDEN_ANGLE,
  INTRO_HOLD_S,
  INTRO_S,
  MANIFESTO,
} from "./content";
import styles from "./landing.module.css";

gsap.registerPlugin(useGSAP);

const WORD_COUNT = MANIFESTO.flat().length;

type Controls = { toggleAuto: () => void };

type Props = {
  /** Las 12 tarjetas de marca del túnel (servidor, con Suspense). */
  tunnel: ReactNode;
};

/**
 * Landing (README §1, `Landing.dc.html`): loader, hero con zoom y túnel, manifiesto y salida.
 * Todo lo ligado al scroll se calcula en un único bucle (`gsap.ticker`) que escribe estilos en los
 * nodos con `write`; React solo guarda los cambios discretos (listo, automático, saliendo).
 */
export function Landing({ tunnel }: Props) {
  const root = useRef<HTMLElement>(null);
  const controls = useRef<Controls | null>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [auto, setAuto] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const one = <T extends HTMLElement>(name: string) => {
        const node = el.querySelector<T>(`[data-${name}]`);
        if (!node) throw new Error(`Landing: falta [data-${name}]`);
        return node;
      };
      const all = (name: string) => [...el.querySelectorAll<HTMLElement>(`[data-${name}]`)];

      const skip = one("skip");
      const counter = one("intro-count");
      const bar = one("progress");
      const hero = one("hero");
      const mani = one("mani");
      const maniStage = one("mani-stage");
      const exit = one("exit");
      const decos = all("deco");
      const woman = one("woman");
      const word = one("word");
      const wordText = one("word-text");
      const autoWrap = one("auto-wrap");
      const autoButton = one("auto-button");
      const hints = all("hint");
      const tunnelRoot = one("tunnel");
      const cnt = one("cnt");
      const cntNumber = one("cnt-number");
      const words = all("w");
      const pct = one("pct");
      const exitLabel = one("exit-label");
      const exitTrack = one("exit-track");
      const exitFill = one("exit-fill");

      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          el.setAttribute("data-measured", "");
          if (context.conditions?.reduce) {
            setReady(true);
            return;
          }

          // ---- Geometría (se mide al montar y al cambiar el tamaño, nunca por frame) ----
          let vh = 0;
          let docH = 1;
          const geo = { hero: [0, 1], mani: [0, 1], exit: [0, 1] } as Record<
            "hero" | "mani" | "exit",
            [number, number]
          >;
          let dirty = true;
          const measure = () => {
            vh = window.innerHeight;
            const top = (node: HTMLElement) => node.getBoundingClientRect().top + window.scrollY;
            geo.hero = [top(hero), hero.offsetHeight];
            geo.mani = [top(mani), mani.offsetHeight];
            geo.exit = [top(exit), exit.offsetHeight];
            docH = Math.max(1, document.documentElement.scrollHeight - vh);
            const vw = document.documentElement.clientWidth;
            el.style.setProperty("--ex", `${-(vw / 2 - 48 - skip.offsetWidth / 2)}px`);
            el.style.setProperty("--ey", `${vh / 2 - 22 - skip.offsetHeight / 2}px`);
            dirty = true;
          };
          measure();
          window.addEventListener("resize", measure);

          // Las tarjetas del túnel y el total llegan con Suspense: se vuelven a leer al cambiar.
          let tiles: HTMLElement[] = [];
          let total = FALLBACK_TOTAL;
          const readTunnel = () => {
            tiles = [...tunnelRoot.querySelectorAll<HTMLElement>("[data-tile]")];
            total =
              Number(tunnelRoot.querySelector("[data-total]")?.getAttribute("data-total")) ||
              FALLBACK_TOTAL;
            dirty = true;
          };
          readTunnel();
          const tunnelObserver = new MutationObserver(readTunnel);
          tunnelObserver.observe(tunnelRoot, { childList: true, subtree: true });

          // ---- Salida y autoscroll ----
          let left = false;
          let autoOn = false;
          let autoStart = 0;
          let autoDist = 0;
          let autoDur = 0;
          let autoT0 = -1;
          let wantAuto = false;

          const stopAuto = () => {
            if (!autoOn && !wantAuto) return;
            autoOn = false;
            wantAuto = false;
            setAuto(false);
          };
          const leave = () => {
            if (left) return;
            left = true;
            stopAuto();
            setLeaving(true);
            window.setTimeout(() => router.push("/web"), CURTAIN_MS);
          };
          controls.current = {
            toggleAuto: () => {
              if (autoOn || wantAuto) {
                stopAuto();
                return;
              }
              const dist = geo.exit[0] + geo.exit[1] - vh - window.scrollY;
              if (dist <= 0) {
                leave();
                return;
              }
              autoStart = window.scrollY;
              autoDist = dist;
              autoDur = Math.max(AUTO_MIN_MS, dist / AUTO_PX_PER_MS);
              wantAuto = true;
              setAuto(true);
            },
          };
          const onUserInput = (event: Event) => {
            if (event.type === "keydown" && autoButton.contains(event.target as Node)) return;
            stopAuto();
          };
          const inputs = ["wheel", "touchstart", "keydown"] as const;
          for (const type of inputs) window.addEventListener(type, onUserInput, { passive: true });

          // ---- Bucle ----
          let phase: "intro" | "live" = "intro";
          let t0 = -1;
          let readyAt = -1;
          let s = 0;
          const last = { a: Number.NaN, b: Number.NaN, c: Number.NaN };
          const wordOn: boolean[] = [];
          const progress = (key: "hero" | "mani" | "exit") => {
            const [top, height] = geo[key];
            return clamp01((s - top) / (height - vh || 1));
          };

          const frame: Tick = (time, deltaMs) => {
            if (t0 < 0) t0 = time;

            if (phase === "intro") {
              if (window.scrollY !== 0) window.scrollTo(0, 0);
              const k = clamp01((time - t0) / INTRO_S);
              writeText(counter, pad(Math.round(k * 100), 3));
              write(bar, "transform", `scaleX(${k})`);
              if (k >= 1 && readyAt < 0) readyAt = time;
              if (readyAt >= 0 && time - readyAt >= INTRO_HOLD_S) {
                phase = "live";
                setReady(true);
                router.prefetch("/web");
              }
              return;
            }
            if (left) return;

            if (wantAuto && autoT0 < 0) {
              autoT0 = time;
              autoOn = true;
            }
            if (!wantAuto) autoT0 = -1;
            if (autoOn) {
              const k = clamp01(((time - autoT0) * 1000) / autoDur);
              window.scrollTo(0, autoStart + autoDist * easeInOutQuad(k));
              if (k >= 1) {
                leave();
                return;
              }
            }

            const next = lerpTo(s, window.scrollY, deltaMs);
            if (next === s && !dirty) return;
            s = next;
            dirty = false;

            const pA = progress("hero");
            const pB = progress("mani");
            const pC = progress("exit");
            write(bar, "transform", `scaleX(${clamp01(s / docH)})`);

            // Hero: zoom de EMER, imágenes fuera antes del negro, túnel y contador.
            const showAuto = pA < 0.04 || autoOn;
            write(autoWrap, "opacity", showAuto ? "1" : "0");
            write(autoWrap, "pointer-events", pA < 0.04 ? "auto" : "none");
            if (pA !== last.a) {
              last.a = pA;
              hero.toggleAttribute("data-live", pA > 0 && pA < 1);
              const t1 = clamp01(pA / 0.36);
              const e1 = easeInOutCubic(t1);
              const t2 = clamp01((pA - 0.28) / 0.64);
              const fade = String(1 - clamp01(t1 / 0.28));

              decos.forEach((node, i) => {
                const d = DECO[i];
                if (!d) return;
                write(
                  node,
                  "transform",
                  `translate(-50%,-50%) translate(${d.dx * e1 * 55}vw,${d.dy * e1 * 50}vh) rotate(${d.r + e1 * d.r * 3}deg) scale(${1 + e1 * 0.7})`,
                );
                write(node, "opacity", fade);
              });
              write(
                woman,
                "transform",
                `translateX(-50%) translate(${e1 * 30}vw,${e1 * 20}vh) scale(${1 + e1 * 0.5})`,
              );
              write(woman, "opacity", fade);
              write(wordText, "transform", `scale(${1 + e1 * e1 * 11})`);
              write(word, "opacity", String(1 - clamp01((t1 - 0.55) / 0.3)));
              const hintOpacity = String(1 - clamp01(pA / 0.06));
              for (const hint of hints) write(hint, "opacity", hintOpacity);

              const count = tiles.length || 1;
              tiles.forEach((node, k) => {
                const u = clamp01(t2 * 1.7 - (k / count) * 0.7);
                const angle = k * GOLDEN_ANGLE;
                const radius = 15 + (k % 3) * 7;
                const scale = 0.08 + u ** 2.3 * 4.2;
                const opacity =
                  u <= 0 ? 0 : u < 0.12 ? u / 0.12 : u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
                write(
                  node,
                  "transform",
                  `translate(-50%,-50%) translate(${Math.cos(angle) * radius * scale}vw,${Math.sin(angle) * radius * 0.62 * scale}vw) scale(${scale})`,
                );
                write(node, "opacity", String(opacity));
              });

              const cntIn = clamp01((pA - 0.28) / 0.08);
              const cntOut = clamp01((pA - 0.9) / 0.08);
              write(cnt, "opacity", String(cntIn * (1 - cntOut)));
              write(cnt, "transform", `translateY(${(1 - cntIn) * 30 - cntOut * 40}px)`);
              writeText(
                cntNumber,
                pad(Math.round(easeInOutCubic(clamp01((pA - 0.28) / 0.5)) * total), 2),
              );
            }

            // Manifiesto: las palabras se encienden una a una; al final, corte brusco a la bomba.
            if (pB !== last.b) {
              last.b = pB;
              mani.toggleAttribute("data-live", pB > 0 && pB < 1);
              const lit = clamp01(pB / 0.62) * (WORD_COUNT + 1) - 0.5;
              words.forEach((node, i) => {
                const on = lit > i;
                if (wordOn[i] === on) return;
                wordOn[i] = on;
                node.toggleAttribute("data-on", on);
              });
              maniStage.toggleAttribute("data-big", pB > 0.66);
              writeText(pct, pad(Math.round(pB * 100), 3));
            }

            // Salida: la barra se llena y, al llegar al 99 %, cae la cortina y se navega.
            if (pC !== last.c) {
              last.c = pC;
              const opacity = String(clamp01(pC * 3));
              write(exitLabel, "opacity", opacity);
              write(exitTrack, "opacity", opacity);
              write(exitFill, "transform", `scaleX(${pC})`);
              if (pC >= EXIT_PROGRESS) leave();
            }
          };

          const unsubscribe = subscribe(frame);
          return () => {
            unsubscribe();
            tunnelObserver.disconnect();
            window.removeEventListener("resize", measure);
            for (const type of inputs) window.removeEventListener(type, onUserInput);
            controls.current = null;
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root },
  );

  const decoStyle = (d: (typeof DECO)[number]): CSSProperties => ({
    left: `${d.x}%`,
    top: `${d.y}%`,
    width: `${d.w}vw`,
    transform: `translate(-50%,-50%) rotate(${d.r}deg)`,
  });

  return (
    <main
      ref={root}
      className={styles.root}
      data-ready={ready || undefined}
      data-auto={auto || undefined}
      data-leaving={leaving || undefined}
    >
      <h1 className="sr-only">EMER</h1>

      <div className={styles.loader} aria-hidden="true" inert={ready}>
        <div className={styles.loaderRow}>
          <span>RASTREANDO MARCAS</span>
          <span data-intro-count>000</span>
        </div>
      </div>
      <div className={styles.curtain} aria-hidden="true" />

      <Link href="/web" className={styles.skip} data-skip>
        <span className={styles.skipHalo} aria-hidden="true" />
        <span className={styles.skipLabel}>[ SALTAR ]</span>
        <span className={styles.skipLine} aria-hidden="true" />
      </Link>

      <div className={styles.progress} aria-hidden="true">
        <div className={styles.progressBar} data-progress />
      </div>

      <section className={styles.hero} data-hero aria-label="Introducción">
        <div className={styles.stage}>
          {DECO.map((d) => (
            // biome-ignore lint/performance/noImgElement: PNG decorativo local con posición fija en vw
            <img
              key={d.name}
              src={`/assets/deco/${d.name}.png`}
              alt=""
              width={d.width}
              height={d.height}
              className={styles.deco}
              style={decoStyle(d)}
              data-deco
              decoding="async"
            />
          ))}
          {/* biome-ignore lint/performance/noImgElement: PNG decorativo local */}
          <img
            src="/assets/deco/mujer.png"
            alt=""
            width={736}
            height={920}
            className={styles.woman}
            data-woman
            decoding="async"
          />
          <div className={styles.word} data-word aria-hidden="true">
            <span className={styles.wordText} data-word-text>
              EMER
            </span>
          </div>

          <div className={styles.auto} data-auto-wrap>
            <button
              type="button"
              className={styles.autoButton}
              data-auto-button
              onClick={() => controls.current?.toggleAuto()}
            >
              <span className={styles.autoLabel}>{auto ? "[ DETENER ]" : "[ AUTOMÁTICO ]"}</span>
              <span className={styles.autoLine} aria-hidden="true" />
            </button>
          </div>
          <p className={styles.tagline} data-hint>
            MARCAS EMERGENTES,
            <br />
            ANTES QUE NADIE.
          </p>
          <div className={styles.scrollHint} data-hint aria-hidden="true">
            BAJA
            <span className={styles.drip}>
              <span className={styles.dripFill} />
            </span>
          </div>

          <div className={styles.tunnel} data-tunnel>
            {tunnel}
          </div>
          <div className={styles.counter} data-cnt aria-hidden="true">
            <span className={styles.counterNumber} data-cnt-number>
              00
            </span>
            <span className={styles.counterLabel}>
              <Halo />
              MARCAS EMERGENTES
              <br />
              UN SOLO LUGAR
            </span>
          </div>
        </div>
      </section>

      <section className={styles.mani} data-mani aria-label="Manifiesto">
        <div className={styles.maniStage} data-mani-stage>
          <p className={styles.manifesto}>
            {MANIFESTO.map((line) => (
              <span
                key={line.map((w) => ("text" in w ? w.text : w.image)).join("-")}
                className={styles.line}
              >
                {line.map((item) =>
                  "text" in item ? (
                    <span key={item.text} className={styles.w} data-w>
                      {item.text}
                    </span>
                  ) : (
                    <span key={item.image} className={styles.wImage} data-w>
                      <span className={styles.clip}>
                        {/* biome-ignore lint/performance/noImgElement: PNG decorativo local */}
                        <img
                          src={`/assets/deco/${item.image}.png`}
                          alt=""
                          width={item.width}
                          height={item.height}
                          decoding="async"
                        />
                      </span>
                    </span>
                  ),
                )}
              </span>
            ))}
          </p>
          {/* biome-ignore lint/performance/noImgElement: PNG decorativo local */}
          <img
            src="/assets/deco/bomba-policia.png"
            alt=""
            width={736}
            height={1041}
            className={styles.big}
            decoding="async"
          />
          <span className={styles.pct} data-pct aria-hidden="true">
            000
          </span>
        </div>
      </section>

      <section className={styles.exit} data-exit aria-label="Entrar al Marketplace">
        <div className={styles.exitStage}>
          <Link href="/web" className={styles.exitLabel} data-exit-label>
            [ MARKETPLACE ]
          </Link>
          <span className={styles.exitTrack} data-exit-track aria-hidden="true">
            <span className={styles.exitFill} data-exit-fill />
          </span>
        </div>
      </section>
    </main>
  );
}
