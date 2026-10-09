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

- Instancia única en `SmoothScroll`, con `autoRaf: false` y sincronizada con el ticker de GSAP:

```ts
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);
```

- Destruir en el cleanup. Desactivar en reduced-motion.
- Anclas y scroll programático con `lenis.scrollTo`.

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
