import s from "./marketplace-page.module.css";
import { TopRow } from "./top-row";

const CATS = Array.from({ length: 12 }, (_, i) => i);
const CARDS = Array.from({ length: 8 }, (_, i) => i);

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <>
      {(count === 8 ? CARDS : Array.from({ length: count }, (_, i) => i)).map((i) => (
        <li key={i} className={s.cell} aria-hidden="true">
          <div className={s.skelCard}>
            <div className={s.skelMedia} />
            <div className={s.skelBar} />
          </div>
        </li>
      ))}
    </>
  );
}

/** Hueco con la misma geometría mientras llegan los datos (categorías, barra y 8 esqueletos). */
export function MarketplaceFallback() {
  return (
    <div className={s.page} data-testid="mk-page" data-loading="">
      <TopRow />
      <main id="contenido" tabIndex={-1} className={s.main} aria-busy="true">
        <h1 className="sr-only">Marketplace</h1>
        <div className={s.cats}>
          {CATS.map((i) => (
            <span key={i} className={s.catSkel} aria-hidden="true" />
          ))}
        </div>
        <div className={s.bar}>
          <div className={s.barGrid}>
            <div className={s.barLeft} />
            <div className={s.countCell}>
              <p className={s.countText}>— PIEZAS</p>
            </div>
            <div className={s.sortBtn} />
          </div>
        </div>
        <ul className={s.grid} data-cols="4">
          <GridSkeleton />
        </ul>
      </main>
    </div>
  );
}
