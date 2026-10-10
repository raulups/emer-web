"use client";

import { useRef, useSyncExternalStore } from "react";
import { EASE, gsap, useGSAP } from "@/lib/gsap";
import { type CursorState, getCursorOverride, onCursorOverride } from "@/lib/motion/cursor";
import { subscribe } from "@/lib/motion/ticker";

/** Con alto contraste o colores forzados se respeta el cursor del sistema. */
const FINE_POINTER =
  "(hover: hover) and (pointer: fine) and (not (forced-colors: active)) and (not (prefers-contrast: more))";
const LERP = 0.22;
const FRAME_MS = 1000 / 60;

const TYPING =
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]):not([type="file"]), textarea, [contenteditable=""], [contenteditable="true"]';
const LINK = 'a, button, label, select, summary, [role="button"], input, [data-cursor="link"]';

type Look = {
  fill: [scale: number, opacity: number];
  ring: [scale: number, opacity: number];
  bar: number;
  label: string;
  labelColor: string;
};

const LOOKS: Record<CursorState, Look> = {
  default: { fill: [0.14, 1], ring: [0.75, 0], bar: 0, label: "", labelColor: "#000" },
  link: { fill: [0.14, 0], ring: [0.75, 1], bar: 0, label: "", labelColor: "#000" },
  prod: { fill: [1, 1], ring: [0.75, 0], bar: 0, label: "VER", labelColor: "#000" },
  drag: { fill: [0.744, 1], ring: [0.75, 0], bar: 0, label: "← →", labelColor: "#000" },
  hero: { fill: [0.14, 0], ring: [1, 1], bar: 0, label: "ARRASTRA", labelColor: "#fff" },
  type: { fill: [0.14, 0], ring: [0.75, 0], bar: 1, label: "", labelColor: "#000" },
};

function resolve(target: EventTarget | null): CursorState {
  if (!(target instanceof Element)) return "default";
  if (target.closest(TYPING)) return "type";
  if (target.closest('[data-cursor="link"]')) return "link"; // p. ej. flechas dentro de una card
  if (target.closest('[data-cursor="prod"]')) return "prod";
  if (target.closest(LINK)) return "link";
  if (target.closest('[data-cursor="hero"]')) return "hero";
  return "default";
}

function subscribeFinePointer(onChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getFinePointer = () => window.matchMedia(FINE_POINTER).matches;

/** Cursor propio. Solo con puntero fino, sin movimiento reducido y sin alto contraste. */
export function Cursor({ enabled }: { enabled: boolean }) {
  const fine = useSyncExternalStore(subscribeFinePointer, getFinePointer, () => false);
  if (!enabled || !fine) return null;
  return <CursorLayer />;
}

function CursorLayer() {
  const root = useRef<HTMLDivElement>(null);
  const press = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const els = {
        root: root.current,
        press: press.current,
        fill: fill.current,
        ring: ring.current,
        bar: bar.current,
        label: label.current,
      };
      if (!contextSafe || Object.values(els).some((el) => el === null)) return;
      const {
        root: rootEl,
        press: pressEl,
        fill: fillEl,
        ring: ringEl,
        bar: barEl,
        label: labelEl,
      } = els as { [K in keyof typeof els]: NonNullable<(typeof els)[K]> };

      const html = document.documentElement;
      html.classList.add("has-cursor");

      const target = { x: 0, y: 0 };
      const pos = { x: 0, y: 0 };
      let placed = false;
      let shown = false;
      let hovered: CursorState = "default";
      let current: CursorState | null = null;
      let currentLabel = "";
      let labelTl: gsap.core.Timeline | undefined;

      gsap.set(fillEl, { scale: LOOKS.default.fill[0], opacity: LOOKS.default.fill[1] });
      gsap.set(ringEl, { scale: LOOKS.default.ring[0], opacity: 0 });
      gsap.set(barEl, { opacity: 0 });
      gsap.set(labelEl, { opacity: 0 });

      const write = () => {
        rootEl.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      };

      const setVisible = contextSafe((visible: boolean) => {
        if (shown === visible) return;
        shown = visible;
        gsap.to(rootEl, {
          opacity: visible ? 1 : 0,
          duration: 0.2,
          ease: EASE.standard,
          overwrite: "auto",
        });
      });

      const apply = contextSafe((state: CursorState) => {
        if (state === current) return;
        current = state;
        const look = LOOKS[state];
        const scale = { duration: 0.4, ease: EASE.outExpo, overwrite: "auto" as const };
        const fade = { duration: 0.25, ease: EASE.standard, overwrite: "auto" as const };

        gsap.to(fillEl, { scale: look.fill[0], ...scale });
        gsap.to(fillEl, { opacity: look.fill[1], ...fade });
        gsap.to(ringEl, { scale: look.ring[0], ...scale });
        gsap.to(ringEl, { opacity: look.ring[1], ...fade });
        gsap.to(barEl, { opacity: look.bar, ...fade });

        if (look.label === currentLabel) return;
        currentLabel = look.label;
        labelTl?.kill();
        labelTl = gsap
          .timeline()
          .to(labelEl, { opacity: 0, duration: 0.1, ease: EASE.standard })
          .call(() => {
            labelEl.textContent = look.label;
            labelEl.style.color = look.labelColor;
          })
          .to(labelEl, { opacity: look.label ? 1 : 0, duration: 0.2, ease: EASE.standard });
      });

      const sync = () => apply(getCursorOverride() ?? hovered);

      const onMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        target.x = event.clientX;
        target.y = event.clientY;
        if (!placed) {
          placed = true;
          pos.x = target.x;
          pos.y = target.y;
          write();
        }
        setVisible(true);
      };

      const onOver = (event: PointerEvent) => {
        hovered = resolve(event.target);
        sync();
      };

      const onOut = (event: PointerEvent) => {
        if (event.relatedTarget === null) setVisible(false);
      };

      const onDown = contextSafe(() => {
        gsap.to(pressEl, { scale: 0.75, duration: 0.2, ease: EASE.outExpo, overwrite: "auto" });
      });

      const onUp = contextSafe(() => {
        gsap.to(pressEl, { scale: 1, duration: 0.2, ease: EASE.outExpo, overwrite: "auto" });
      });

      const onBlur = () => setVisible(false);

      const unsubscribe = subscribe((_, dt) => {
        if (!placed) return;
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) return;
        const k = 1 - (1 - LERP) ** (dt / FRAME_MS);
        pos.x += dx * k;
        pos.y += dy * k;
        write();
      });

      const offOverride = onCursorOverride(sync);

      document.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("pointerover", onOver, { passive: true });
      document.addEventListener("pointerout", onOut, { passive: true });
      document.addEventListener("pointerdown", onDown, { passive: true });
      document.addEventListener("pointerup", onUp, { passive: true });
      window.addEventListener("blur", onBlur);

      sync();

      return () => {
        html.classList.remove("has-cursor");
        unsubscribe();
        offOverride();
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("pointerout", onOut);
        document.removeEventListener("pointerdown", onDown);
        document.removeEventListener("pointerup", onUp);
        window.removeEventListener("blur", onBlur);
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className="cursor" aria-hidden="true">
      <div ref={press} className="cursor__press">
        <span ref={fill} className="cursor__fill" />
        <span ref={ring} className="cursor__ring" />
        <span ref={bar} className="cursor__bar" />
        <span ref={label} className="cursor__label" />
      </div>
    </div>
  );
}
