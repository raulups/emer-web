"use client";

import {
  type ReactNode,
  type SyntheticEvent,
  type TransitionEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { lockScroll } from "@/lib/motion/scroll";
import styles from "./bottom-sheet.module.css";

/** Si la transición de cierre no llega a terminar (pestaña oculta…), se cierra igual. */
const CLOSE_FALLBACK_MS = 1200;

type Phase = "hidden" | "open" | "closing";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Cabecera pequeña en mayúsculas espaciadas; también es el nombre accesible si no hay `labelledBy`. */
  title: string;
  labelledBy?: string;
  describedBy?: string;
  /** Acciones fijas al pie (no se desplazan con el contenido). */
  footer?: ReactNode;
  children: ReactNode;
};

/**
 * Hoja inferior modal (`<dialog>` nativo: página inerte detrás y Escape). Entra y sale con
 * `transform`; con «reducir movimiento», sin animar. El contenido hace scroll propio (táctil y
 * rueda: `data-lenis-prevent`) mientras la página queda bloqueada.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  labelledBy,
  describedBy,
  footer,
  children,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("hidden");
  const titleId = useId();

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        el.showModal();
        // El foco empieza en la hoja (sin marcar ningún botón); Tab entra en sus controles.
        el.focus();
      }
      setPhase("open");
    } else if (el.open) {
      setPhase("closing");
    }
  }, [open]);

  useEffect(() => {
    if (phase === "hidden") return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [phase]);

  const finish = () => {
    dialog.current?.close();
    setPhase("hidden");
  };

  useEffect(() => {
    if (phase !== "closing") return;
    const timer = window.setTimeout(finish, CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  });

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  const onTransitionEnd = (event: TransitionEvent<HTMLDialogElement>) => {
    if (
      phase === "closing" &&
      event.target === event.currentTarget &&
      event.propertyName === "transform"
    ) {
      finish();
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape llega por `cancel`; el clic es el del fondo
    <dialog
      ref={dialog}
      className={styles.sheet}
      aria-labelledby={labelledBy ?? titleId}
      aria-describedby={describedBy}
      data-closing={phase === "closing" || undefined}
      data-lenis-prevent
      tabIndex={-1}
      onCancel={onCancel}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onTransitionEnd={onTransitionEnd}
    >
      <div className={styles.head}>
        <p id={titleId} className={styles.title}>
          {title}
        </p>
        <button type="button" className={styles.close} aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
