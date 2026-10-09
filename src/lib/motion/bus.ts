import type { SectionId } from "@/lib/config/sections";

export type BusEvents = {
  "emer:loaded": undefined;
  "emer:search:open": undefined;
  "emer:search:close": undefined;
  "hero:step": { dir: 1 | -1 };
  "section:change": { id: SectionId; label: string };
};

type EventName = keyof BusEvents;
type Handler<E extends EventName> = (payload: BusEvents[E]) => void;
type AnyHandler = (payload: unknown) => void;

const handlers = new Map<EventName, Set<AnyHandler>>();
let loaded = false;
let searchOpen = false;

function listeners(event: EventName): Set<AnyHandler> {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  return set;
}

export const bus = {
  /** `emer:loaded` es "pegajoso": si ya ocurrió, el handler se ejecuta al momento. */
  on<E extends EventName>(event: E, handler: Handler<E>): () => void {
    if (event === "emer:loaded" && loaded) {
      (handler as AnyHandler)(undefined);
      return () => {};
    }
    const set = listeners(event);
    set.add(handler as AnyHandler);
    return () => set.delete(handler as AnyHandler);
  },

  emit<E extends EventName>(
    event: E,
    ...args: BusEvents[E] extends undefined ? [] : [BusEvents[E]]
  ): void {
    if (event === "emer:loaded") {
      if (loaded) return;
      loaded = true;
    }
    if (event === "emer:search:open") searchOpen = true;
    if (event === "emer:search:close") searchOpen = false;

    for (const handler of [...listeners(event)]) {
      try {
        handler(args[0]);
      } catch (error) {
        console.error(`[bus] error en un handler de ${event}`, error);
      }
    }
  },

  onLoaded(handler: () => void): () => void {
    return bus.on("emer:loaded", handler);
  },

  isLoaded: (): boolean => loaded,

  isSearchOpen: (): boolean => searchOpen,
};
