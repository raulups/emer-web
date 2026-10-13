import styles from "./view-placeholder.module.css";

type Props = {
  title: string;
  /** Explora es a sangre y ocupa la pantalla completa. */
  fullBleed?: boolean;
};

/** Hueco provisional de Marketplace / Explora hasta implementar cada vista. */
export function ViewPlaceholder({ title, fullBleed = false }: Props) {
  return (
    <section
      className={styles.placeholder}
      data-full-bleed={fullBleed || undefined}
      data-placeholder={title.toLowerCase()}
      aria-labelledby={`placeholder-${title.toLowerCase()}`}
    >
      <h1 id={`placeholder-${title.toLowerCase()}`} className={styles.title}>
        {title}
      </h1>
      <p className={styles.note}>Próximamente</p>
    </section>
  );
}
