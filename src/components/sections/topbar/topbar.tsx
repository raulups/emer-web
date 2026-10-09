"use client";

import Image from "next/image";
import { type MouseEvent, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LoopLine } from "@/components/ui/loop-line";
import { HERO_ID, SECTIONS, type SectionId } from "@/lib/config/sections";
import { EASE, gsap, useGSAP } from "@/lib/gsap";
import { bus } from "@/lib/motion/bus";
import { isReduced, subscribeReduced } from "@/lib/motion/reduced";
import { getHeroHeight, getScrollY, scrollTo, scrollToSection } from "@/lib/motion/scroll";
import { subscribe } from "@/lib/motion/ticker";

const OPEN_Y = 56;
const CLOSE_Y = 96;
const TOUCH_V = 4;
const SMOOTHING = 0.2;
/** «Pasado el hero» = el borde inferior del hero está a ≤ 64px del borde superior. */
const PAST_HERO_OFFSET = 64;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const FRAME_MS = 1000 / 60;

const NAV = SECTIONS.filter((section) => section.inNav);

/** Header que se revela arriba + línea de progreso con la sección actual (02-topbar). */
export function Topbar() {
  const reduced = useSyncExternalStore(subscribeReduced, isReduced, () => false);
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);
  const [label, setLabel] = useState<string>(SECTIONS[0].label);
  const [present, setPresent] = useState<ReadonlySet<string>>(() => new Set(NAV.map((s) => s.id)));

  const headerRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const focusInside = useRef(false);
  const open = useRef(false);
  const hintVisible = useRef(false);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const { contextSafe } = useGSAP({ scope: headerRef });

  // Estado inicial: header oculto, hint invisible.
  useGSAP(
    () => {
      const header = headerRef.current;
      const hint = hintRef.current;
      if (!header || !hint) return;
      open.current = false;
      hintVisible.current = false;
      gsap.killTweensOf([header, hint]); // un tween a medias no debe pisar el estado nuevo
      header.toggleAttribute("data-closed", true);
      if (reduced) gsap.set(header, { y: 0, yPercent: 0, opacity: 0, pointerEvents: "none" });
      else gsap.set(header, { y: 0, yPercent: -101, opacity: 1, pointerEvents: "auto" });
      gsap.set(hint, { opacity: 0 });
    },
    { dependencies: [reduced], revertOnUpdate: true },
  );

  const applyOpen = contextSafe((next: boolean) => {
    const header = headerRef.current;
    if (!header || open.current === next) return;
    open.current = next;
    // Con el header cerrado, el bucle de BUSCAR se pausa (CSS).
    header.toggleAttribute("data-closed", !next);
    if (reducedRef.current) {
      gsap.to(header, {
        opacity: next ? 1 : 0,
        pointerEvents: next ? "auto" : "none",
        duration: 0.15,
        ease: EASE.standard,
        overwrite: "auto",
      });
    } else {
      gsap.to(header, {
        yPercent: next ? 0 : -101,
        duration: 0.6,
        ease: EASE.outExpo,
        overwrite: "auto",
      });
    }
  });

  const applyHint = contextSafe((next: boolean) => {
    const hint = hintRef.current;
    if (!hint || hintVisible.current === next) return;
    hintVisible.current = next;
    gsap.to(hint, {
      opacity: next ? 1 : 0,
      duration: 0.45,
      ease: EASE.standard,
      overwrite: "auto",
    });
  });

  // Referencias estables: `contextSafe` devuelve una función nueva en cada render y el efecto
  // del reloj no debe re-suscribirse (perdería la velocidad de scroll y el estado del puntero).
  const applyOpenRef = useRef(applyOpen);
  const applyHintRef = useRef(applyHint);
  applyOpenRef.current = applyOpen;
  applyHintRef.current = applyHint;

  // Sección activa y etiqueta del hint.
  useEffect(
    () =>
      bus.on("section:change", ({ id, label: next }) => {
        setActive(id);
        setLabel(next);
      }),
    [],
  );

  // Las secciones que no se montan (0 datos) desaparecen de la nav.
  useEffect(() => {
    const check = () =>
      setPresent(new Set(NAV.filter((s) => document.getElementById(s.id)).map((s) => s.id)));
    check();
    return bus.onLoaded(check);
  }, []);

  // Visibilidad (puntero / táctil / buscador / foco) y relleno del hint, en el reloj único.
  useEffect(() => {
    // Modo según el último tipo de puntero (equipos híbridos), inicializado por media query.
    let mouseMode = window.matchMedia(FINE_POINTER).matches;
    let pointerOpen = false;
    let touchOpen = false;
    let lastY = getScrollY();
    let velocity = 0;
    let docHeight = 0;
    let lastProgress = -1;
    let heroMissing = false;
    let heroChecked = false;

    const measure = () => {
      docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(document.body);
    window.addEventListener("resize", measure);

    const onPointerMove = (event: PointerEvent) => {
      mouseMode = event.pointerType === "mouse";
      if (!mouseMode) return;
      if (event.clientY < OPEN_Y) pointerOpen = true;
      else if (event.clientY > CLOSE_Y) pointerOpen = false;
    };
    const onPointerDown = (event: PointerEvent) => {
      mouseMode = event.pointerType === "mouse";
    };
    // Tabular fuera del header lo cierra (el foco nunca queda tapado por él, WCAG 2.4.11).
    const onFocusIn = (event: FocusEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        pointerOpen = false;
        touchOpen = false;
      }
    };
    // Esc cierra el header abierto por el puntero (WCAG 1.4.13).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !bus.isSearchOpen()) {
        pointerOpen = false;
        touchOpen = false;
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("focusin", onFocusIn);
    window.addEventListener("keydown", onKeyDown);

    const unsubscribe = subscribe(
      (_, dt) => {
        const y = getScrollY();
        // Velocidad en px por frame de 60 Hz, independiente de la frecuencia de la pantalla.
        const dy = ((y - lastY) * FRAME_MS) / Math.max(1, dt);
        velocity += (dy - velocity) * SMOOTHING;
        lastY = y;
        if (velocity < -TOUCH_V) touchOpen = true;
        else if (velocity > TOUCH_V) touchOpen = false;

        // Durante la carga, oculto. Si no hay hero (0 marcas), «pasado el hero» siempre.
        const heroHeight = getHeroHeight();
        if (heroHeight === 0 && !heroChecked) {
          heroMissing = document.getElementById(HERO_ID) === null;
          heroChecked = heroMissing;
        }
        const pastHero =
          bus.isLoaded() && (heroHeight > 0 ? y >= heroHeight - PAST_HERO_OFFSET : heroMissing);
        const wantsOpen =
          bus.isSearchOpen() ||
          focusInside.current ||
          (pastHero && (mouseMode ? pointerOpen : touchOpen));

        applyOpenRef.current(wantsOpen);
        applyHintRef.current(pastHero && !wantsOpen);

        const progress = Math.min(1, Math.max(0, y / docHeight));
        if (Math.abs(progress - lastProgress) > 0.0005) {
          lastProgress = progress;
          const fill = fillRef.current;
          if (fill) fill.style.transform = `scaleX(${progress})`;
        }
      },
      { essential: true },
    );

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  /** Desplaza con Lenis y mueve el foco al destino (el siguiente Tab sigue desde ahí). */
  const goTo = (event: MouseEvent<HTMLAnchorElement>, id: SectionId) => {
    event.preventDefault();
    const target =
      id === HERO_ID ? document.getElementById("contenido") : document.getElementById(id);
    if (id === HERO_ID) scrollTo(0);
    else scrollToSection(id);
    if (target) {
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  };

  return (
    <>
      <div
        ref={hintRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[99] h-[26px] text-paper opacity-0 mix-blend-difference"
      >
        <div className="h-0.5 bg-white/22">
          <div
            ref={fillRef}
            className="h-full origin-left bg-paper"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
        <div className="absolute top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-3 whitespace-nowrap text-[8px] font-normal tracking-[0.3em]">
          <span>{label}</span>
          <span className="h-px w-[22px] bg-current" />
          <span>MENÚ ↑</span>
        </div>
      </div>

      {/* biome-ignore lint/a11y/noStaticElementInteractions: solo observa el foco para abrir el header cuando se tabula dentro (nunca foco invisible). */}
      <header
        ref={headerRef}
        // Solo el foco de teclado abre el header: tras un clic no debe quedarse abierto.
        onFocus={(e) => {
          focusInside.current = e.target.matches(":focus-visible");
        }}
        onBlur={(e) => {
          const next = e.relatedTarget;
          focusInside.current =
            next instanceof Element &&
            e.currentTarget.contains(next) &&
            next.matches(":focus-visible");
        }}
        className="topbar fixed inset-x-0 top-0 z-[100] grid h-[60px] grid-cols-[1fr_auto_1fr] items-center gap-5 border-b border-ink bg-paper px-page text-ink"
        style={{ transform: "translateY(-101%)" }}
      >
        <a
          href={`#${HERO_ID}`}
          onClick={(e) => goTo(e, HERO_ID)}
          className="justify-self-start"
          aria-label="Emer, volver arriba"
        >
          <Image
            src="/assets/brand/emer-logo-black.webp"
            alt=""
            width={66}
            height={24}
            className="h-6 w-auto"
          />
        </a>

        <nav aria-label="Secciones" className="hidden gap-[clamp(20px,3vw,44px)] lg:flex">
          {NAV.filter((s) => present.has(s.id)).map((section) => {
            const isActive = section.id === active;
            return (
              <a
                key={section.id}
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={(e) => goTo(e, section.id)}
                className={`group relative flex items-baseline gap-1.5 py-1 font-normal transition-colors duration-[350ms] hover:text-ink ${
                  isActive ? "text-ink" : "text-muted"
                }`}
              >
                <small className="text-[7.5px] tracking-[0.1em]">{section.n}</small>
                <span className="text-[10px] tracking-[0.26em]">{section.label}</span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-ink transition-transform duration-[600ms] ease-out-expo ${
                    isActive ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </a>
            );
          })}
        </nav>

        <button
          type="button"
          data-js-only=""
          aria-haspopup="dialog"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={() => bus.emit("emer:search:open")}
          className="flex items-center gap-3 justify-self-end py-2 text-[10px] font-normal tracking-[0.3em] text-ink"
        >
          <span>BUSCAR</span>
          <LoopLine width={34} />
          <span
            aria-hidden="true"
            className="hidden font-[inherit] text-[8.5px] text-muted lg:inline"
          >
            ⌘K
          </span>
        </button>
      </header>
    </>
  );
}
