export type CursorState = "default" | "link" | "prod" | "drag" | "hero" | "type";

type Listener = (override: CursorState | null) => void;

const listeners = new Set<Listener>();
let override: CursorState | null = null;

/** API imperativa para las secciones (p. ej. el hero fija `drag` mientras se arrastra). */
export const cursor = {
  set(state: CursorState) {
    if (override === state) return;
    override = state;
    for (const l of listeners) l(override);
  },
  clear() {
    if (override === null) return;
    override = null;
    for (const l of listeners) l(override);
  },
};

export function onCursorOverride(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCursorOverride(): CursorState | null {
  return override;
}
