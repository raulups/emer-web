import styles from "./no-stock.module.css";

type Props = {
  /** `paper`: sobre blanco. `dark`: sobre el negro de Populares. `overlay`: sobre una foto. */
  tone?: "paper" | "dark" | "overlay";
  className?: string;
};

/** Aviso para una marca sin piezas de vista previa (el inventario aún no ha llegado). */
export function NoStock({ tone = "paper", className }: Props) {
  return (
    <p className={`${styles.box} ${className ?? ""}`} data-variant={tone}>
      <span className={styles.title}>Inventario en camino</span>
      <span className={styles.text}>
        Esta marca aún no nos ha pasado su ropa. Les estamos dando la lata: vuelve en nada.
      </span>
    </p>
  );
}
