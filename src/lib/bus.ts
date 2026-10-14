import type { Filters } from "@/lib/marketplace";

/** Eventos entre secciones (regla 11 de CLAUDE.md). */
type Events = {
  /** Cambiar de vista en el Shell (mismo efecto que el switch del topbar). */
  view: "market" | "explora";
  /** Filtros con los que debe abrir el Marketplace (se aplican al montarse). */
  "market:filters": Partial<Filters>;
  /** Llevar la vista hasta el formulario de Sugerir marca. */
  "suggest:open": null;
};

type Listener<K extends keyof Events> = (payload: Events[K]) => void;

const listeners = new Map<keyof Events, Set<Listener<never>>>();
// Un evento sin nadie escuchando se guarda (el último) y se entrega al primero que se suscriba:
// así el Marketplace recibe sus filtros aunque aún no esté montado.
const pending = new Map<keyof Events, unknown>();

export const bus = {
  on<K extends keyof Events>(type: K, listener: Listener<K>): () => void {
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    set.add(listener as Listener<never>);
    if (pending.has(type)) {
      const payload = pending.get(type) as Events[K];
      pending.delete(type);
      listener(payload);
    }
    return () => {
      set.delete(listener as Listener<never>);
    };
  },
  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = listeners.get(type);
    if (!set || set.size === 0) {
      pending.set(type, payload);
      return;
    }
    for (const listener of set) (listener as Listener<K>)(payload);
  },
};
