"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMemo, useRef, useState } from "react";
import button from "@/components/ui/button.module.css";
import { DisplayTitle } from "@/components/ui/display-title";
import { ScrambleText } from "@/components/ui/scramble-text";
import { track } from "@/lib/analytics";
import { BORDERS, LAND, MAP_H, MAP_W } from "@/lib/geo/europe";
import { clamp01, pad } from "@/lib/motion/math";
import { subscribe } from "@/lib/motion/ticker";
import { write } from "@/lib/motion/write";
import {
  directionsUrl,
  groupByCity,
  type MapCity,
  type MapStore,
  metersPerUnit,
} from "@/lib/stores";
import styles from "./tiendas.module.css";

gsap.registerPlugin(useGSAP);

type Props = { stores: readonly MapStore[] };

type View = { cx: number; cy: number; lk: number };

/** Hueco alrededor de lo que se encuadra (fracción del lado menor del marco). */
const PAD = 0.16;
/** Lo mínimo que enseña una ciudad (m): con una sola tienda no se acerca hasta el portal. */
const CITY_MIN_SPAN_M = 900;
/** Zoom a partir del cual las siluetas ya no aportan (en una calle no hay costa) y se apagan. */
const LAND_FADE = [24, 70] as const;
/** Zoom en el que los puntos de ciudad dan paso a las tiendas. */
const SPOT_FADE = [10, 26] as const;
/** La silueta no se escala más allá de esto: ya está apagada y así no se rasteriza enorme. */
const LAND_MAX_K = 80;
/** Barra de escala: metros que representa. */
const SCALE_M = 200;
const SCALE_PX = 100;
/** Largo de la línea de calle en el CSS: se estira con `scaleX` (nunca se anima el ancho). */
const STREET_PX = 1000;

const fade = (k: number, [from, to]: readonly [number, number]) =>
  clamp01(Math.log(k / from) / Math.log(to / from));

/** Encuadre de una caja del mapa en un marco de w × h. */
function frame(
  box: readonly [number, number, number, number],
  w: number,
  h: number,
  minSpan = 0,
): View {
  const spanX = Math.max(box[2] - box[0], minSpan);
  const spanY = Math.max(box[3] - box[1], minSpan);
  const room = 1 - PAD * 2;
  const k = Math.min((w * room) / spanX, (h * room) / spanY);
  return { cx: (box[0] + box[2]) / 2, cy: (box[1] + box[3]) / 2, lk: Math.log(k) };
}

/**
 * Tiendas físicas (Explora, tras Sugerir marca). A la izquierda, las ciudades; a la derecha, Europa
 * en línea fina con un punto por ciudad. Al elegir una ciudad el mapa vuela hasta ella (tween de
 * GSAP sobre `transform`): la silueta se apaga, aparecen las tiendas con su marca y la lista pasa a
 * ser la de esa ciudad, con «Cómo llegar». React solo guarda la ciudad elegida; las posiciones se
 * escriben en los nodos.
 */
export function Tiendas({ stores }: Props) {
  const root = useRef<HTMLElement>(null);
  const cities = useMemo(() => groupByCity(stores), [stores]);
  const [cityKey, setCityKey] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const city = cities.find((c) => c.key === cityKey) ?? null;
  // El efecto lee la ciudad sin re-crear el contexto de GSAP.
  const goRef = useRef<(city: MapCity | null) => void>(() => {});

  const allBox = useMemo<[number, number, number, number]>(() => {
    const xs = cities.flatMap((c) => c.spots.map((s) => s.x));
    const ys = cities.flatMap((c) => c.spots.map((s) => s.y));
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }, [cities]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const one = (sel: string) => {
        const node = el.querySelector<HTMLElement>(sel);
        if (!node) throw new Error(`Tiendas: falta ${sel}`);
        return node;
      };
      const stage = one("[data-map]");
      const land = one("[data-land]");
      const scale = one("[data-scale]");
      const scaleBar = one("[data-scale-bar]");
      const scaleText = one("[data-scale-text]");
      const cityNodes = [...el.querySelectorAll<HTMLElement>("[data-city]")].map((node) => {
        const c = cities.find((item) => item.key === node.dataset.city);
        return { node, x: c?.x ?? 0, y: c?.y ?? 0 };
      });
      const streetNodes = [...el.querySelectorAll<HTMLElement>("[data-street]")].map((node) => ({
        line: node.querySelector<HTMLElement>("[data-street-line]"),
        label: node.querySelector<HTMLElement>("[data-street-label]"),
        x0: Number(node.dataset.x0),
        y0: Number(node.dataset.y0),
        x1: Number(node.dataset.x1),
        y1: Number(node.dataset.y1),
        node,
      }));
      const spotNodes = [...el.querySelectorAll<HTMLElement>("[data-spot]")].map((node) => ({
        node,
        x: Number(node.dataset.x),
        y: Number(node.dataset.y),
      }));

      let w = 1;
      let h = 1;
      let lat = 40;
      const view: View = frame(allBox, 1, 1);
      let target: MapCity | null = null;

      const render = () => {
        const k = Math.exp(view.lk);
        const ox = w / 2 - view.cx * k;
        const oy = h / 2 - view.cy * k;
        const lk = Math.min(k, LAND_MAX_K);
        const lx = w / 2 - view.cx * lk;
        const ly = h / 2 - view.cy * lk;
        write(land, "transform", `translate(${lx.toFixed(2)}px, ${ly.toFixed(2)}px) scale(${lk})`);
        write(land, "opacity", (1 - fade(k, LAND_FADE)).toFixed(3));
        const spotsIn = fade(k, SPOT_FADE);
        for (const { node, x, y } of cityNodes) {
          write(
            node,
            "transform",
            `translate(${(x * k + ox).toFixed(1)}px, ${(y * k + oy).toFixed(1)}px)`,
          );
          write(node, "opacity", (1 - spotsIn).toFixed(3));
          write(node, "visibility", spotsIn > 0.98 ? "hidden" : "visible");
        }
        for (const { node, x, y } of spotNodes) {
          write(
            node,
            "transform",
            `translate(${(x * k + ox).toFixed(1)}px, ${(y * k + oy).toFixed(1)}px)`,
          );
          write(node, "opacity", spotsIn.toFixed(3));
          write(node, "visibility", spotsIn < 0.02 ? "hidden" : "visible");
        }
        for (const s of streetNodes) {
          const ax = s.x0 * k + ox;
          const ay = s.y0 * k + oy;
          const bx = s.x1 * k + ox;
          const by = s.y1 * k + oy;
          const len = Math.hypot(bx - ax, by - ay);
          let angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
          write(s.node, "opacity", spotsIn.toFixed(3));
          write(s.node, "visibility", spotsIn < 0.02 ? "hidden" : "visible");
          if (s.line) {
            write(
              s.line,
              "transform",
              `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px) rotate(${angle.toFixed(2)}deg) scaleX(${(len / STREET_PX).toFixed(4)})`,
            );
          }
          if (s.label) {
            // Rotulo legible (nunca boca abajo) y hacia fuera, pasado el extremo de la calle:
            // asi no pisa las etiquetas de las tiendas.
            const flip = angle > 90 || angle < -90;
            const [lx, ly] = flip ? [ax, ay] : [bx, by];
            if (angle > 90) angle -= 180;
            else if (angle < -90) angle += 180;
            write(
              s.label,
              "transform",
              `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px) rotate(${angle.toFixed(2)}deg)`,
            );
          }
        }
        const meters = metersPerUnit(lat);
        write(scaleBar, "transform", `scaleX(${((SCALE_M / meters) * k) / SCALE_PX})`);
        write(scale, "opacity", spotsIn.toFixed(3));
        scaleText.textContent = `${SCALE_M} M`;
      };

      const goal = (c: MapCity | null): View => {
        if (!c) return frame(allBox, w, h);
        const minSpan = CITY_MIN_SPAN_M / metersPerUnit(c.stores[0]?.lat ?? 40);
        return frame(c.box, w, h, minSpan);
      };

      const measure = () => {
        w = Math.max(1, stage.clientWidth);
        h = Math.max(1, stage.clientHeight);
        Object.assign(view, goal(target));
        render();
      };

      let tween: gsap.core.Tween | null = null;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
      goRef.current = (c) => {
        target = c;
        if (c) lat = c.stores[0]?.lat ?? lat;
        tween?.kill();
        const to = goal(c);
        if (reduce.matches) {
          Object.assign(view, to);
          render();
          return;
        }
        // Sube y baja en escala logarítmica: un vuelo de Europa a una calle no se nota a saltos.
        stage.style.willChange = "transform";
        tween = gsap.to(view, {
          ...to,
          duration: 1.4,
          ease: "expo.inOut",
          onUpdate: render,
          onComplete: () => {
            stage.style.willChange = "";
          },
        });
      };

      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(stage);

      // Entrada: titular y puntos cuando la sección asoma (el bucle solo corre cerca de ella).
      const unsubscribe = subscribe(
        () => {
          const top = el.getBoundingClientRect().top;
          el.toggleAttribute("data-in", top < window.innerHeight * 0.75);
        },
        el,
        "0px 0px 0px 0px",
      );

      return () => {
        tween?.kill();
        unsubscribe();
        observer.disconnect();
      };
    },
    { scope: root, dependencies: [cities, allBox] },
  );

  const choose = (next: MapCity | null) => {
    setCityKey(next?.key ?? null);
    setHot(null);
    if (next) track("explora_store_city", { city: next.name });
    goRef.current(next);
  };

  const total = stores.length;
  // Etiquetas a izquierda y derecha alternas (de norte a sur) para que no se pisen en una calle.
  const spots = cities.flatMap((c) =>
    c.spots.map((spot, i) => ({ city: c, spot, side: i % 2 === 0 ? "right" : "left" })),
  );

  return (
    <section
      ref={root}
      id="tiendas"
      className={styles.tiendas}
      data-scramble-in
      aria-labelledby="tiendas-title"
    >
      <header className={styles.head}>
        <span className={styles.label}>
          <ScrambleText text="A — 6 · Tiendas" />
        </span>
        <span className={styles.label}>
          <ScrambleText
            text={`${total} ${total === 1 ? "tienda" : "tiendas"} · ${cities.length} ${cities.length === 1 ? "ciudad" : "ciudades"}`}
          />
        </span>
      </header>

      <DisplayTitle id="tiendas-title" lines={[["EN", "*PERSONA"]]} className={styles.title} />

      <div className={styles.body}>
        <div className={styles.panel}>
          {city ? (
            <div className={styles.detail} key={city.key}>
              <button
                type="button"
                className={`${button.text} ${styles.back}`}
                onClick={() => choose(null)}
              >
                ← Todas las ciudades
              </button>
              <h3 className={styles.cityName}>{city.name}</h3>
              <p className={styles.cityMeta}>
                {city.country ? `${city.country} · ` : ""}
                {city.stores.length} {city.stores.length === 1 ? "tienda" : "tiendas"}
              </p>
              <ul className={styles.stores}>
                {city.stores.map((store) => (
                  <li
                    key={store.id}
                    className={styles.store}
                    data-hot={hot === store.id || undefined}
                    onPointerEnter={() => setHot(store.id)}
                    onPointerLeave={() => setHot(null)}
                  >
                    <span className={styles.storeBrand}>{store.brandName}</span>
                    <span className={styles.storeAddress}>
                      {store.name && store.name !== store.city ? `${store.name} · ` : ""}
                      {store.address}
                    </span>
                    <a
                      className={styles.directions}
                      href={directionsUrl(store)}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-track="store_directions"
                      data-track-brand={store.brandName}
                      onFocus={() => setHot(store.id)}
                      onBlur={() => setHot(null)}
                    >
                      Cómo llegar ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className={styles.cities}>
              {cities.map((c, i) => (
                <li key={c.key}>
                  <button
                    type="button"
                    className={styles.cityRow}
                    onClick={() => choose(c)}
                    onPointerEnter={() => setHot(c.key)}
                    onPointerLeave={() => setHot(null)}
                    onFocus={() => setHot(c.key)}
                    onBlur={() => setHot(null)}
                    data-hot={hot === c.key || undefined}
                  >
                    <span className={styles.cityNum}>{pad(i + 1, 2)}</span>
                    <span className={styles.cityRowName}>{c.name}</span>
                    <span className={styles.cityCount}>{c.stores.length}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={styles.map} data-map aria-hidden="true">
          <svg
            className={styles.land}
            data-land
            viewBox={`0 0 ${MAP_W} ${MAP_H}`}
            width={MAP_W}
            height={MAP_H}
            aria-hidden="true"
          >
            <path className={styles.landShape} d={LAND} />
            <path className={styles.borders} d={BORDERS} />
          </svg>

          {cities.map((c) => (
            <button
              key={c.key}
              type="button"
              tabIndex={-1}
              className={styles.cityDot}
              data-city={c.key}
              data-hot={hot === c.key || undefined}
              onClick={() => choose(c)}
            >
              <span className={styles.dot} />
              <span className={styles.cityDotLabel}>
                {c.name} <span className={styles.cityDotCount}>{c.stores.length}</span>
              </span>
            </button>
          ))}

          {cities.flatMap((c) =>
            c.streets.map((street) => (
              <div
                key={`${c.key}-${street.key}`}
                className={styles.street}
                data-street
                data-x0={street.x0}
                data-y0={street.y0}
                data-x1={street.x1}
                data-y1={street.y1}
              >
                <span className={styles.streetLine} data-street-line />
                <span className={styles.streetLabel} data-street-label>
                  <span>{street.name}</span>
                </span>
              </div>
            )),
          )}

          {spots.map(({ city: c, spot, side }) => (
            <div
              key={spot.key}
              className={styles.spot}
              data-spot
              data-x={spot.x}
              data-y={spot.y}
              data-side={side}
              data-hot={spot.stores.some((s) => s.id === hot) || undefined}
              data-other={c.key !== cityKey || undefined}
            >
              <span className={styles.spotDot} />
              <span className={styles.spotLabel}>
                {spot.stores.map((s) => (
                  <span key={s.id} className={styles.spotBrand}>
                    {s.brandName}
                  </span>
                ))}
              </span>
            </div>
          ))}

          <div className={styles.scale} data-scale>
            <span className={styles.scaleTrack}>
              <span className={styles.scaleBar} data-scale-bar />
            </span>
            <span className={styles.scaleText} data-scale-text />
          </div>
        </div>
      </div>
    </section>
  );
}
