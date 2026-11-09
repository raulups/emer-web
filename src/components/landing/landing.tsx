"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { WarmResponse } from "@/app/api/warm/route";
import { wakeFetch } from "@/lib/backend-wake";
import { clamp01, easeInOutCubic, easeOutCubic, pad } from "@/lib/motion/math";
import { scrollToY } from "@/lib/motion/scroll";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write, writeText } from "@/lib/motion/write";
import {
  CURTAIN_MS,
  FALLBACK_TOTAL,
  GOLDEN_ANGLE,
  LOADING,
  TUNNEL_MAX_SCALE,
  TUNNEL_ORBIT,
  TUNNEL_S,
} from "./content";
import styles from "./landing.module.css";
import { TUNNEL_IMAGES } from "./tunnel-images";

gsap.registerPlugin(useGSAP);

/** Estado de `/api/warm`: `done` en cuanto responde (bien o mal). */
type Warm = { done: boolean; total: number | null };

/**
 * Landing: mientras `/api/warm` deja en caché las marcas y la primera página del Marketplace,
 * el túnel de fotos (`src/img/`) con el contador de marcas. Al acabar, «CARGANDO MARKETPLACE»
 * con una barra: si ya hay respuesta se llena rápido; si no, avanza despacio y se completa al
 * llegar. Entonces cae la cortina y se abre `/web`. [ SALTAR ] va directo a la barra.
 * Todo en un único bucle (`gsap.ticker`) que escribe estilos con `write`.
 */
export function Landing() {
  const root = useRef<HTMLElement>(null);
  const warm = useRef<Warm>({ done: false, total: null });
  const skipTunnel = useRef<(() => void) | null>(null);
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    router.prefetch("/web");
    // Si el backend duerme, `wakeFetch` repite hasta que responda; el aviso sale al acabar el túnel.
    wakeFetch("/api/warm", {
      cache: "no-store",
      signal: controller.signal,
      graceMs: (TUNNEL_S + 1) * 1000,
    })
      .then((res) => res.json() as Promise<WarmResponse>)
      .then((body) => {
        warm.current = { done: true, total: body.total };
      })
      .catch(() => {
        // Sin red o agotada la espera: se abre igual y `/web` enseña su propio estado.
        if (!controller.signal.aborted) warm.current = { done: true, total: null };
      });
    return () => controller.abort();
  }, [router]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const one = (name: string) => {
        const node = el.querySelector<HTMLElement>(`[data-${name}]`);
        if (!node) throw new Error(`Landing: falta [data-${name}]`);
        return node;
      };
      const tiles = [...el.querySelectorAll<HTMLElement>("[data-tile]")];
      const cnt = one("cnt");
      const cntNumber = one("cnt-number");
      const fill = one("loading-fill");

      history.scrollRestoration = "manual";
      scrollToY(0, { immediate: true });

      const mm = gsap.matchMedia();
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          const reduce = Boolean(context.conditions?.reduce);
          let left = false;
          const leave = () => {
            if (left) return;
            left = true;
            setLeaving(true);
            window.setTimeout(() => router.push("/web"), reduce ? 0 : CURTAIN_MS);
          };

          // Sin movimiento no hay túnel: directamente la pantalla de carga.
          let phase: "tunnel" | "loading" = reduce ? "loading" : "tunnel";
          skipTunnel.current = () => {
            phase = "loading";
          };
          el.toggleAttribute("data-live", !reduce);

          let t0 = -1;
          let loadT0 = -1;
          let readyT = -1;
          let readyFrom = 0;
          let k = 0;
          const count = tiles.length || 1;

          const frame: Tick = (time) => {
            if (left) return;
            if (t0 < 0) t0 = time;

            if (phase === "tunnel") {
              const t = clamp01((time - t0) / TUNNEL_S);
              // Fotos: salen del centro una tras otra y crecen hacia fuera (ángulo áureo), en tres
              // órbitas bien separadas: entre foto y foto queda aire.
              tiles.forEach((node, i) => {
                const u = clamp01(t * 1.7 - (i / count) * 0.7);
                const angle = i * GOLDEN_ANGLE;
                const radius = TUNNEL_ORBIT.base + (i % 3) * TUNNEL_ORBIT.step;
                const scale = 0.08 + u ** 2.3 * 3.8;
                const opacity =
                  u <= 0 ? 0 : u < 0.12 ? u / 0.12 : u > 0.8 ? 1 - (u - 0.8) / 0.2 : 1;
                write(
                  node,
                  "transform",
                  `translate(-50%,-50%) translate(${Math.cos(angle) * radius * scale}vw,${Math.sin(angle) * radius * 0.7 * scale}vw) scale(${(scale / TUNNEL_MAX_SCALE).toFixed(4)})`,
                );
                write(node, "opacity", String(opacity));
              });
              const cntIn = clamp01(t * 8);
              write(cnt, "opacity", String(cntIn));
              write(cnt, "transform", `translateY(${(1 - cntIn) * 30}px)`);
              const total = warm.current.total ?? FALLBACK_TOTAL;
              writeText(cntNumber, pad(Math.round(easeInOutCubic(clamp01(t * 1.28)) * total), 2));
              if (t >= 1) phase = "loading";
              return;
            }

            if (loadT0 < 0) {
              loadT0 = time;
              el.setAttribute("data-loading", "");
              el.removeAttribute("data-live");
              write(cnt, "opacity", "0");
            }

            if (reduce) {
              if (warm.current.done) {
                write(fill, "transform", "scaleX(1)");
                leave();
              }
              return;
            }

            if (!warm.current.done) {
              // Sin respuesta: avanza despacio sin llegar nunca al final.
              k = LOADING.cap * (1 - Math.exp(-(time - loadT0) / LOADING.slowS));
            } else {
              if (readyT < 0) {
                readyT = time;
                readyFrom = k;
              }
              const p = clamp01((time - readyT) / LOADING.fastS);
              k = readyFrom + (1 - readyFrom) * easeOutCubic(p);
              if (p >= 1) leave();
            }
            write(fill, "transform", `scaleX(${k})`);
          };

          const unsubscribe = subscribe(frame);
          return () => {
            unsubscribe();
            skipTunnel.current = null;
            el.removeAttribute("data-live");
            el.removeAttribute("data-loading");
          };
        },
      );
      return () => mm.revert();
    },
    { scope: root, dependencies: [router] },
  );

  return (
    <main ref={root} className={styles.root} data-leaving={leaving || undefined}>
      <h1 className="sr-only">EMER</h1>
      <div className={styles.curtain} aria-hidden="true" />

      <Link
        href="/web"
        className={styles.skip}
        data-skip
        onClick={(event) => {
          if (!skipTunnel.current) return;
          event.preventDefault();
          skipTunnel.current();
        }}
      >
        <span className={styles.skipLabel}>[ SALTAR ]</span>
        <span className={styles.skipLine} aria-hidden="true" />
      </Link>

      <div className={styles.stage}>
        <div className={styles.tunnel} aria-hidden="true">
          {TUNNEL_IMAGES.map((image) => (
            <div key={image.src} className={styles.tile} data-tile>
              <Image src={image} alt="" sizes="43vw" loading="eager" className={styles.tileImage} />
            </div>
          ))}
        </div>

        <div className={styles.counter} data-cnt aria-hidden="true">
          <span className={styles.counterNumber} data-cnt-number>
            00
          </span>
          <span className={styles.counterLabel}>
            MARCAS EMERGENTES
            <br />
            UN SOLO LUGAR
          </span>
        </div>

        <div className={styles.loading} role="status">
          <span className={styles.loadingLabel}>CARGANDO MARKETPLACE</span>
          <span className={styles.loadingTrack} aria-hidden="true">
            <span className={styles.loadingFill} data-loading-fill />
          </span>
        </div>
      </div>
    </main>
  );
}
