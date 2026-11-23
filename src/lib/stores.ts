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

/** Tiendas que comparten local (misma posición): una marca por línea. */
export type MapSpot = {
  key: string;
  lng: number;
  lat: number;
  stores: MapStore[];
};

/** Caja en [oeste, sur, este, norte] (lng/lat), lista para `fitBounds`. */
export type Bounds = [number, number, number, number];

export type MapCity = {
  key: string;
  name: string;
  country: string | null;
  lng: number;
  lat: number;
  stores: MapStore[];
  spots: MapSpot[];
  bounds: Bounds;
};

/** Europa ampliada: lo de fuera (otro continente) no entra en el mapa. */
const EUROPE: Bounds = [-32, 27, 45, 72];

export const inEurope = ({ lat, lng }: { lat: number; lng: number }) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lng >= EUROPE[0] &&
  lat >= EUROPE[1] &&
  lng <= EUROPE[2] &&
  lat <= EUROPE[3];

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

export function boundsOf(points: readonly { lng: number; lat: number }[]): Bounds {
  const lngs = points.map((p) => p.lng);
  const lats = points.map((p) => p.lat);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}

/**
 * Agrupa por ciudad (de más a menos tiendas) y, dentro, por local: dos marcas en el mismo número
 * salen juntas en el mismo punto. Las que caen fuera de Europa se descartan.
 */
export function groupByCity(stores: readonly MapStore[]): MapCity[] {
  const cities = new Map<string, MapStore[]>();
  for (const store of stores) {
    if (!inEurope(store)) continue;
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
        const spotKey = `${store.lat.toFixed(5)}|${store.lng.toFixed(5)}`;
        const spot = spots.get(spotKey) ?? {
          key: spotKey,
          lng: store.lng,
          lat: store.lat,
          stores: [],
        };
        spot.stores.push(store);
        spots.set(spotKey, spot);
      }
      const points = [...spots.values()];
      const bounds = boundsOf(points);
      const first = sorted[0] as MapStore;
      return {
        key,
        name: cityName(first.city),
        country: first.country,
        lng: (bounds[0] + bounds[2]) / 2,
        lat: (bounds[1] + bounds[3]) / 2,
        stores: sorted,
        spots: points,
        bounds,
      };
    })
    .sort((a, b) => b.stores.length - a.stores.length || a.name.localeCompare(b.name, "es"));
}

/** «Cómo llegar»: Google Maps con el punto y, si se conoce, la ficha del sitio. */
export function directionsUrl(store: Pick<MapStore, "lat" | "lng" | "placeId">): string {
  const params = new URLSearchParams({ api: "1", destination: `${store.lat},${store.lng}` });
  if (store.placeId) params.set("destination_place_id", store.placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
