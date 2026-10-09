"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { upper } from "@/lib/format";
import { EASE, gsap, useGSAP } from "@/lib/gsap";
import { bus } from "@/lib/motion/bus";
import { isReduced, subscribeReduced } from "@/lib/motion/reduced";
import s from "./search.module.css";

export type SearchBrand = { id: string; name: string; url: string | null; img: string | null };
type Props = { state: "ready" | "loading" | "error"; brands: SearchBrand[] };

const OPEN_DELAY = 30;
const CLOSE_MS = 700;
const SUGGEST_DELAY = 360;
const STAGGER = 0.04;

const norm = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleUpperCase("es");
const pad2 = (n: number) => String(n).padStart(2, "0");

/** Tamaño del eco en px (fórmula del handoff); solo se usa para la proporción del FLIP. */
function echoPx(length: number, vw: number): number {
  if (length === 0) return 64;
  return Math.min(Math.min(200, 70 + length * 14), (vw - 80) / (length * 0.5 + 0.3));
}

/** Mismo tamaño en CSS: sigue al ancho de la ventana sin recalcular en JS. */
function echoSize(length: number): string {
  if (length === 0) return "64px";
  return `min(${Math.min(200, 70 + length * 14)}px, calc((100vw - 80px) / ${(length * 0.5 + 0.3).toFixed(2)}))`;
}

type Part = { text: string; hit: boolean };

function highlight(name: string, q: string): Part[] {
  const up = upper(name);
  const normalized = norm(up);
  const at = q ? normalized.indexOf(q) : -1;
  if (at < 0 || normalized.length !== up.length) return [{ text: up, hit: false }];
  return [
    { text: up.slice(0, at), hit: false },
    { text: up.slice(at, at + q.length), hit: true },
    { text: up.slice(at + q.length), hit: false },
  ].filter((p) => p.text);
}

/** 09-buscar (variante «Índice»): diálogo modal con telón, eco gigante e índice de resultados. */
/** Elemento que abrió el buscador; sobrevive al remontaje fallback → datos. */
let heldOpener: HTMLElement | null = null;

export function Search({ state, brands }: Props) {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [peek, setPeek] = useState(false);
  const [bad, setBad] = useState<ReadonlySet<string>>(() => new Set());

  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const echoRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const timers = useRef<{ open?: number; close?: number; suggest?: number }>({});
  const everShown = useRef(false);
  const armed = useRef(false);
  const prevPx = useRef(64);
  const seen = useRef(new Set<string>());

  const trimmed = query.trim();
  const q = norm(trimmed);
  const hasText = trimmed.length > 0;

  const hits = useMemo(
    () => (q ? brands.filter((b) => norm(upper(b.name)).includes(q)) : []),
    [brands, q],
  );
  const current = Math.min(active, Math.max(0, hits.length - 1));
  const previewBrand = hits[current];
  const previewOn =
    peek && previewBrand?.img != null && !bad.has(previewBrand.id) && state === "ready";

  // ---------- Apertura / cierre ----------

  const open = useCallback(() => {
    window.clearTimeout(timers.current.close);
    const wasMounted = rootRef.current !== null;
    if (!wasMounted) {
      // Al remontarse (fallback → datos) el activeElement ya es body: se conserva el opener vigente.
      if (!heldOpener?.isConnected) heldOpener = document.activeElement as HTMLElement | null;
      opener.current = heldOpener;
    }
    setMounted(true);
    window.clearTimeout(timers.current.open);
    timers.current.open = window.setTimeout(() => {
      setShown(true);
    }, OPEN_DELAY);
  }, []);

  useEffect(() => {
    if (shown) inputRef.current?.focus({ preventScroll: true });
  }, [shown]);

  const close = useCallback(() => {
    if (bus.isSearchOpen()) bus.emit("emer:search:close");
    window.clearTimeout(timers.current.open);
    setShown(false);
    const back = opener.current;
    heldOpener = null;
    if (back?.isConnected) back.focus({ preventScroll: true });
    window.clearTimeout(timers.current.close);
    timers.current.close = window.setTimeout(() => {
      setMounted(false);
      setQuery("");
      setActive(0);
      setPeek(false);
    }, CLOSE_MS);
  }, []);

  useEffect(() => {
    // Remonte (el hueco de carga se sustituye por el real) con el buscador ya abierto.
    if (bus.isSearchOpen()) open();
    const off = bus.on("emer:search:open", open);
    return () => {
      off();
      for (const t of Object.values(timers.current)) window.clearTimeout(t);
    };
  }, [open]);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-search-open", mounted);
    return () => document.documentElement.removeAttribute("data-search-open");
  }, [mounted]);

  // ---------- Animaciones ----------

  // Telón (doble translateY: panel -100% → 0, contenido 100% → 0) y velo.
  useGSAP(
    () => {
      const panel = panelRef.current;
      const content = contentRef.current;
      const veil = veilRef.current;
      if (!mounted || !panel || !content || !veil) return;
      const first = !everShown.current;
      if (reduced) {
        gsap.set([panel, content], { yPercent: 0 });
        if (first) gsap.set([panel, veil], { opacity: 0 });
        gsap.to([panel, veil], { opacity: shown ? 1 : 0, duration: 0.2, ease: EASE.standard });
      } else if (first && !shown) {
        gsap.set(panel, { yPercent: -100 });
        gsap.set(content, { yPercent: 100 });
        gsap.set(veil, { opacity: 0 });
      } else {
        const to = { duration: 0.75, ease: EASE.curtain, overwrite: true };
        gsap.to(panel, { yPercent: shown ? 0 : -100, ...to });
        gsap.to(content, { yPercent: shown ? 0 : 100, ...to });
        gsap.to(veil, { opacity: shown ? 1 : 0, duration: 0.6, ease: EASE.standard });
      }
      everShown.current = true;
    },
    { scope: rootRef, dependencies: [mounted, shown, reduced] },
  );

  useEffect(() => {
    if (!mounted) {
      everShown.current = false;
      armed.current = false;
      seen.current = new Set();
      prevPx.current = 64;
    }
  }, [mounted]);

  // Espacio superior, raya y contador: cambian con la primera letra / al borrar todo.
  useGSAP(
    () => {
      const block = blockRef.current;
      const rule = ruleRef.current;
      const count = countRef.current;
      if (!mounted || !block || !rule || !count) return;
      const y = window.innerHeight * (hasText ? 0.01 : 0.14);
      const scale = hasText ? 1 : 40 / Math.max(1, rule.offsetWidth);
      const set = !armed.current || reduced;
      if (set) {
        gsap.set(block, { y });
        gsap.set(rule, { scaleX: scale });
        gsap.set(count, { opacity: hasText ? 1 : 0 });
        armed.current = true;
        return;
      }
      gsap.to(block, { y, duration: 0.8, ease: EASE.outExpo, overwrite: true });
      gsap.to(rule, { scaleX: scale, duration: 0.7, ease: EASE.outExpo, overwrite: true });
      gsap.to(count, { opacity: hasText ? 1 : 0, duration: 0.4, ease: EASE.standard });
    },
    { scope: rootRef, dependencies: [mounted, hasText, reduced] },
  );

  // Eco: font-size al destino y FLIP con `scale` (sin animar tipografía).
  const length = query.length;
  useGSAP(
    () => {
      const echo = echoRef.current;
      if (!mounted || !echo) return;
      const next = echoPx(length, window.innerWidth);
      const prev = prevPx.current;
      prevPx.current = next;
      if (reduced || prev === next || !armed.current) return;
      gsap.fromTo(
        echo,
        { scale: prev / next },
        { scale: 1, duration: 0.5, ease: EASE.outExpo, overwrite: true },
      );
    },
    { scope: rootRef, dependencies: [mounted, length, reduced] },
  );

  // Resultados nuevos: aparecen escalonados (k · 40 ms; solo los que no estaban).
  const hitsKey = hits.map((b) => b.id).join("|");
  useGSAP(
    () => {
      const list = resultsRef.current;
      if (!mounted || !list) return;
      const nextSeen = new Set<string>();
      let k = 0;
      for (const li of list.querySelectorAll<HTMLElement>("[data-id]")) {
        const id = li.dataset.id ?? "";
        nextSeen.add(id);
        if (seen.current.has(id) || reduced) continue;
        const delay = k++ * STAGGER;
        gsap.fromTo(li, { opacity: 0 }, { opacity: 1, duration: 0.6, delay, ease: "none" });
        gsap.fromTo(li, { y: 8 }, { y: 0, duration: 0.8, delay, ease: EASE.outExpo });
      }
      seen.current = nextSeen;
    },
    { scope: rootRef, dependencies: [mounted, hitsKey, reduced] },
  );

  // ---------- Teclado ----------

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (hits.length === 0) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(Math.max(0, Math.min(hits.length - 1, current + step)));
      setPeek(true);
    } else if (event.key === "Enter") {
      const url = hits[current]?.url;
      if (url) window.open(url, "_blank", "noopener");
    }
  };

  // Esc: con texto borra, sin texto cierra. Tab queda atrapado en el diálogo.
  useEffect(() => {
    if (!shown) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (query) {
          setQuery("");
          setActive(0);
          setPeek(false);
        } else {
          close();
        }
      } else if (event.key === "Tab") {
        const focusables = rootRef.current?.querySelectorAll<HTMLElement>(
          "input:not([disabled]), button:not([disabled])",
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const at = document.activeElement;
        if (event.shiftKey && at === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && at === last) {
          event.preventDefault();
          first?.focus();
        } else if (!rootRef.current?.contains(at)) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown, query, close]);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setActive(0);
    setPeek(false);
  };

  // «Sugiérela.»: cierra, y a los 360 ms prellena 07-sugiere (que hace scroll a #sugiere).
  const suggest = () => {
    const name = trimmed;
    close();
    window.clearTimeout(timers.current.suggest);
    timers.current.suggest = window.setTimeout(
      () => bus.emit("emer:suggest", { name }),
      SUGGEST_DELAY,
    );
  };

  if (!mounted) return null;

  const count =
    state === "loading"
      ? "— MARCAS"
      : hits.length === 1
        ? "1 MARCA"
        : `${pad2(hits.length)} MARCAS`;
  const none = state === "ready" && hasText && hits.length === 0;
  const activeId = hits.length > 0 && state === "ready" ? `sr-${current}` : undefined;

  return (
    <div
      ref={rootRef}
      id="buscar"
      className={s.root}
      role="dialog"
      aria-modal="true"
      aria-label="Buscar marcas"
      data-open={shown ? "" : undefined}
      inert={!shown}
    >
      <div ref={veilRef} className={s.veil} onClick={close} aria-hidden="true" />
      <div className={s.mask}>
        <div ref={panelRef} className={s.panel}>
          <div ref={contentRef} className={s.content}>
            <div className={s.top}>
              <button type="button" className={s.close} onClick={close}>
                CERRAR <kbd className={s.kbd}>ESC</kbd>
              </button>
            </div>
            <div className={s.body} data-lenis-prevent="">
              <div ref={blockRef} className={s.block}>
                <label className={s.field}>
                  <span className="sr-only">Nombre de la marca</span>
                  <input
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={hits.length > 0}
                    aria-autocomplete="list"
                    aria-controls="sr-results"
                    aria-activedescendant={activeId}
                    maxLength={22}
                    spellCheck={false}
                    autoComplete="off"
                    className={s.input}
                    value={query}
                    onChange={onChange}
                    onKeyDown={onInputKey}
                  />
                  <span
                    ref={echoRef}
                    className={s.echo}
                    style={{ fontSize: echoSize(length) }}
                    aria-hidden="true"
                  >
                    {query.toLocaleUpperCase("es")}
                    <span className={s.caret} />
                  </span>
                </label>
                <span ref={ruleRef} className={s.rule} />
                <p ref={countRef} className={s.count} aria-live="polite">
                  {hasText || state === "loading" ? count : ""}
                </p>
                <ul
                  id="sr-results"
                  ref={resultsRef}
                  className={s.results}
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: combobox/listbox con foco virtual (aria-activedescendant en el input).
                  role="listbox"
                  aria-label="Marcas"
                >
                  {state === "ready" &&
                    hits.map((brand, i) => {
                      const parts = highlight(brand.name, q);
                      const label = parts.map((p) => (
                        <span key={`${p.text}-${p.hit}`} className={p.hit ? s.hit : s.dim}>
                          {p.text}
                        </span>
                      ));
                      return (
                        // biome-ignore lint/a11y/useFocusableInteractive: foco virtual en el input (aria-activedescendant).
                        <li
                          key={brand.id}
                          id={`sr-${i}`}
                          data-id={brand.id}
                          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: combobox/listbox con foco virtual (aria-activedescendant en el input).
                          role="option"
                          aria-selected={i === current}
                          className={s.item}
                          data-active={i === current ? "" : undefined}
                          onPointerEnter={() => {
                            setActive(i);
                            setPeek(true);
                          }}
                        >
                          {brand.url ? (
                            <a
                              href={brand.url}
                              target="_blank"
                              rel="noopener"
                              tabIndex={-1}
                              className={s.link}
                            >
                              {label}
                              <span className="sr-only"> (se abre en una pestaña nueva)</span>
                            </a>
                          ) : (
                            <span className={s.link}>{label}</span>
                          )}
                          <span className={s.sep} aria-hidden="true">
                            /
                          </span>
                        </li>
                      );
                    })}
                </ul>

                {none && (
                  <p className={s.none}>
                    Ninguna marca con ese nombre.{" "}
                    <button type="button" className={s.suggest} onClick={suggest}>
                      Sugiérela.
                    </button>
                  </p>
                )}
                {state === "error" && <p className={s.none}>No hemos podido cargar las marcas.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.preview} data-on={previewOn ? "" : undefined} aria-hidden="true">
        {previewBrand?.img && !bad.has(previewBrand.id) && (
          <Image
            key={previewBrand.id}
            src={previewBrand.img}
            alt=""
            fill
            sizes="190px"
            className={s.previewImg}
            onError={() => setBad((prev) => new Set(prev).add(previewBrand.id))}
          />
        )}
      </div>
    </div>
  );
}
