@AGENTS.md

# Emer Web

Web de marketing/descubrimiento de **Emer** (marketplace de marcas de streetwear españolas). Muy animada, 100% fluida. El backend es el proyecto KMP desplegado en Render; esta web **nunca** habla con la BDD directamente.

## Stack

- Next.js (App Router, Cache Components) + TypeScript estricto + Tailwind v4
- GSAP + ScrollTrigger (animación), Lenis (scroll suave), Motion (solo transiciones de UI/rutas)
- Biome (lint + formato), Playwright (e2e + capturas), Lighthouse CI
- pnpm. Node >= 22

## Comandos

- `pnpm dev` · `pnpm build` · `pnpm start`
- `pnpm check` = typecheck + lint + build (ejecutar antes de dar algo por terminado)
- `pnpm lint:fix` · `pnpm test` · `pnpm lhci`
- Tests e2e con un Chromium ya instalado: `PLAYWRIGHT_CHROMIUM_PATH=/ruta/a/chrome pnpm test`
- Sin backend: `EMER_API_FIXTURES=1 pnpm dev` (datos de ejemplo de `src/lib/api/fixtures.ts`; los tests e2e los usan siempre)

## Arquitectura

```
src/
  app/                 rutas (Server Components por defecto)
  components/
    providers/         Providers (layout): ticker, Lenis, atajos del buscador, fin de carga y cursor
    shell/             cursor, HomeMotion (registra hero y secciones de la home), FocusOnMount
    sections/          una carpeta por sección: <seccion>-section.tsx (servidor: datos) + componente cliente animado
    ui/                primitivas reutilizables
  lib/
    gsap.ts            ÚNICO sitio donde se registran plugins GSAP y easings (EASE)
    format.ts          upper, domain, price, pad2, norm (derivados del handoff)
    config/sections.ts ids, etiquetas y orden de las secciones
    motion/
      ticker.ts        reloj único (gsap.ticker): subscribe(fn, { el, essential })
      scroll.ts        Lenis + snap; registerHero(el), scrollTo, scrollToSection, snapToContent
      in-view.ts       IntersectionObserver compartido: observe(el, cb)
      bus.ts           eventos globales tipados (emer:loaded, hero:step, section:change...)
      cursor.ts        cursor.set('drag') / cursor.clear()
      reduced.ts       prefers-reduced-motion reactivo
      shortcuts.ts     ⌘K, «/», ←/→, AvPág/Espacio
    api/               cliente tipado del backend KMP (solo servidor)
```

Contrato de diseño de cada sección: `design/handoff/<sección>.md` (referencias visuales en `design/referencia/`, no se lintan). Assets de producción en `public/assets/`.
Pendientes aplazados para el final: `docs/PENDIENTES.md` (añadir ahí cualquier cosa que se aplace).

## Reglas de animación (obligatorias)

1. Animar **solo `transform` y `opacity`**. Nunca `top/left/width/height/margin`.
2. Todo componente animado es `"use client"`; el contenido estático se queda en servidor.
3. Usar `useGSAP` de `@gsap/react` con `scope` y `dependencies`; nada de `useEffect` + `gsap.to` sin `gsap.context`.
4. Todo ScrollTrigger se crea dentro de un contexto GSAP para que se limpie solo.
5. Respetar `prefers-reduced-motion` con `gsap.matchMedia()`: versión sin movimiento o estática.
6. Un solo reloj: `gsap.ticker`. Lenis corre sobre él y el resto se suscribe con `subscribe()` de `lib/motion/ticker.ts` (pasando `el` si depende de una sección). Prohibido `requestAnimationFrame` y `setInterval` para animar.
10. Cursor: los estados se declaran con `data-cursor="prod|hero|link"` o con `cursor.set()`. Nunca se anima width/height, solo `scale` y `opacity`.
11. Eventos entre secciones por `bus` (nada de `window.dispatchEvent` sueltos).
12. `Providers` vive en el layout y no se desmonta al navegar: nunca guardar ahí nodos de una página. Lo que depende del DOM de una página se registra desde esa página y devuelve su limpieza (`registerHero`, `initHeroKeys`, `initSectionTracking`).
13. Atajos de una sola tecla solo con el foco neutro (documento o `main`), nunca dentro de controles.
7. `will-change` solo durante la animación, nunca permanente. Evitar `filter: blur` grande y `box-shadow` animado.
8. Imágenes/vídeo con dimensiones explícitas (sin CLS). Fuentes con `next/font`.
9. Presupuesto: Lighthouse perf ≥ 0.9, CLS ≤ 0.05, TBT ≤ 200 ms.

## Datos / backend

- Lecturas en servidor con `"use cache"` + `cacheLife` + `cacheTag`; esto además amortigua los cold starts de Render.
- Contrato del backend: `docs/API_CONTRACT.md` (fuente de verdad). Cliente en `src/lib/api/`; importar siempre desde `@/lib/api`. Variables en `.env` (ver `.env.example`). Nunca exponer secretos al cliente.
- Si falta un endpoint público de lectura en el backend, pedirlo/anotarlo; no saltarse el backend.

## Convenciones

- TypeScript sin `any`; `import type` para tipos.
- Componentes en kebab-case de archivo, PascalCase de export.
- Accesibilidad: HTML semántico, foco visible, contraste AA, animaciones no esenciales para la información.
- Antes de importar diseño de Claude Design, usar la skill `design-import`.

## Agentes y skills del proyecto

- Agentes (`.claude/agents/`): `animation-perf-reviewer`, `design-fidelity-reviewer`, `a11y-reviewer`, `code-reviewer`
- Skills (`.claude/skills/`): `gsap-patterns`, `design-import`, `emer-api-client`
- Hooks (`.claude/settings.json`): formato/lint tras editar y typecheck al terminar
