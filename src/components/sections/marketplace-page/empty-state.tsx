import { RetryButton } from "@/components/ui/retry-button";
import s from "./marketplace-page.module.css";

type Props = { kind: "filters"; onReset: () => void } | { kind: "none" } | { kind: "error" };

/** Sin resultados: por filtros, catálogo vacío o error de `/products`. */
export function EmptyState(props: Props) {
  const text =
    props.kind === "filters"
      ? "Ninguna prenda cumple estos filtros."
      : props.kind === "none"
        ? "Todavía no hay prendas en el escaparate."
        : "No hemos podido cargar las prendas.";
  return (
    <div
      className={s.empty}
      data-testid="mk-empty"
      role={props.kind === "error" ? "alert" : undefined}
    >
      {/* biome-ignore lint/performance/noImgElement: imagen local fija de 150×150 */}
      <img src="/assets/loader/gato-error.webp" width={150} height={150} alt="" />
      <h2>NADA POR AQUÍ</h2>
      <p>{text}</p>
      {props.kind === "filters" && (
        <button type="button" className={s.emptyBtn} onClick={props.onReset}>
          Borrar filtros
        </button>
      )}
      {props.kind === "error" && <RetryButton className={s.emptyBtn} subject="prendas" />}
    </div>
  );
}
