import { K, MAP_H, MAP_W, TX, TY } from "@/lib/geo/europe";

/**
 * Tiendas físicas de las marcas para el mapa de Explora. Puro: lo usan el servidor (datos), el
 * cliente (mapa) y los tests.
 */

export type MapStore = {
  id: string;
  brandId: string;
  brandName: string;
  logo: string | null;
  /** Nombre de la tienda («Flagship Madrid»); si falta, se enseña la dirección. */
  name: string | null;
  address: string;
  city: string;
  country: string | null;
  lat: number;
  lng: number;
  placeId: string | null;
};

/** Tiendas que comparten local (misma dirección en el mapa): una marca por línea. */
export type MapSpot = {
  key: string;
  x: number;
  y: number;
  stores: MapStore[];
};

/** Calle con dos o más locales: una línea de norte a sur que da contexto en la vista de ciudad. */
export type MapStreet = {
  key: string;
  name: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type MapCity = {
  key: string;
  name: string;
  country: string | null;
  x: number;
  y: number;
  stores: MapStore[];
  spots: MapSpot[];
  streets: MapStreet[];
  /** Caja de sus tiendas en coordenadas del mapa: [x0, y0, x1, y1]. */
  box: [number, number, number, number];
};

const RAD = Math.PI / 180;

/** Mercator con las mismas constantes que las siluetas de `lib/geo/europe.ts`. */
export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: K * lng * RAD + TX,
    y: TY - K * Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2)),
  };
}

export const inMap = (p: { x: number; y: number }) =>
  p.x >= 0 && p.x <= MAP_W && p.y >= 0 && p.y <= MAP_H;

/** Clave de ciudad: sin acentos ni mayúsculas («València» y «Valencia» son la misma). */
export function cityKey(city: string): string {
  return city.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

/** Nombres que la base trae en el idioma local y en la web se leen en español. */
const CITY_NAMES: Record<string, string> = {
  eivissa: "Ibiza",
  milano: "Milán",
  lisboa: "Lisboa",
  london: "Londres",
  antwerpen: "Amberes",
  gent: "Gante",
  roma: "Roma",
  "santa agnes de malanyanes": "La Roca Village",
  "las rozas de madrid": "Las Rozas",
};

export function cityName(city: string): string {
  return CITY_NAMES[cityKey(city)] ?? city.trim();
}

/**
 * Agrupa por ciudad (de más a menos tiendas) y, dentro, por local: dos marcas en el mismo número
 * salen juntas en el mismo punto. Las que caen fuera del mapa (otro continente) se descartan.
 */
export function groupByCity(stores: readonly MapStore[]): MapCity[] {
  const cities = new Map<string, MapStore[]>();
  for (const store of stores) {
    if (!inMap(project(store.lat, store.lng))) continue;
    const key = cityKey(cityName(store.city));
    cities.set(key, [...(cities.get(key) ?? []), store]);
  }
  return [...cities.entries()]
    .map(([key, list]) => {
      const sorted = [...list].sort(
        (a, b) => b.lat - a.lat || a.brandName.localeCompare(b.brandName, "es"),
      );
      const spots = new Map<string, MapSpot>();
      for (const store of sorted) {
        const p = project(store.lat, store.lng);
        const spotKey = `${p.x.toFixed(3)}|${p.y.toFixed(3)}`;
        const spot = spots.get(spotKey) ?? { key: spotKey, x: p.x, y: p.y, stores: [] };
        spot.stores.push(store);
        spots.set(spotKey, spot);
      }
      const points = [...spots.values()];
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const box: MapCity["box"] = [
        Math.min(...xs),
        Math.min(...ys),
        Math.max(...xs),
        Math.max(...ys),
      ];
      const streets = streetsOf(points);
      const first = sorted[0] as MapStore;
      return {
        key,
        name: cityName(first.city),
        country: first.country,
        x: (box[0] + box[2]) / 2,
        y: (box[1] + box[3]) / 2,
        stores: sorted,
        spots: points,
        streets,
        box,
      };
    })
    .sort((a, b) => b.stores.length - a.stores.length || a.name.localeCompare(b.name, "es"));
}

/** Calle sin el número: «Calle de Fuencarral, 74» y «Calle de Fuencarral 18» son la misma. */
export function streetOf(address: string): string {
  return address
    .replace(/[,\s]+\d+\s*[a-z]?$/i, "")
    .replace(/^\d+[a-z]?\s+/i, "")
    .trim();
}

/** Prolonga un poco cada calle por sus dos extremos para que se lea como calle y no como tramo. */
const STREET_EXTEND = 0.35;

function streetsOf(spots: readonly MapSpot[]): MapStreet[] {
  const byStreet = new Map<string, { name: string; spots: MapSpot[] }>();
  for (const spot of spots) {
    const first = spot.stores[0];
    if (!first) continue;
    const name = streetOf(first.address);
    const key = cityKey(name);
    const entry = byStreet.get(key) ?? { name, spots: [] };
    entry.spots.push(spot);
    byStreet.set(key, entry);
  }
  return [...byStreet.entries()].flatMap(([key, { name, spots: list }]) => {
    if (list.length < 2) return [];
    const sorted = [...list].sort((a, b) => a.y - b.y || a.x - b.x);
    const a = sorted[0] as MapSpot;
    const b = sorted.at(-1) as MapSpot;
    const dx = (b.x - a.x) * STREET_EXTEND;
    const dy = (b.y - a.y) * STREET_EXTEND;
    return [{ key, name, x0: a.x - dx, y0: a.y - dy, x1: b.x + dx, y1: b.y + dy }];
  });
}

/** «Cómo llegar»: Google Maps con el punto y, si se conoce, la ficha del sitio. */
export function directionsUrl(store: Pick<MapStore, "lat" | "lng" | "placeId">): string {
  const params = new URLSearchParams({ api: "1", destination: `${store.lat},${store.lng}` });
  if (store.placeId) params.set("destination_place_id", store.placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Metros por unidad del mapa a una latitud (Mercator estira hacia los polos). */
export function metersPerUnit(lat: number): number {
  return (6_378_137 * Math.cos(lat * RAD)) / K;
}
