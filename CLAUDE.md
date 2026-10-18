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
- Backend: `EMER_API_URL` en `.env.local` (pública: https://emerapp.onrender.com). Sin backend: `EMER_API_FIXTURES=1 pnpm dev` (datos de ejemplo de `src/lib/api/fixtures.ts`; los tests e2e los usan siempre)

## Arquitectura

```
src/
  proxy.ts             web de móvil: en un teléfono (user-agent) `/` y `/web` se sirven desde `/m`; tablets y ordenadores, web completa
  app/                 rutas: `/` Landing, `/web` Shell (Marketplace / Explora; `?brand=<uuid>` preselecciona marcas; `/marketplace` redirige aquí), `/m` web de móvil (interna, solo Marketplace)
  app/api/products/    rutas internas: el cliente pide aquí (el backend no admite CORS del navegador)
  components/          componentes; cursor.tsx = cursor propio global (layout)
    shell/             Shell + switch MARKETPLACE / EXPLORA
    mobile/            web de móvil: shell sin switch + aviso «descarga la app» (una vez por sesión; enlaces en `lib/app-links.ts`)
    landing/           Landing: `landing.tsx` (un bucle por scroll), túnel de marcas (servidor + Suspense)
    explora/           Explora: `explora.tsx` (un bucle por scroll). Los componentes conservan el nombre de su posición original: `populares`→Destacados, `novedades`→Populares, `emergentes`→Novedades, `catalogo`→Emergentes
    marketplace/       sección de servidor (datos) + cliente (filtros, menú, panel, grid, tarjeta)
    ui/                halo, bracket-label (letras + corchetes + línea)
  fonts/Inter.woff2    única fuente (variable 100–900, subconjunto latino)
  styles/
    theme.css          tokens: color, --font, --w-*, tracking, easings, halo, @font-face
    theme.ts           los mismos tokens para JS (EASE, LERP, WEIGHT)
  lib/
    data.ts            lecturas con la forma de las tablas del README del handoff (solo servidor)
    format.ts          reglas puras: price, discount, órdenes de marcas, fallback de imagen
    marketplace.ts     filtros ↔ query de la API, validación de /api/products, tamaño de imagen
    explora-data.ts    Explora: Destacados, Populares, Novedades y Emergentes por tag de marca (`explora-tags.ts`), con sus piezas (solo servidor)
    marketplace-data.ts página del Marketplace + recuento de ofertas (solo servidor)
    motion/            `ticker.ts` (único reloj), `write.ts` (estilos cacheados), `math.ts` (lerp 0.14, easings), `scroll.ts` (Lenis: `SMOOTH_SCROLL`, `scrollToY`, `lockScroll`; todo scroll programático pasa por aquí)
    api/               cliente tipado del backend KMP (solo servidor)
```

Contrato de diseño: `design_handoff_emer_web/README.md` (prototipos en `design_handoff_emer_web/referencia/`, no se lintan; ante la duda manda su código). Assets de producción en `public/assets/`.
Pendientes aplazados para el final: `docs/PENDIENTES.md` (añadir ahí cualquier cosa que se aplace).

## Reglas de animación (obligatorias)

1. Animar **solo `transform` y `opacity`**. Nunca `top/left/width/height/margin`.
2. Todo componente animado es `"use client"`; el contenido estático se queda en servidor.
3. Usar `useGSAP` de `@gsap/react` con `scope` y `dependencies`; nada de `useEffect` + `gsap.to` sin `gsap.context`.
4. Todo ScrollTrigger se crea dentro de un contexto GSAP para que se limpie solo.
5. Respetar `prefers-reduced-motion` con `gsap.matchMedia()`: versión sin movimiento o estática.
6. Un solo reloj: `gsap.ticker`. Lo ligado al scroll va en un único bucle suscrito con `subscribe()`, que suaviza con `lerpTo` (`s += (t − s)·0.14`) y escribe estilos en nodos con `write()` (nada de estado de React por frame). Lenis corre sobre él y el resto se suscribe con `subscribe()` de `lib/motion/ticker.ts` (pasando `el` si depende de una sección). Prohibido `requestAnimationFrame` y `setInterval` para animar.
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
- Estilos de sección complejos (hover, :has(), estados): CSS module junto al componente. Solo `globals.css` pasa por Tailwind (regla de Turbopack); los tokens están disponibles como variables gracias a `@theme static`.
- Cada sección real se registra a sí misma con `trackSection(el, id)` al montarse y su fallback de Suspense tiene la misma geometría.

## Agentes y skills del proyecto

- Agentes (`.claude/agents/`): `animation-perf-reviewer`, `design-fidelity-reviewer`, `a11y-reviewer`, `code-reviewer`
- Skills (`.claude/skills/`): `gsap-patterns`, `design-import`, `emer-api-client`
- Hooks (`.claude/settings.json`): formato/lint tras editar y typecheck al terminar
