"use client";

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import { suggestBrand } from "@/app/actions/suggest";
import { LoopLine } from "@/components/ui/loop-line";
import { EASE, gsap, useGSAP } from "@/lib/gsap";
import { bus } from "@/lib/motion/bus";
import { scrollToSection } from "@/lib/motion/scroll";
import { trackSection } from "@/lib/motion/sections";
import s from "./sugiere.module.css";

type Phase = "edit" | "sent" | "error";

/** Límite en cliente: un envío cada 10 s. */
const MIN_INTERVAL = 10_000;

/** 07-sugiere: formulario de dos campos (basta con uno), envío por server action y sello. */
export function SugiereForm() {
  const [phase, setPhase] = useState<Phase>("edit");
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [word, setWord] = useState("");
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLSpanElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const lastSent = useRef(Number.NEGATIVE_INFINITY);
  const hasData = name.trim() !== "" || instagram.trim() !== "";

  useEffect(() => {
    const section = rootRef.current?.closest("section");
    if (!section) return;
    return trackSection(section, "sugiere");
  }, []);

  // Prellenado desde 09-buscar: `?sugiere=Nombre` o el evento `emer:suggest`.
  useEffect(() => {
    let timer: number | undefined;
    const prefill = (value: string) => {
      setPhase("edit");
      setName(value.slice(0, 32));
      scrollToSection("sugiere");
      window.clearTimeout(timer);
      timer = window.setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 50);
    };
    const fromUrl = new URLSearchParams(window.location.search).get("sugiere");
    if (fromUrl) prefill(fromUrl);
    const off = bus.on("emer:suggest", ({ name: value }) => prefill(value));
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, []);

  // Sello RECIBIDA: scale 2.4 → 1 con rebote + opacidad, ambos con 200 ms de retardo.
  useGSAP(
    () => {
      const stamp = stampRef.current;
      if (phase !== "sent" || !stamp) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(stamp, { rotation: -7 });
        gsap.fromTo(
          stamp,
          { scale: 2.4 },
          { scale: 1, duration: 0.45, ease: EASE.back, delay: 0.2 },
        );
        gsap.fromTo(stamp, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none", delay: 0.2 });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(stamp, { rotation: -7, scale: 1 });
        gsap.fromTo(stamp, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" });
      });
      againRef.current?.focus({ preventScroll: true });
    },
    { scope: rootRef, dependencies: [phase] },
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    if (!hasData) {
      nameRef.current?.focus();
      return;
    }
    const now = Date.now();
    if (now - lastSent.current < MIN_INTERVAL) {
      setPhase("error");
      return;
    }
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await suggestBrand(data);
      if (result.ok) {
        lastSent.current = now;
        setWord(result.word);
        setPhase("sent");
      } else {
        setPhase("error");
      }
    });
  };

  const again = () => {
    setName("");
    setInstagram("");
    setPhase("edit");
    window.setTimeout(() => nameRef.current?.focus(), 50);
  };

  return (
    <div ref={rootRef}>
      {/* Región viva fija (montada desde el principio): así el envío sí se anuncia. */}
      <p role="status" className="sr-only">
        {phase === "sent" ? `${word}: sugerencia recibida.` : ""}
      </p>
      {phase === "sent" ? (
        <div className={s.sent}>
          <p className={s.word}>{word}</p>
          <span ref={stampRef} className={s.stamp}>
            RECIBIDA
          </span>
          <button ref={againRef} type="button" className={s.again} onClick={again}>
            SUGERIR OTRA <LoopLine width={40} />
          </button>
        </div>
      ) : (
        <form className={s.form} noValidate onSubmit={onSubmit}>
          <div className={s.fields}>
            <label className={s.field}>
              <span className={s.label}>NOMBRE DE LA MARCA</span>
              <input
                ref={nameRef}
                name="name"
                maxLength={32}
                autoComplete="off"
                className={`${s.input} ${s.inputName}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.label}>INSTAGRAM</span>
              <input
                name="instagram"
                maxLength={60}
                autoComplete="off"
                inputMode="url"
                className={s.input}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
              />
            </label>
            <div className={s.honeypot} aria-hidden="true">
              <input name="hp_extra" tabIndex={-1} autoComplete="one-time-code" />
            </div>
          </div>
          {phase === "error" && (
            <p className={s.error} role="alert">
              No se ha podido enviar. Inténtalo otra vez.
            </p>
          )}
          <div className={s.actions}>
            <p className={s.note}>Con uno de los dos nos basta.</p>
            <button
              type="submit"
              className={s.send}
              data-ready={hasData ? "" : undefined}
              aria-disabled={!hasData || pending}
            >
              {pending ? "ENVIANDO…" : "ENVIAR"} <LoopLine width={44} />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
