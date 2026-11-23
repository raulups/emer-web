"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import button from "@/components/ui/button.module.css";
import { DisplayTitle } from "@/components/ui/display-title";
import { ScrambleText } from "@/components/ui/scramble-text";
import { track } from "@/lib/analytics";
import { pad } from "@/lib/motion/math";
import { subscribe } from "@/lib/motion/ticker";
import {
  type Bounds,
  boundsOf,
  directionsUrl,
  groupByCity,
  type MapCity,
  type MapStore,
} from "@/lib/stores";
import styles from "./tiendas.module.css";

type Props = { stores: readonly MapStore[] };

/** Estilo vectorial claro de OpenFreeMap: gratis, sin clave ni límite de visitas. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";
/** Worker de MapLibre servido desde `public/` (lo copia `scripts/copy-maplibre-worker.mjs`). */
const WORKER_URL = "/vendor/maplibre-gl-worker.mjs";
/** Zoom a partir del cual los puntos de ciudad dan paso a las tiendas. */
const SPOTS_ZOOM = 9;
/** Lo más que se acerca al encuadrar una ciudad (con una sola tienda no baja hasta el portal). */
const CITY_MAX_ZOOM = 15.5;
const OVERVIEW_MAX_ZOOM = 6;
const FLY_MS = 1600;

const LOCALE = {
  "NavigationControl.ZoomIn": "Acercar",
  "NavigationControl.ZoomOut": "Alejar",
  "NavigationControl.ResetBearing": "Orientar al norte",
  "AttributionControl.ToggleAttribution": "Créditos del mapa",
  "CooperativeGesturesHandler.WindowsHelpText": "Ctrl + rueda para hacer zoom",
  "CooperativeGesturesHandler.MacHelpText": "⌘ + rueda para hacer zoom",
  "CooperativeGesturesHandler.MobileHelpText": "Usa dos dedos para mover el mapa",
};

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string | undefined,
  text?: string,
) => {
  const node = document.createElement(tag);
  node.className = className ?? "";
  if (text !== undefined) node.textContent = text;
  return node;
};

/**
 * Tiendas físicas (Explora, tras Sugerir marca). A la izquierda, las ciudades; a la derecha, un mapa
 * real (MapLibre + OpenFreeMap) con un punto por ciudad. Al elegir una ciudad el mapa vuela hasta
 * ella, aparecen las tiendas con su marca y la lista pasa a ser la de esa ciudad, con «Cómo llegar».
 * El mapa se carga solo cuando la sección se acerca a la pantalla.
 */
export function Tiendas({ stores }: Props) {
  const root = useRef<HTMLElement>(null);
  const mapNode = useRef<HTMLDivElement>(null);
  const cities = useMemo(() => groupByCity(stores), [stores]);
  const [cityKey, setCityKey] = useState<string | null>(null);
  const [hot, setHot] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const city = cities.find((c) => c.key === cityKey) ?? null;

  const mapRef = useRef<MapLibreMap | null>(null);
  const markerNodes = useRef(new Map<string, HTMLElement[]>());
  const chooseRef = useRef<(c: MapCity | null, storeId?: string) => void>(() => {});
  const cityRef = useRef<MapCity | null>(null);
  cityRef.current = city;

  const allBounds = useMemo<Bounds | null>(() => {
    const spots = cities.flatMap((c) => c.spots);
    return spots.length > 0 ? boundsOf(spots) : null;
  }, [cities]);

  // Entrada del titular y de la sección (el bucle solo corre cerca de ella).
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    return subscribe(
      () => {
        node.toggleAttribute(
          "data-in",
          node.getBoundingClientRect().top < window.innerHeight * 0.75,
        );
      },
      node,
      "0px 0px 0px 0px",
    );
  }, []);

  // El mapa (WebGL + teselas) se crea al acercarse la sección: no pesa en la carga de Explora.
  useEffect(() => {
    const container = mapNode.current;
    if (!container || !allBounds) return;
    let cancelled = false;
    let map: MapLibreMap | null = null;
    const markers: Marker[] = [];
    const nodes = markerNodes.current;

    const create = async () => {
      const maplibre = await import("maplibre-gl");
      if (cancelled) return;
      maplibre.setWorkerUrl(new URL(WORKER_URL, window.location.origin).href);
      try {
        map = new maplibre.Map({
          container,
          style: MAP_STYLE,
          bounds: allBounds,
          fitBoundsOptions: { padding: 60, maxZoom: OVERVIEW_MAX_ZOOM },
          minZoom: 2,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          maxPitch: 0,
          renderWorldCopies: false,
          locale: LOCALE,
        });
      } catch {
        container.toggleAttribute("data-failed", true);
        return;
      }
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      const syncZoom = () => {
        if (map) container.toggleAttribute("data-zoomed", map.getZoom() >= SPOTS_ZOOM);
      };
      map.on("zoom", syncZoom);
      syncZoom();
      // Al cargar, encuadre exacto con el tamaño definitivo del marco.
      map.once("load", () => {
        const target = cityRef.current?.bounds ?? allBounds;
        map?.fitBounds(target, {
          padding: 60,
          maxZoom: cityRef.current ? CITY_MAX_ZOOM : OVERVIEW_MAX_ZOOM,
          duration: 0,
        });
      });

      const keep = (key: string, node: HTMLElement) => {
        nodes.set(key, [...(nodes.get(key) ?? []), node]);
      };

      for (const c of cities) {
        const cityEl = el("button", styles.cityMarker);
        cityEl.type = "button";
        cityEl.setAttribute("aria-label", `${c.name}, ${c.stores.length} tiendas`);
        cityEl.tabIndex = -1;
        const cityLabel = el("span", styles.cityMarkerLabel, `${c.name} `);
        cityLabel.append(el("span", styles.cityMarkerCount, String(c.stores.length)));
        cityEl.append(el("span", styles.dot), cityLabel);
        cityEl.addEventListener("click", () => chooseRef.current(c));
        keep(c.key, cityEl);
        markers.push(new maplibre.Marker({ element: cityEl }).setLngLat([c.lng, c.lat]).addTo(map));

        c.spots.forEach((spot, i) => {
          const spotEl = el("div", styles.spotMarker);
          spotEl.dataset.side = i % 2 === 0 ? "right" : "left";
          const label = el("span", styles.spotLabel);
          for (const s of spot.stores) label.append(el("span", styles.spotBrand, s.brandName));
          spotEl.append(el("span", styles.spotDot), label);
          spotEl.addEventListener("click", () => chooseRef.current(c, spot.stores[0]?.id));
          for (const s of spot.stores) keep(s.id, spotEl);
          markers.push(
            new maplibre.Marker({ element: spotEl })
              .setLngLat([spot.lng, spot.lat])
              .addTo(map as MapLibreMap),
          );
        });
      }
      setReady(true);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void create();
        }
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(container);

    return () => {
      cancelled = true;
      io.disconnect();
      for (const m of markers) m.remove();
      nodes.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [cities, allBounds]);

  // Resaltado compartido entre la lista y los marcadores.
  useEffect(() => {
    if (!ready) return;
    for (const [key, list] of markerNodes.current) {
      for (const node of list) node.toggleAttribute("data-hot", key === hot);
    }
  }, [hot, ready]);

  const choose = (next: MapCity | null, storeId?: string) => {
    setCityKey(next?.key ?? null);
    setHot(storeId ?? null);
    if (next && next.key !== cityKey) track("explora_store_city", { city: next.name });
    const map = mapRef.current;
    if (!map) return;
    const target = next?.bounds ?? allBounds;
    if (!target) return;
    map.fitBounds(target, {
      padding: 80,
      maxZoom: next ? CITY_MAX_ZOOM : OVERVIEW_MAX_ZOOM,
      duration: FLY_MS,
      linear: false,
    });
  };
  chooseRef.current = choose;

  const total = stores.length;

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

        <div className={styles.map} ref={mapNode} data-ready={ready || undefined} />
      </div>
    </section>
  );
}
