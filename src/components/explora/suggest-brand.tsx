"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { type FormEvent, useLayoutEffect, useRef, useState } from "react";
import button from "@/components/ui/button.module.css";
import { ScrambleText } from "@/components/ui/scramble-text";
import { bus } from "@/lib/bus";
import type { ExploraBrand } from "@/lib/explora-data";
import { clamp01, easeOutCubic as E, lerpBy } from "@/lib/motion/math";
import { scrollToY } from "@/lib/motion/scroll";
import { subscribe, type Tick } from "@/lib/motion/ticker";
import { write } from "@/lib/motion/write";
import { cleanInstagram, NAME_MAX, validInstagram, validName } from "@/lib/suggest";
import styles from "./suggest-brand.module.css";

gsap.registerPlugin(useGSAP);

/** Índice del slot entre las 13 posiciones (las 12 filas son el resto). */
const SLOT = 6;
const POSITIONS = 13;

type Status = "idle" | "sending" | "sent" | "error";

type Props = { brands: readonly ExploraBrand[] };

/** Ancho mínimo de cada corchete respecto al centro y su holgura sobre el texto (en F). */
const hug = (width: number, F: number, vw: number) =>
  Math.min(vw * 0.47, Math.max(F * 0.3, width / 2 + F * 0.14));

/**
 * Sugerir marca (handoff_sugerir_footer/README.md §1). Sección de 380vh con escena sticky: la lista
 * de marcas sube desde abajo hasta dejar el slot centrado, las filas se apartan y aparece el
 * formulario. Un bucle (`gsap.ticker`, activo solo cerca de la sección) suaviza el progreso con
 * lerp 0.085 y escribe `transform`/`opacity`; React solo guarda los campos y el estado del envío.
 * Sin JS o con «reducir movimiento», el CSS ya es el estado final.
 *
 * Envío (§1.5) por `/api/suggestions` → backend KMP (la web nunca escribe en la BDD). Enviado: las
 * filas vuelven, los corchetes se cierran sobre el nombre y aparece «EN REVISIÓN · GRACIAS».
 */
export function SuggestBrand({ brands }: Props) {
  const root = useRef<HTMLElement>(null);
  const mirror = useRef<HTMLSpanElement>(null);
  const sentText = useRef<HTMLSpanElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  // Ancho del texto que abrazan los corchetes: lo escrito (mirror) o, tras enviar, el nombre
  // enviado. Se mide al cambiar, no por frame.
  const width = useRef(0);
  // El bucle lee el estado sin re-render.
  const sent = useRef(false);
  // «Sugerir otra» devuelve el foco al nombre cuando deja de estar `inert`.
  const refocus = useRef(false);
  // Con «reducir movimiento» no hay bucle: los corchetes se recolocan al medir.
  const place = useRef<(() => void) | null>(null);
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sentName, setSentName] = useState("");

  const nameOk = validName(name);
  const instagramOk = validInstagram(instagram);
  const valid = nameOk && instagramOk;
  const isSent = status === "sent";
  sent.current = isSent;
  const fill = (nameOk ? 0.5 : 0) + (instagramOk ? 0.5 : 0);

  // SAMPLE: con menos de 12 marcas en la BDD los nombres se repiten hasta llenar las filas.
  const rows =
    brands.length > 0
      ? Array.from({ length: POSITIONS }, (_, i) => i)
          .filter((i) => i !== SLOT)
          .map((i, k) => ({ i, name: (brands[k % brands.length]?.name ?? "").toUpperCase() }))
      : [];

  const measureText = () => {
    const node = sent.current ? sentText.current : mirror.current;
    width.current = node?.offsetWidth ?? 0;
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: se mide cada vez que cambia el texto.
  useLayoutEffect(() => {
    measureText();
    place.current?.();
    if (!isSent && refocus.current) {
      refocus.current = false;
      nameInput.current?.focus({ preventScroll: true });
    }
  }, [name, sentName, isSent]);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const one = (sel: string) => {
        const node = el.querySelector<HTMLElement>(sel);
        if (!node) throw new Error(`SuggestBrand: falta ${sel}`);
        return node;
      };
      const form = one("form");
      const slot = one("[data-slot]");
      const bl = one("[data-bl]");
      const br = one("[data-br]");
      const cur = one("[data-cur]");
      const rowNodes = [...el.querySelectorAll<HTMLElement>("[data-sr]")].map((node) => ({
        node,
        d: Number(node.dataset.sr) - SLOT,
      }));
      const fields = [...el.querySelectorAll<HTMLElement>("[data-sf]")].map((node) => ({
        node,
        k: Number(node.dataset.sf),
      }));
      const labels = [...el.querySelectorAll<HTMLElement>("[data-slab]")];
      const active = [...el.querySelectorAll<HTMLElement>("[data-spe]")];
      const done = [...el.querySelectorAll<HTMLElement>("[data-sv]")];

      const remeasure = measureText;
      const brackets = (g: number, F: number) => {
        write(bl, "transform", `translate(calc(-100% - ${g.toFixed(1)}px), -50%)`);
        write(br, "transform", `translate(${g.toFixed(1)}px, -50%)`);
        write(cur, "transform", `translate(${(width.current / 2 + F * 0.04).toFixed(1)}px, -50%)`);
      };
      const size = () => {
        const vw = window.innerWidth;
        return { vw, vh: window.innerHeight, F: Math.min(vw * 0.1, window.innerHeight * 0.17) };
      };

      const mm = gsap.matchMedia();

      // Estado final directo: el CSS ya lo pinta; solo faltan los corchetes alrededor del texto.
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const fit = () => {
          const { vw, F } = size();
          brackets(hug(width.current, F, vw), F);
        };
        const onResize = () => {
          remeasure();
          fit();
        };
        place.current = fit;
        onResize();
        window.addEventListener("resize", onResize);
        document.fonts.ready.then(onResize);
        const off = bus.on("suggest:open", () => el.scrollIntoView());
        return () => {
          off();
          place.current = null;
          window.removeEventListener("resize", onResize);
        };
      });

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let { vw, vh, F } = size();
        let top = 0;
        let height = 1;
        const measure = () => {
          ({ vw, vh, F } = size());
          top = el.getBoundingClientRect().top + window.scrollY;
          height = el.offsetHeight;
          remeasure();
        };
        measure();
        window.addEventListener("resize", measure);
        document.fonts.ready.then(measure);
        // Lo que cambia de alto por encima (Catálogo mide su pista) mueve la sección.
        const observer = new ResizeObserver(measure);
        observer.observe(document.body);

        let q: number | null = null;
        let S = 0;
        let SV = 0;
        let g: number | null = null;
        let t = 0;
        let last = 0;

        const focus = (y: number) => clamp01(1 - Math.abs(y) / (vh * 0.62)) ** 1.6;

        const frame: Tick = (time, deltaMs) => {
          const qr = clamp01((vh - (top - window.scrollY)) / height);
          // Al volver tras un rato fuera (bucle en pausa), arranca donde está el scroll.
          q = q === null || time - last > 0.25 ? qr : lerpBy(q, qr, 0.085, deltaMs);
          last = time;

          const off = (1 - E(clamp01((q - 0.08) / 0.5))) * 10;
          const s = E(clamp01((q - 0.56) / 0.16));
          t = E(clamp01((q - 0.64) / 0.16));
          S = lerpBy(S, sent.current ? 0 : s, 0.1, deltaMs);
          SV = lerpBy(SV, sent.current ? 1 : 0, 0.1, deltaMs);

          for (const { node, d } of rowNodes) {
            const y = (d + off) * F + Math.sign(d) * S * vh * 0.7;
            const o = y > vh * 0.62 ? 0 : Math.max(0.06, focus(y)) * (1 - S);
            write(node, "opacity", o.toFixed(3));
            write(node, "transform", `translateY(calc(-50% + ${y.toFixed(1)}px))`);
          }

          const sy = off * F;
          write(slot, "opacity", focus(sy).toFixed(3));
          write(slot, "transform", `translateY(calc(-50% + ${sy.toFixed(1)}px))`);

          // Mientras se abre el formulario los corchetes se separan hasta salir de la pantalla y
          // queda solo el cursor; al enviar (S → 0) vuelven y se cierran sobre el nombre.
          const goal = hug(width.current, F, vw) + S * (vw * 0.5 + F);
          g = g === null ? goal : lerpBy(g, goal, 0.2, deltaMs);
          brackets(g, F);
          write(cur, "opacity", (1 - SV).toFixed(3));

          for (const { node, k } of fields) {
            const v = E(clamp01((q - 0.64 - k * 0.035) / 0.16)) * (1 - SV);
            write(node, "opacity", v.toFixed(3));
            write(node, "transform", `translateY(${((1 - v) * 40).toFixed(1)}px)`);
          }
          for (const node of done) {
            write(node, "opacity", SV.toFixed(3));
            write(node, "transform", `translateY(${((1 - SV) * 30).toFixed(1)}px)`);
          }
          const lab = E(clamp01((q - 0.3) / 0.2)).toFixed(3);
          for (const node of labels) write(node, "opacity", lab);
          const events = t > 0.5 && !sent.current ? "auto" : "none";
          for (const node of active) write(node, "pointer-events", events);
        };

        // Scroll con el formulario entero a la vista (q = 0.82 → t = 1).
        const formTop = () => top + height * 0.82 - vh;
        // Teclado: si el foco entra con el formulario aún oculto, se baja hasta verlo entero.
        const reveal = () => {
          if (t <= 0.5) scrollToY(formTop(), { immediate: true });
        };
        form.addEventListener("focusin", reveal);
        // Footer → «Sugerir marca».
        const off = bus.on("suggest:open", () => scrollToY(formTop()));

        const unsubscribe = subscribe(frame, el, "100% 0px 50% 0px");
        return () => {
          unsubscribe();
          off();
          form.removeEventListener("focusin", reveal);
          observer.disconnect();
          window.removeEventListener("resize", measure);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Mientras envía se ignoran más clics.
    if (!valid || status === "sending") return;
    setStatus("sending");
    const ok = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, instagram }),
    })
      .then((res) => res.ok)
      .catch(() => false);
    if (!ok) {
      // Se conservan los datos para reintentar.
      setStatus("error");
      return;
    }
    setSentName(name.trim());
    setName("");
    setInstagram("");
    setStatus("sent");
  };

  const reset = () => {
    refocus.current = true;
    setStatus("idle");
  };

  return (
    <section
      ref={root}
      id="sugerir-marca"
      className={styles.sg}
      aria-labelledby="sg-title"
      data-sent={isSent || undefined}
    >
      <form className={styles.stage} onSubmit={submit} noValidate>
        <span className={`${styles.label} ${styles.labelLeft}`} data-slab aria-hidden="true">
          <ScrambleText text="A — 5 · Sugerir marca" />
        </span>
        <span className={`${styles.label} ${styles.labelRight}`} data-slab aria-hidden="true">
          <ScrambleText text="¿Falta una?" />
        </span>

        {rows.map((row) => (
          <div key={row.i} className={styles.row} data-sr={row.i} aria-hidden="true">
            {row.name}
          </div>
        ))}

        <div className={styles.slot} data-slot data-empty={(!name && !isSent) || undefined}>
          <h2 id="sg-title" className={styles.title} data-sf="0">
            Ayúdanos a encontrar marcas
          </h2>
          <span className={`${styles.bracket} ${styles.bracketLeft}`} data-bl aria-hidden="true">
            [
          </span>
          <span className={styles.bracket} data-br aria-hidden="true">
            ]
          </span>
          <span className={styles.caret} data-cur aria-hidden="true" />
          <span ref={mirror} className={styles.mirror} aria-hidden="true">
            {name}
          </span>
          <input
            ref={nameInput}
            className={styles.name}
            data-sf="0"
            data-spe
            type="text"
            name="name"
            aria-label="Nombre de la marca"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={NAME_MAX}
            inert={isSent}
            autoComplete="off"
            spellCheck={false}
          />
          <div className={styles.sentName} data-sv inert={!isSent}>
            <span ref={sentText} className={styles.sentText}>
              {sentName}
            </span>
          </div>
        </div>

        <div className={styles.below}>
          <div className={styles.fields} inert={isSent}>
            <label className={styles.instagram} data-sf="1" data-spe>
              <span className={styles.instagramLabel}>Instagram</span>
              <span className={styles.at} aria-hidden="true">
                @
              </span>
              <input
                className={styles.instagramInput}
                type="text"
                name="instagram"
                value={instagram}
                onChange={(event) => setInstagram(cleanInstagram(event.target.value))}
                placeholder="usuario"
                maxLength={31}
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button
              className={styles.submit}
              data-sf="2"
              data-spe
              data-valid={valid || undefined}
              type="submit"
              aria-disabled={!valid}
            >
              <span>Enviar sugerencia</span>
              <span className={styles.meter} aria-hidden="true">
                <span className={styles.meterFill} style={{ transform: `scaleX(${fill})` }} />
              </span>
            </button>
            {status === "error" && (
              <p className={styles.error} role="alert">
                No se pudo enviar. Inténtalo de nuevo.
              </p>
            )}
          </div>
          <div className={styles.thanks} data-sv inert={!isSent}>
            <p className={styles.thanksText} role="status">
              {isSent ? "En revisión · Gracias" : ""}
            </p>
            <button className={button.box} type="button" onClick={reset}>
              Sugerir otra
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
