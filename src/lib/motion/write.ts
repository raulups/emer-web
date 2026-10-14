const written = new WeakMap<HTMLElement, Map<string, string>>();

/** Escribe un estilo en el DOM solo si cambió desde la última vez (sin re-render ni layout). */
export function write(el: HTMLElement, prop: string, value: string): void {
  let props = written.get(el);
  if (!props) {
    props = new Map();
    written.set(el, props);
  }
  if (props.get(prop) === value) return;
  props.set(prop, value);
  el.style.setProperty(prop, value);
}

/** Texto de un nodo, solo si cambió. */
export function writeText(el: HTMLElement, value: string): void {
  if (el.textContent !== value) el.textContent = value;
}
