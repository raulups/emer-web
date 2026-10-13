"use client";

import { type CSSProperties, type KeyboardEvent, type PointerEvent, useRef } from "react";
import { price } from "@/lib/format";
import styles from "./price-slider.module.css";

type Thumb = "lo" | "hi";

type Props = {
  min: number;
  max: number;
  lo: number;
  hi: number;
  onChange: (lo: number, hi: number) => void;
};

const BIG_STEP = 10;

/** PRECIO: slider doble de 1px con puntos de 9px. El punto más cercano sigue al puntero. */
export function PriceSlider({ min, max, lo, hi, onChange }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const span = max - min || 1;
  const pct = (v: number) => ((v - min) / span) * 100;

  const valueAt = (clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return min;
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(min + t * span);
  };

  const set = (which: Thumb, value: number) => {
    const v = Math.min(max, Math.max(min, value));
    if (which === "lo") onChange(Math.min(v, hi), hi);
    else onChange(lo, Math.max(v, lo));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const v0 = valueAt(event.clientX);
    const which: Thumb = Math.abs(v0 - lo) <= Math.abs(v0 - hi) ? "lo" : "hi";
    event.currentTarget.setPointerCapture(event.pointerId);
    set(which, v0);
    const el = event.currentTarget;
    const move = (e: globalThis.PointerEvent) => set(which, valueAt(e.clientX));
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const onKeyDown = (which: Thumb) => (event: KeyboardEvent) => {
    const current = which === "lo" ? lo : hi;
    const steps: Record<string, number> = {
      ArrowLeft: current - 1,
      ArrowDown: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current + 1,
      PageDown: current - BIG_STEP,
      PageUp: current + BIG_STEP,
      Home: min,
      End: max,
    };
    const next = steps[event.key];
    if (next === undefined) return;
    event.preventDefault();
    set(which, next);
  };

  const thumb = (which: Thumb, value: number, label: string) => (
    <span
      role="slider"
      tabIndex={0}
      className={styles.thumb}
      style={{ left: `${pct(value)}%` }}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={price(value)}
      onKeyDown={onKeyDown(which)}
    />
  );

  return (
    <div className={styles.slider}>
      <div ref={track} className={styles.track} onPointerDown={onPointerDown}>
        <span className={styles.rail} aria-hidden="true" />
        <span
          className={styles.range}
          style={{ "--from": `${pct(lo)}%`, "--to": `${100 - pct(hi)}%` } as CSSProperties}
          aria-hidden="true"
        />
        {thumb("lo", lo, "Precio mínimo")}
        {thumb("hi", hi, "Precio máximo")}
      </div>
      <span className={styles.value} aria-live="polite">
        {price(lo)} - {price(hi)}
      </span>
    </div>
  );
}
