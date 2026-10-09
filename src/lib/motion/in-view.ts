type Callback = (visible: boolean) => void;

const callbacks = new Map<Element, Set<Callback>>();
const state = new WeakMap<Element, boolean>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          state.set(entry.target, entry.isIntersecting);
          for (const cb of callbacks.get(entry.target) ?? []) cb(entry.isIntersecting);
        }
      },
      { rootMargin: "10% 0px", threshold: 0 },
    );
  }
  return observer;
}

/** Un único IntersectionObserver compartido por toda la web. */
export function observe(el: Element, cb: Callback): () => void {
  let set = callbacks.get(el);
  if (!set) {
    set = new Set();
    callbacks.set(el, set);
    getObserver().observe(el);
  }
  set.add(cb);

  const known = state.get(el);
  if (known !== undefined) cb(known);

  return () => {
    const current = callbacks.get(el);
    if (!current) return;
    current.delete(cb);
    if (current.size === 0) {
      callbacks.delete(el);
      state.delete(el);
      observer?.unobserve(el);
    }
  };
}
