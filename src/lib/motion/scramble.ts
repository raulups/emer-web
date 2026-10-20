import { subscribe } from "./ticker";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+-=/<>";

/** Duración total (s) y cada cuánto cambia una letra aleatoria (s), como en signal-a.studio. */
const DURATION = 0.42;
const SWAP = 0.045;

const random = () => CHARS.charAt(Math.floor(Math.random() * CHARS.length));

/**
 * Baraja el texto de un nodo y lo asienta de izquierda a derecha: todas las letras empiezan
 * aleatorias y cada una se fija entre la mitad y el final de la animación. Los espacios no se
 * tocan. Escribe en el `Text` (sin estado de React) sobre el reloj único y devuelve la cancelación,
 * que no toca el texto: quien cancela decide cuál queda (React puede haberlo cambiado ya).
 */
export function scramble(node: Text, text: string): () => void {
  const chars = [...text];
  const n = chars.length;
  if (n === 0) return () => {};
  const settle = chars.map((_, i) => DURATION / 2 + (n > 1 ? (i / (n - 1)) * (DURATION / 2) : 0));
  let elapsed = 0;
  let lastSwap = -SWAP;

  const unsubscribe = subscribe((_time, deltaMs) => {
    elapsed += deltaMs / 1000;
    if (elapsed >= DURATION) {
      unsubscribe();
      if (node.data !== text) node.data = text;
      return;
    }
    if (elapsed - lastSwap < SWAP) return;
    lastSwap = elapsed;
    node.data = chars
      .map((char, i) => (char === " " || elapsed >= (settle[i] ?? 0) ? char : random()))
      .join("");
  });

  return unsubscribe;
}
