import { ScrambleText } from "@/components/ui/scramble-text";
import styles from "./no-stock.module.css";

type Props = {
  /** `paper`: sobre blanco. `dark`: sobre el negro de Populares. `overlay`: sobre una foto. */
  tone?: "paper" | "dark" | "overlay";
  className?: string;
};

/** Aviso para una marca sin piezas de vista previa (el inventario aún no ha llegado). Entra barajando. */
export function NoStock({ tone = "paper", className }: Props) {
  return (
    <p className={`${styles.box} ${className ?? ""}`} data-variant={tone}>
      <ScrambleText className={styles.title} text="Inventario en camino" />
      <ScrambleText
        className={styles.text}
        text="Esta marca aún no nos ha pasado su ropa. Les estamos dando la lata: vuelve en nada."
      />
    </p>
  );
}
