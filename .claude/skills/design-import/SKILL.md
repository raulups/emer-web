---
name: design-import
description: Convierte un diseño exportado de Claude Design (.dc.html) en componentes React/Next.js con Tailwind v4 y GSAP, conservando la coreografía de animación. Úsala al traer una pantalla nueva del diseño.
---

# Importar diseño de Claude Design

## Entrada

Guarda el HTML exportado en `design/<nombre>.dc.html`. Es la referencia única de verdad.

## Proceso

1. **Inventario**: lee el HTML y lista (a) tokens (colores, tipografías, escala de espaciado, radios, sombras), (b) secciones, (c) textos, (d) animaciones: elemento, propiedad, duración, easing, delay, disparador (carga / scroll / hover).
2. **Tokens primero**: vuelca colores, fuentes y escalas en `@theme` de `src/app/globals.css`. Nada de valores mágicos en los componentes.
3. **Estructura**: una sección = un componente en `src/components/sections/`. Contenido estático en servidor; solo la capa de animación en un componente `"use client"` o un wrapper fino.
4. **Marcado semántico**: `header/nav/main/section/footer`, un `h1`, enlaces y botones correctos. Los elementos a animar se marcan con `data-*` (`data-reveal`, `data-parallax`...).
5. **Animación**: traducir cada animación del diseño a GSAP siguiendo la skill `gsap-patterns`. Mantener duraciones y easings; si el diseño usa CSS `cubic-bezier`, usar `CustomEase` o el equivalente más cercano.
6. **Assets**: imágenes con `next/image` y dimensiones; SVGs inline si se animan; vídeos con `poster` y sin audio.
7. **Responsive**: el diseño cubre desktop; definir y probar breakpoints móviles y degradar animaciones pesadas en táctil.
8. **Verificación**: ejecutar `pnpm check`, y lanzar `design-fidelity-reviewer`, `animation-perf-reviewer` y `a11y-reviewer`.

## Reglas

- No inventar contenido ni animaciones que no estén en el diseño; si algo es ambiguo, anotarlo y preguntar.
- No copiar el CSS del HTML tal cual: reescribir con utilidades de Tailwind y tokens.
- Mantener nombres de elementos del diseño en los comentarios `data-*` para poder compararlos después.
