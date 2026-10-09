---
name: gsap-patterns
description: Patrones de GSAP, ScrollTrigger y Lenis para React/Next.js en este proyecto. Úsala al crear o modificar cualquier animación, timeline o efecto de scroll.
---

# GSAP en Emer Web

## Reglas base

- Los plugins se registran **solo** en `src/lib/gsap.ts`. Importa siempre desde ahí: `import { gsap, ScrollTrigger } from "@/lib/gsap"`.
- Usa `useGSAP` de `@gsap/react` (limpia solo). Siempre con `scope` y `dependencies`.
- Anima solo `transform` (`x`, `y`, `scale`, `rotate`) y `opacity`.
- Respeta reduced-motion con `gsap.matchMedia()`.

## Plantilla de componente

```tsx
"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export function Section() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-reveal]", {
          y: 40,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: { trigger: root.current, start: "top 75%" },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-reveal]", { clearProps: "all" });
      });
    },
    { scope: root },
  );

  return <section ref={root}>{/* ... */}</section>;
}
```

## Timelines

- Un `gsap.timeline({ defaults: { ease: "power3.out", duration: 0.8 } })` por secuencia; usa labels y posiciones relativas (`"<"`, `"+=0.2"`) en vez de delays sueltos.
- `gsap.quickTo` / `quickSetter` para seguir el cursor (nunca recrear tweens por `mousemove`).
- Texto: separar en líneas/palabras con `SplitText` solo si está disponible; si no, partir en servidor y marcar con `data-*`.

## ScrollTrigger

- `scrub: 0.5`–`1` para suavizar; `invalidateOnRefresh: true` si hay medidas dependientes del viewport.
- `pin` con `pinSpacing` explícito; verificar en móvil.
- Para listas largas, `ScrollTrigger.batch`.
- Nunca dejar `markers: true` en commits.
- Tras cambios de layout asíncronos (fuentes, imágenes), `ScrollTrigger.refresh()` una sola vez.

## Lenis

- Instancia única en `src/lib/motion/scroll.ts` (la monta `Providers`), con `autoRaf: false` y sobre `gsap.ticker`. No crear otras instancias.
- Scroll programático siempre con `scrollTo` / `scrollToSection` / `snapToContent` de `@/lib/motion/scroll` (funcionan también sin Lenis).
- Con movimiento reducido no hay Lenis ni snap.
- El hero se registra desde su propia sección: `useEffect(() => registerHero(el), [])`. Hoy lo hace `HomeMotion`; cuando exista 03-hero, el registro pasa a esa sección.
- El snap del hero usa `virtualScroll`: si el guard devuelve `false`, hay que llamar a `event.preventDefault()` a mano (Lenis no lo hace).

## Ticker y visibilidad

```ts
import { subscribe } from "@/lib/motion/ticker";

// Dentro de useGSAP / useEffect:
const off = subscribe((time, dt) => {
  // solo escribir transform/opacity; dt ya viene acotado a 50 ms
}, { el: sectionEl });          // se pausa sola fuera de pantalla
return off;
```

- `essential: true` solo para lo que debe seguir con movimiento reducido (línea de progreso).
- Nunca leer layout dentro del callback: cachear medidas en resize.

## Easings del diseño

`import { EASE } from "@/lib/gsap"` → `EASE.outExpo` (transforms), `EASE.standard` (opacidad), `EASE.inOutQ`, `EASE.reveal`, `EASE.back`, `EASE.curtain`.

## Rendimiento

- `force3D: true` solo si hay parpadeos; `will-change: transform` aplicado por GSAP durante el tween, no fijo en CSS.
- Evitar animar elementos con `backdrop-filter` o `filter: blur()` grandes.
- Medir con el panel Performance de Chrome (sin long tasks > 50 ms durante el scroll).

## Checklist antes de terminar

- [ ] Solo `transform`/`opacity`
- [ ] Dentro de `useGSAP` con `scope`
- [ ] Rama reduced-motion
- [ ] Sin `markers`
- [ ] Revisado con `animation-perf-reviewer`
