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

## Arquitectura

```
src/
  app/                 rutas (Server Components por defecto)
  components/
    providers/         SmoothScroll y otros providers cliente
    sections/          secciones de la web (Hero, ...)
    ui/                primitivas reutilizables
  hooks/               hooks cliente (useGsap...)
  lib/
    gsap.ts            ÚNICO sitio donde se registran plugins GSAP
    api/               cliente tipado del backend KMP (solo servidor)
```

## Reglas de animación (obligatorias)

1. Animar **solo `transform` y `opacity`**. Nunca `top/left/width/height/margin`.
2. Todo componente animado es `"use client"`; el contenido estático se queda en servidor.
3. Usar `useGSAP` de `@gsap/react` con `scope` y `dependencies`; nada de `useEffect` + `gsap.to` sin `gsap.context`.
4. Todo ScrollTrigger se crea dentro de un contexto GSAP para que se limpie solo.
5. Respetar `prefers-reduced-motion` con `gsap.matchMedia()`: versión sin movimiento o estática.
6. Un solo bucle: Lenis se sincroniza con `gsap.ticker` (ver `smooth-scroll.tsx`). No añadir otros `requestAnimationFrame` paralelos.
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
