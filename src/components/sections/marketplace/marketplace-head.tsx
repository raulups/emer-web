import { LoopLine } from "@/components/ui/loop-line";
import { LINKS } from "@/lib/config/links";
import s from "./marketplace.module.css";

/** Cabecera común a la sección y a su hueco de carga (misma geometría). La pista cambia por CSS. */
export function MarketplaceHead({ withHint }: { withHint: boolean }) {
  return (
    <header className={s.head}>
      <div className={s.headText}>
        <p className={s.eyebrow}>MARKETPLACE</p>
        <h2 id="mk-title" className={s.title}>
          Todas las
          <br />
          prendas
        </h2>
      </div>
      {withHint && (
        <p className={s.hint}>
          <span className={s.hintFine}>Pon el cursor encima y haz scroll para girarlo.</span>
          <span className={s.hintTouch}>Desliza sobre las prendas para girarlo.</span>
          <span className={s.hintReduced}>Desliza cada fila para ver más prendas.</span>
        </p>
      )}
    </header>
  );
}

/** CTA inferior. Sin destino todavía (`LINKS.marketplace`): texto, sin enlace muerto. */
export function MarketplaceCta() {
  return (
    <div className={s.ctaWrap}>
      {LINKS.marketplace ? (
        <a className={s.cta} href={LINKS.marketplace}>
          IR AL MARKETPLACE <LoopLine width={44} />
        </a>
      ) : (
        <span className={s.cta}>
          IR AL MARKETPLACE <LoopLine width={44} />
        </span>
      )}
    </div>
  );
}
