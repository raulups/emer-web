import { subscribe } from "./ticker";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-=/<>";

/** Duración total (s) y cada cuánto cambia una letra aleatoria (s), como en signal-a.studio. */
const DURATION = 0.42;
const SWAP = 0.045;

const random = () => CHARS.charAt(Math.floor(Math.random() * CHARS.length));
const blank = (char: string) => char.trim() === "";

/**
 * Baraja el texto de varios nodos como si fueran uno y lo asienta de izquierda a derecha: todas
 * las letras empiezan aleatorias y cada una se fija entre la mitad y el final de la animación. Los
 * espacios no se tocan. Escribe en los `Text` (sin estado de React) sobre el reloj único y devuelve
 * la cancelación, que no toca el texto: quien cancela decide cuál queda (React puede haberlo
 * cambiado ya).
 */
export function scrambleNodes(nodes: readonly Text[], texts: readonly string[]): () => void {
  const parts = texts.map((text) => [...text]);
  const n = parts.reduce((sum, chars) => sum + chars.length, 0);
  if (n === 0) return () => {};
  let elapsed = 0;
  let lastSwap = -SWAP;

  const render = (final: boolean) => {
    let k = 0;
    nodes.forEach((node, j) => {
      const chars = parts[j] ?? [];
      const next = chars
        .map((char) => {
          const settle = DURATION / 2 + (n > 1 ? (k++ / (n - 1)) * (DURATION / 2) : 0);
          return final || blank(char) || elapsed >= settle ? char : random();
        })
        .join("");
      if (node.data !== next) node.data = next;
    });
  };

  const unsubscribe = subscribe((_time, deltaMs) => {
    elapsed += deltaMs / 1000;
    if (elapsed >= DURATION) {
      unsubscribe();
      render(true);
      return;
    }
    if (elapsed - lastSwap < SWAP) return;
    lastSwap = elapsed;
    render(false);
  });

  return unsubscribe;
}

/** `scrambleNodes` para un solo nodo de texto. */
export function scramble(node: Text, text: string): () => void {
  return scrambleNodes([node], [text]);
}
