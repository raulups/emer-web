"use client";

import { useEffect, useRef } from "react";
import { pad } from "@/lib/motion/math";
import { subscribe } from "@/lib/motion/ticker";
import styles from "./wake-game.module.css";

/** Prendas que suman; los errores del servidor dormido quitan una vida. */
const GOOD = ["HOODIE", "TEE", "CARGO", "CAP", "SNEAKERS", "BEANIE", "JORTS", "CREWNECK"];
const BAD = ["502", "503", "504"];
const LIVES = 3;
const BEST_KEY = "emer:wake-game-best";

type Item = { x: number; y: number; vy: number; label: string; bad: boolean; w: number };
type Phase = "idle" | "play" | "over";

function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Sin almacenamiento: el récord dura lo que la partida.
  }
}

/**
 * Minijuego de la pantalla de espera (`backend-wake.tsx`): atrapa prendas con la bolsa y esquiva
 * los 50X. Canvas pintado desde el ticker único; nada de estado de React por frame. Solo empieza
 * cuando el usuario lo pide (clic, toque, Enter o espacio), así que no mueve nada por su cuenta.
 */
export function WakeGame() {
  const box = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = box.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!wrap || !cv || !ctx) return;

    const css = getComputedStyle(wrap);
    const ink = css.getPropertyValue("--black").trim() || "#000";
    const paper = css.getPropertyValue("--paper").trim() || "#fff";
    const mute = css.getPropertyValue("--grey-text").trim() || "#6b6b6b";
    const rule = css.getPropertyValue("--grey-rule").trim() || "#c8c8c8";
    const font = css.fontFamily;

    let w = 0;
    let h = 0;
    let phase: Phase = "idle";
    let items: Item[] = [];
    let score = 0;
    let lives = LIVES;
    let best = readBest();
    let spawnIn = 0;
    let hurt = 0;
    let caught = 0;
    let x = 0;
    let target = 0;
    const keys = { left: false, right: false };

    const bagW = () => Math.min(120, Math.max(72, w * 0.16));
    const bagY = () => h - 34;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = rect.width;
      h = rect.height;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (x === 0) x = target = w / 2;
      x = Math.min(Math.max(x, bagW() / 2), w - bagW() / 2);
      draw();
    };

    const start = () => {
      phase = "play";
      items = [];
      score = 0;
      lives = LIVES;
      spawnIn = 0.3;
      hurt = 0;
    };

    const spawn = () => {
      const bad = Math.random() < Math.min(0.45, 0.22 + score * 0.008);
      const label = bad
        ? (BAD[Math.floor(Math.random() * BAD.length)] ?? "502")
        : (GOOD[Math.floor(Math.random() * GOOD.length)] ?? "TEE");
      ctx.font = `300 12px ${font}`;
      const tw = ctx.measureText(label).width + (bad ? 14 : 18);
      items.push({
        x: tw / 2 + Math.random() * Math.max(1, w - tw),
        y: 24,
        vy: 80 + score * 3.5 + Math.random() * 50,
        label,
        bad,
        w: tw,
      });
    };

    const step = (dt: number) => {
      const speed = Math.max(260, w * 0.9);
      if (keys.left) target -= speed * dt;
      if (keys.right) target += speed * dt;
      const half = bagW() / 2;
      target = Math.min(Math.max(target, half), w - half);
      x += (target - x) * Math.min(1, dt * 18);
      hurt = Math.max(0, hurt - dt);
      caught = Math.max(0, caught - dt);
      if (phase !== "play") return;

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn();
        spawnIn = Math.max(0.32, 0.95 - score * 0.02) * (0.7 + Math.random() * 0.6);
      }

      const top = bagY() - 6;
      const kept: Item[] = [];
      for (const it of items) {
        it.y += it.vy * dt;
        const hit =
          it.y + 8 >= top && it.y - 8 <= top + 14 && Math.abs(it.x - x) < half + it.w / 2 - 6;
        if (hit) {
          if (it.bad) {
            lives--;
            hurt = 0.35;
          } else {
            score++;
            caught = 0.2;
          }
          continue;
        }
        if (it.y < h + 20) kept.push(it);
      }
      items = kept;

      if (lives <= 0) {
        phase = "over";
        items = [];
        if (score > best) {
          best = score;
          saveBest(best);
        }
      }
    };

    const text = (value: string, tx: number, ty: number, align: CanvasTextAlign, color: string) => {
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(value, tx, ty);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "middle";

      // Marco: suelo y esquinas en corchete, como el resto de etiquetas de la web.
      ctx.strokeStyle = rule;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h - 0.5);
      ctx.lineTo(w, h - 0.5);
      for (const [cx, sx] of [
        [0.5, 1],
        [w - 0.5, -1],
      ] as const) {
        ctx.moveTo(cx + sx * 10, 0.5);
        ctx.lineTo(cx, 0.5);
        ctx.lineTo(cx, 10.5);
      }
      ctx.stroke();

      ctx.font = `300 11px ${font}`;
      text(`PRENDAS ${pad(score, 3)}`, 16, 20, "left", ink);
      text(`RÉCORD ${pad(best, 3)}`, w / 2, 20, "center", mute);
      text(
        `VIDAS ${"■".repeat(Math.max(0, lives))}${"□".repeat(LIVES - Math.max(0, lives))}`,
        w - 16,
        20,
        "right",
        ink,
      );

      // Las piezas caen por debajo del marcador, sin pisarlo.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 36, w, h - 36);
      ctx.clip();
      ctx.font = `300 12px ${font}`;
      for (const it of items) {
        if (it.bad) {
          ctx.fillStyle = ink;
          ctx.fillRect(it.x - it.w / 2, it.y - 10, it.w, 20);
          text(it.label, it.x, it.y + 1, "center", paper);
        } else {
          text(`[ ${it.label} ]`, it.x, it.y + 1, "center", ink);
        }
      }
      ctx.restore();

      // Bolsa: corchetes con una línea de fondo; parpadea al recibir un 50X.
      const half = bagW() / 2;
      const by = bagY();
      const bagInk = hurt > 0 && Math.floor(hurt * 20) % 2 === 0 ? mute : ink;
      ctx.strokeStyle = bagInk;
      ctx.lineWidth = caught > 0 ? 2 : 1.25;
      ctx.beginPath();
      ctx.moveTo(x - half, by - 8);
      ctx.lineTo(x - half, by + 8);
      ctx.lineTo(x + half, by + 8);
      ctx.lineTo(x + half, by - 8);
      ctx.stroke();
      ctx.font = `300 10px ${font}`;
      text("EMER", x, by + 1, "center", bagInk);

      if (phase !== "play") {
        ctx.font = `300 12px ${font}`;
        const mid = h / 2 - 10;
        if (phase === "over") {
          text(
            `FIN · ${score} ${score === 1 ? "PRENDA" : "PRENDAS"}`,
            w / 2,
            mid - 26,
            "center",
            ink,
          );
        }
        text(
          phase === "over" ? "[ OTRA PARTIDA ]" : "[ PULSA PARA JUGAR ]",
          w / 2,
          mid,
          "center",
          ink,
        );
        ctx.font = `300 11px ${font}`;
        text("ATRAPA PRENDAS · ESQUIVA LOS 50X", w / 2, mid + 24, "center", mute);
      }
    };

    const fromPointer = (event: PointerEvent) => {
      target = event.clientX - wrap.getBoundingClientRect().left;
    };
    const onMove = (event: PointerEvent) => fromPointer(event);
    const onDown = (event: PointerEvent) => {
      fromPointer(event);
      if (phase !== "play") start();
    };
    const onKey = (down: boolean) => (event: KeyboardEvent) => {
      const k = event.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") keys.left = down;
      else if (k === "ArrowRight" || k === "d" || k === "D") keys.right = down;
      else if (down && (k === " " || k === "Enter")) {
        if (phase !== "play") start();
      } else return;
      event.preventDefault();
    };
    const onKeyDown = onKey(true);
    const onKeyUp = onKey(false);
    const onBlur = () => {
      keys.left = keys.right = false;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(wrap);
    resize();
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("keydown", onKeyDown);
    wrap.addEventListener("keyup", onKeyUp);
    wrap.addEventListener("blur", onBlur);

    const stop = subscribe((_time, deltaMs) => {
      step(Math.min(0.05, deltaMs / 1000));
      draw();
    }, wrap);

    return () => {
      stop();
      observer.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("keydown", onKeyDown);
      wrap.removeEventListener("keyup", onKeyUp);
      wrap.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <button
      ref={box}
      className={styles.game}
      type="button"
      aria-label="Minijuego mientras esperas: mueve la bolsa con el ratón, el dedo o las flechas para atrapar prendas y esquivar los errores 502, 503 y 504. Enter o espacio para empezar."
      data-wake-game
    >
      <canvas ref={canvas} className={styles.canvas} />
    </button>
  );
}
