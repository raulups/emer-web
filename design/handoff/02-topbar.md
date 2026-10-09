# 02-topbar — Handoff

Dos piezas fijas:
- **Scroll-hint**: línea de progreso con la sección actual y «MENÚ ↑». Se ve fuera del hero cuando el header está oculto.
- **Header**: blanco, se revela al acercar el cursor arriba (o al hacer scroll hacia arriba en táctil).

## 1. Estructura y textos
```html
<div class="scroll-hint" aria-hidden="true">
  <div class="hint__track"><div class="hint__fill"></div></div>
  <div class="hint__label">
    <span class="hint__section">EMERGENTES</span>
    <span class="hint__rule"></span>
    <span>MENÚ ↑</span>
  </div>
</div>

<header class="topbar">
  <a href="#marcas" class="topbar__logo"><img src="/brand/emer-logo-black.webp" alt="Emer" width="66" height="24" /></a>
  <nav aria-label="Secciones">
    <a href="#marcas"      aria-current="true"><small>01</small> MARCAS</a>
    <a href="#emergentes"><small>02</small> EMERGENTES</a>
    <a href="#catalogo"><small>03</small> CATÁLOGO</a>
    <a href="#marketplace"><small>04</small> MARKETPLACE</a>
  </nav>
  <button class="topbar__search" type="button">BUSCAR <span class="loop-line"></span> <kbd>⌘K</kbd></button>
</header>
```

**Textos fijos:**
- MENÚ ↑
- 01 MARCAS · 02 EMERGENTES · 03 CATÁLOGO · 04 MARKETPLACE
- BUSCAR · ⌘K
- Etiquetas del hint: MARCAS / EMERGENTES / CATÁLOGO / MARKETPLACE / SUGIERE (esta última es **propuesta** de 00-shell)

**Layout del scroll-hint:**
- Fijo arriba, 26px de alto, `z-index: 99`, `mix-blend-mode: difference`, color blanco, `pointer-events: none`.
- Track de 2px a `rgba(255,255,255,.22)`, relleno blanco.
- Etiqueta centrada a 10px del borde superior, Fraunces 8px, tracking .3em, gap 12px, raya de 22×1.

**Layout del header:**
- Fijo, 60px, `z-index: 100`, fondo blanco, `border-bottom` de 1px negro.
- Grid `1fr auto 1fr`, gap 20px, padding lateral `clamp(16px, 3vw, 40px)`.
- Logo de 24px de alto. Al hacer clic, scroll arriba.
- Nav solo a partir de 860px, gap `clamp(20px, 3vw, 44px)`.
  - Número en 7.5px, tracking .1em; etiqueta en 10px, tracking .26em.
  - Color: activo `#000`, resto `#8a8a8a`; en hover `#000` (.35s).
- Búsqueda: «BUSCAR» en 10px, tracking .3em; línea en bucle de 34×1; «⌘K» en 8.5px `#8a8a8a`, solo a partir de 860px.

## 2. Coreografía
| Elemento | Propiedad | Duración | Easing | Disparador |
|---|---|---|---|---|
| Header: aparecer y ocultarse | translateY -101 % ↔ 0 | .6s | out-expo | ver reglas abajo |
| Scroll-hint | opacity 0 ↔ 1 | .45s | standard | visible = pasado el hero **y** header oculto |
| Relleno del hint | scaleX = scrollY / (alto del documento − vh), origen izquierda | continuo (ticker, `essential`) | — | scroll |
| Etiqueta de sección | cambio de texto sin animar | — | — | `section:change` |
| Subrayado de la nav | scaleX 0 ↔ 1, origen izquierda | .6s | out-expo | sección activa |
| Color de la nav | color | .35s | — | activa u hover (**EXCEPCIÓN**: color, sin bucle) |
| Línea de BUSCAR (bucle) | scaleX 0 → 1 con origen izquierda; luego 1 → 0 con origen derecha | 1.8s infinito | in-out `(.65,0,.35,1)` | siempre visible |

**Reglas de visibilidad del header:**
- «Pasado el hero» = `hero.getBoundingClientRect().bottom <= 64`.
- **Puntero fino:** se abre con `pointerY < 56` y se cierra con `pointerY > 96` (histéresis).
- **Táctil:** se abre con una velocidad de scroll suavizada `< -4 px/frame` y se cierra con `> 4`. Suavizado: `v += (dy - v) * .2`.
- Se fuerza abierto mientras el buscador está abierto.
- Dentro del hero nunca se muestra (el hero tiene su propio BUSCAR).

**Clic en la nav:** `lenis.scrollTo('#id', { offset: -64, duration: 1.2 })`.

**Línea en bucle** (keyframes compartidas, se reutilizan en 05, 06, 07 y 09):
```css
@keyframes emLine{0%{transform:scaleX(0);transform-origin:0 50%}50%{transform:scaleX(1);transform-origin:0 50%}50.01%{transform:scaleX(1);transform-origin:100% 50%}100%{transform:scaleX(0);transform-origin:100% 50%}}
```
Como es un bucle CSS (compositor), no pasa por el ticker. Se pausa fuera de pantalla con `animation-play-state` y una clase que pone inView.

## 3. Movimiento reducido
- Header: aparece y desaparece solo con opacity, en 150ms.
- Bucle de la línea: parado y visible a escala 1.
- El hint y su relleno se mantienen; el relleno es informativo.

## 4. Assets
| Asset | Tamaño |
|---|---|
| `brand/emer-logo-black.webp` (+ `.png` de fallback) | 333×121 originales; se muestra a 66×24 |

## 5. Datos
**No consume backend.** La lista de secciones es el `SECTIONS` fijo de 00-shell.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Oculto (`is-loading`). |
| Vacío | Si una sección no se monta (0 datos), su enlace de la nav desaparece. |
| Error | Sin JS: header estático visible arriba (`position: sticky`, sin `transform`) mediante una regla en `<noscript>`. |
| Pantalla estrecha (<860px) | Logo + BUSCAR, sin nav ni ⌘K. |

## Prompt para Claude Code
> Implementa `components/Topbar.tsx` (header + scroll-hint) según `handoff/02-topbar.md`. El header se mueve solo con translateY (.6s out-expo) y respeta la histéresis de 56 / 96px en puntero fino y la velocidad de scroll en táctil. El hint usa opacity .45s y un relleno con scaleX desde un subscriber `essential` del ticker. Escucha `section:change` para la etiqueta y el estado activo de la nav, y los eventos del buscador para forzar el header abierto. Pon la keyframe `emLine` en globals.css y crea un componente `<LoopLine width={34} />` reutilizable. La nav navega con `lenis.scrollTo` y offset -64. Implementa también movimiento reducido y los estados.
