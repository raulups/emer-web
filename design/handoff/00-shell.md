# 00-shell — Handoff

Stack: Next.js (App Router) + TypeScript + Tailwind v4 + GSAP/ScrollTrigger + Lenis.
Alcance: layout raíz, fuentes, scroll (Lenis + snap del hero), ticker único, inView, cursor, atajos globales, bus de eventos. Sin UI visible salvo el cursor.

Archivos propuestos:
```
app/layout.tsx            raíz + fuentes + <Providers>
app/providers.tsx         'use client' — monta scroll, ticker, cursor, atajos
app/globals.css           @theme + resets
lib/motion/ticker.ts      reloj único
lib/motion/scroll.ts      Lenis + ScrollTrigger + snap del hero
lib/motion/inView.ts      IntersectionObserver compartido
lib/motion/reduced.ts     prefers-reduced-motion reactivo
lib/motion/bus.ts         eventos globales tipados
components/Cursor.tsx
```

---

## 1. Estructura semántica y textos

```html
<html lang="es" class="is-loading">
<body>
  <a class="skip-link" href="#contenido">Saltar al contenido</a>

  <div class="cursor" aria-hidden="true">
    <div class="cursor__press">
      <span class="cursor__fill"></span>
      <span class="cursor__ring"></span>
      <span class="cursor__bar"></span>
      <span class="cursor__label"></span>
    </div>
  </div>

  <!-- 01-loader -->
  <div id="loader"></div>

  <!-- 02-topbar -->
  <div class="scroll-hint" aria-hidden="true"></div>
  <header class="topbar"></header>

  <main id="contenido">
    <section id="marcas"      data-section="MARCAS"      aria-label="Marcas destacadas"></section>
    <section id="emergentes"  data-section="EMERGENTES"  aria-label="Marcas emergentes"></section>
    <section id="catalogo"    data-section="CATÁLOGO"    aria-label="Catálogo de marcas"></section>
    <section id="marketplace" data-section="MARKETPLACE" aria-label="Marketplace"></section>
    <section id="sugiere"     data-section="SUGIERE"     aria-label="Sugiere una marca"></section>
  </main>

  <!-- 08-footer -->
  <footer></footer>

  <!-- 09-buscar -->
  <div id="buscar" role="dialog" aria-modal="true" aria-label="Buscar marcas" hidden></div>

  <div id="announcer" class="sr-only" aria-live="polite"></div>
</body>
</html>
```

Textos (fijos):
| Clave | Texto | Origen |
|---|---|---|
| `<title>` | Emer — Marcas pequeñas, un solo sitio | footer del diseño |
| meta description | Descubre marcas pequeñas de moda y compra en sus tiendas desde un solo sitio. | **propuesta** |
| skip link | Saltar al contenido | **propuesta** (accesibilidad) |
| Etiquetas de sección (scroll-hint) | MARCAS · EMERGENTES · CATÁLOGO · MARKETPLACE | diseño |
| Etiqueta de Sugiere | SUGIERE | **propuesta**: en el diseño se queda en MARKETPLACE |
| Etiquetas del cursor | VER · ← → · ARRASTRA | diseño |

Notas:
- `cursor: none` solo se aplica con `html.has-cursor`, una clase que añade JS al montar el cursor. En el diseño estaba en `*` sin condición, y sin JS te quedarías sin puntero.
- `html.is-loading` bloquea el scroll hasta el evento `emer:loaded` (que dispara 01-loader).

globals.css (resumen):
```css
@import "tailwindcss";
@theme { /* tokens del inventario */ }
html,body{margin:0;background:#fff;color:#000;font-family:var(--font-serif);-webkit-font-smoothing:antialiased}
html.is-loading{overflow:hidden}
html.lenis,html.lenis body{height:auto}
.lenis.lenis-stopped{overflow:hidden}
::selection{background:#000;color:#fff}
a{color:#000} a:hover{color:#3f3f3f}
@media (hover:hover) and (pointer:fine){ html.has-cursor, html.has-cursor *{cursor:none!important} }
.skip-link{position:fixed;left:16px;top:-48px;z-index:10001;background:#000;color:#fff;padding:10px 14px;font:400 10px var(--font-serif);letter-spacing:.24em}
.skip-link:focus{top:16px}
```

---

## 2. Coreografía

### 2.1 Ticker único (`lib/motion/ticker.ts`)
Fuente de tiempo: `gsap.ticker`, el único rAF de toda la app. Lenis también corre sobre él.

```ts
type Sub = { fn: (t: number, dt: number) => void; active: boolean; el?: Element };
const subs = new Set<Sub>();
let running = true;

gsap.ticker.lagSmoothing(0);
gsap.ticker.add((time, deltaMs) => {
  if (!running) return;
  for (const s of subs) if (s.active) s.fn(time * 1000, deltaMs);
});

export function subscribe(fn: Sub['fn'], opts: { el?: Element } = {}) {
  const s: Sub = { fn, active: !opts.el, el: opts.el };
  subs.add(s);
  const off = opts.el ? observe(opts.el, v => (s.active = v)) : () => {};
  return () => { subs.delete(s); off(); };
}

document.addEventListener('visibilitychange', () => {
  running = !document.hidden;
  document.hidden ? gsap.ticker.sleep() : gsap.ticker.wake();
});
```
Reglas:
- Ningún componente llama a `requestAnimationFrame` ni a `setInterval` para animar.
- Toda suscripción ligada a una sección pasa `el`, para que se pause sola fuera de pantalla.
- En el callback solo se escriben `transform` y `opacity`. Nada de leer layout (`getBoundingClientRect`) en cada frame: los rects se cachean en `resize` y en `ScrollTrigger.refresh`.
- Al volver de una pestaña oculta, el primer `dt` llega grande. Los subscribers que integran (lerp, autoplay) hacen `dt = Math.min(dt, 50)`.

### 2.2 inView (`lib/motion/inView.ts`)
Un solo `IntersectionObserver` compartido, con `rootMargin: '10% 0px'` y `threshold: 0`.
```ts
export function observe(el: Element, cb: (visible: boolean) => void): () => void
```
Lo usan el ticker (pausa por sección), el autoplay del hero y los revelados genéricos.

### 2.3 Scroll: Lenis + ScrollTrigger (`lib/motion/scroll.ts`)
```ts
const lenis = new Lenis({
  duration: 1.1,
  easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),   // expo out
  smoothWheel: true,
  syncTouch: false,                                          // táctil nativo
  virtualScroll: e => heroSnapGuard(e),                      // false = Lenis ignora el evento
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add(t => lenis.raf(t * 1000));
lenis.stop();                                                // arranca parado (loader)
bus.on('emer:loaded', () => { document.documentElement.classList.remove('is-loading'); lenis.start(); });
bus.on('emer:search:open',  () => lenis.stop());
bus.on('emer:search:close', () => lenis.start());
```

### 2.4 Snap del hero (coordinación con Lenis)
El hero mide 100vh, con un mínimo de 560px. `H = heroEl.offsetHeight` se cachea en resize.

```ts
let snapping = false, lastStep = 0;
function heroSnapGuard({ deltaX, deltaY, event }): boolean {
  if (!ready || searchOpen) return true;
  const y = lenis.scroll;
  if (y > H + 4) return true;                      // fuera del hero → Lenis normal
  if (snapping) return false;                      // tragar rueda durante el snap
  const ax = Math.abs(deltaX), ay = Math.abs(deltaY);
  if (ax > ay && y < 4) {                          // rueda horizontal → cambiar marca
    const now = performance.now();
    if (ax > 12 && now - lastStep > 700) { lastStep = now; bus.emit('hero:step', deltaX > 0 ? 1 : -1); }
    return false;
  }
  if (ay < 4) return true;
  if (deltaY > 0 && y < H - 4) { snapTo(H); return false; }
  if (deltaY < 0 && y > 4)     { snapTo(0); return false; }
  return true;
}
function snapTo(target: number) {
  snapping = true;
  lenis.scrollTo(target, {
    duration: 0.95,
    easing: t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2,   // cubic in-out
    lock: true,
    onComplete: () => setTimeout(() => (snapping = false), 520),     // enfriamiento anti-inercia
  });
}
export const snapToContent = () => snapTo(H);       // lo usa el swipe hacia arriba del hero
```
- **Táctil**: Lenis no intercepta. El hero detecta el swipe por su cuenta: `dy < -50` llama a `snapToContent()`, y `|dx| > 50` emite `hero:step`.
- **Teclado**: ←/→ emiten `hero:step` solo si el hero está en pantalla y el foco no está en un input. AvPág/Espacio desde el hero llaman a `snapTo(H)`.
- **Anclas de la nav**: `lenis.scrollTo('#catalogo', { offset: -64, duration: 1.2 })`.

### 2.5 Cursor (`components/Cursor.tsx`)
Solo se monta si `matchMedia('(hover:hover) and (pointer:fine)')` es verdadero y no hay movimiento reducido. Capa `position: fixed`, `z-index: 10000`, `pointer-events: none`, `mix-blend-mode: difference`.

**Capas (tamaño base fijo; solo se anima `scale` y `opacity`):**
| Capa | Base | Estilo |
|---|---|---|
| `.cursor__fill` | 86×86, círculo | fondo #fff |
| `.cursor__ring` | 64×64, círculo | borde 1.5px #fff, transparente |
| `.cursor__bar` | 2×26 | fondo #fff |
| `.cursor__label` | — | Fraunces 400, 8px, tracking .24em, sin escalar |
| `.cursor__press` | contenedor | escala de pulsación |

El aro tiene capa propia porque, si se escalara el relleno, el borde engordaría o adelgazaría con él. Con base 64px y borde 1.5px, en el estado `link` (scale .75) el borde queda en ≈1.1px.

**Estados:**
| Estado | Disparador | fill scale / op | ring scale / op | bar op | label | Color del label |
|---|---|---|---|---|---|---|
| `default` | — | 0.14 / 1 (≈12px) | 0.75 / 0 | 0 | — | — |
| `link` | `a, button, label, [data-cursor=link]` | 0.14 / 0 | 0.75 / 1 (≈48px) | 0 | — | — |
| `prod` | `[data-cursor=prod]` | 1 / 1 (86px) | 0.75 / 0 | 0 | VER | #000 |
| `drag` | override del hero mientras arrastras (`|dx| > 10`) | 0.744 / 1 (64px) | 0.75 / 0 | 0 | ← → | #000 |
| `hero` | `[data-cursor=hero]` | 0.14 / 0 | 1 / 1 (64px) | 0 | ARRASTRA | #fff |
| `type` | `input, textarea, [contenteditable]` | 0.14 / 0 | 0.75 / 0 | 1 | — | — |
| `hidden` | el puntero sale de la ventana | — | — | — | — | contenedor op 0 |

**Prioridad**: override (`drag`) > `type` > `prod` > `link` > `hero` > `default`. Se resuelve con `target.closest()` en `pointerover`, no en cada frame. Así se sustituye el sniffing de `style*="cursor: pointer"` del diseño.

**Animaciones:**
| Qué | Propiedad | Duración | Easing | Disparador |
|---|---|---|---|---|
| Seguimiento | `translate3d(x, y, 0)` sobre el contenedor; lerp de 0.22 por frame normalizado a 60 fps: `k = 1 - Math.pow(1 - .22, dt / 16.67)` | continuo | lerp | ticker |
| Cambio de tamaño | `scale` de fill y ring | 400ms | out-expo `(.16,1,.3,1)` | cambio de estado |
| Aparición de fill/ring/bar | `opacity` | 250ms | standard `(.4,0,.2,1)` | cambio de estado |
| Label | `opacity` (texto cambiado con el label a 0) | 200ms | standard | cambio de estado |
| Pulsación | `scale` de `.cursor__press`: 1 → .75 | 200ms | out-expo | `pointerdown` / `pointerup` |
| Entrar o salir de la ventana | `opacity` del contenedor 0 ↔ 1 | 200ms | standard | `pointerout` con `relatedTarget` nulo / `pointermove` |
| Primera aparición | el contenedor nace en opacity 0 y se coloca en la posición real antes de mostrarse (sin salto desde 0,0) | — | — | primer `pointermove` |

API para las secciones:
```ts
cursor.set('drag');   // override
cursor.clear();
```
O de forma declarativa con `data-cursor="prod|hero|link"` en el markup.

### 2.6 Atajos globales y bus (`lib/motion/bus.ts`)
| Tecla | Acción | Condición |
|---|---|---|
| ⌘K / Ctrl+K | `emer:search:open` | siempre |
| `/` | `emer:search:open` | foco fuera de un input |
| Esc | `emer:search:close` | buscador abierto (lo gestiona 09) |
| ← / → | `hero:step` (±1) | hero en pantalla, buscador cerrado, foco fuera de un input |

Eventos tipados: `emer:loaded`, `emer:search:open`, `emer:search:close`, `hero:step` (`{ dir: 1 | -1 }`), `section:change` (`{ id, label }`). Este último lo emite un ScrollTrigger por sección al cruzar el 45 % del viewport, y lo consume 02-topbar.

### 2.7 Orden de arranque
1. SSR: HTML con `is-loading`. Las fuentes ya vienen precargadas por `next/font`.
2. Hidratación de `<Providers>`: ticker, Lenis parado, registro de ScrollTrigger, inView.
3. Cursor montado: se añade `html.has-cursor` y el cursor espera al primer `pointermove`.
4. 01-loader emite `emer:loaded`: se quita `is-loading`, `lenis.start()` y `ScrollTrigger.refresh()`.
5. Las secciones registran sus timelines (ScrollTrigger) y sus subscribers (ticker, con `el`).
6. Desmontaje: cada `subscribe` devuelve su función de limpieza; Lenis se destruye con `lenis.destroy()` y los triggers con `ScrollTrigger.killAll()` al desmontar los providers.

---

## 3. Movimiento reducido (`prefers-reduced-motion: reduce`)
`lib/motion/reduced.ts` expone `isReduced()` y un listener de cambios. Si cambia en caliente, se re-inicializa.

| Elemento | Normal | Reducido |
|---|---|---|
| Lenis | activo | **no se crea**: scroll nativo; `scrollTo` pasa a `window.scrollTo({ behavior: 'auto' })` |
| Snap del hero | rueda → snap en 950ms | **eliminado**: scroll libre. La rueda horizontal sigue cambiando de marca, sin animación |
| Cursor | personalizado | **no se monta**: puntero nativo, sin `has-cursor` |
| Ticker | todos los subscribers | solo los marcados `{ essential: true }`, como la línea de progreso del scroll-hint |
| Revelados | translate + opacity | solo opacity en 200ms, sin desplazamiento |
| Bucles infinitos | activos | parados en su estado final o neutro |
| Autoplay del hero | 7s por marca | desactivado (lo detalla 03) |

---

## 4. Assets
| Asset | Formato | Tamaño / peso | Notas |
|---|---|---|---|
| Anton Regular | woff2, subconjunto latin + latin-ext | ~25 KB | `preload`, `display: swap` |
| Fraunces 300, 400, 300 italic | woff2, subconjunto latin + latin-ext (o 1 variable con eje wght e ital por separado) | ~30 KB por estilo | `preload` solo la 400 |
| Favicon | SVG + PNG 32 / 180 (apple-touch) | — | **pendiente**: no está en el diseño, hay que pasarlo |
| OG image | JPG 1200×630 | < 200 KB | **pendiente**, propuesta |

- Courier Prime: **no** se usa, se quita.
- Para evitar CLS al cambiar de la fuente de reserva a la final: `next/font` con `adjustFontFallback`, o `size-adjust` manual. Fallbacks: Anton → `Impact, "Arial Narrow", sans-serif`; Fraunces → `Georgia, serif`.
- El shell no tiene imágenes propias. El logo pertenece a 02/08 y los frames del gato a 01.

---

## 5. Datos dinámicos
**El shell no consume datos del backend.** Todo es contenido fijo o configuración:
```ts
// lib/config/sections.ts — FIJO
export const SECTIONS = [
  { id: 'marcas',      label: 'MARCAS',      n: '01', inNav: true  },
  { id: 'emergentes',  label: 'EMERGENTES',  n: '02', inNav: true  },
  { id: 'catalogo',    label: 'CATÁLOGO',    n: '03', inNav: true  },
  { id: 'marketplace', label: 'MARKETPLACE', n: '04', inNav: true  },
  { id: 'sugiere',     label: 'SUGIERE',     n: '05', inNav: false },
] as const satisfies ReadonlyArray<{ id: string; label: string; n: string; inNav: boolean }>;
```
Lo único que coordina sin poseerlo es el fin de carga (`emer:loaded`), que llega cuando 01-loader termina de precargar los datos y las imágenes de las secciones.

---

## 6. Estados
| Estado | Comportamiento |
|---|---|
| **Carga** | `html.is-loading` con el scroll bloqueado (Lenis parado y `overflow: hidden`). El cursor ya funciona. Si `emer:loaded` no llega en 5s, el shell lo fuerza: el diseño ya contemplaba un máximo de 5s. |
| **Vacío** | No aplica al shell. Cada sección gestiona su vacío. Si una sección no tiene datos, el shell la conserva igualmente: no recoloca triggers ni rompe el snap. |
| **Error: JS no carga o falla la hidratación** | Página navegable con scroll nativo y puntero nativo, porque `cursor: none` depende de `has-cursor`. Un `<noscript>` quita `is-loading`. |
| **Error: Lenis o GSAP lanzan una excepción** | `try/catch` en el init: se pasa a scroll nativo, se emite `emer:loaded` igualmente y el error va al logger. |
| **Error: fuentes** | Fallback con métricas ajustadas, sin bloqueo de render. |
| **Error de ruta o servidor** | `app/error.tsx` y `app/not-found.tsx`, fondo blanco y tipografía del sistema. Textos **propuesta**: «ALGO SE HA ROTO» / «Vuelve a intentarlo en un momento.» / botón «REINTENTAR». 404: «ESTA PÁGINA NO EXISTE» / «VOLVER AL INICIO →». |

---

## Prompt para Claude Code
> Implementa 00-shell en este proyecto Next.js (App Router, TS, Tailwind v4) siguiendo `handoff/00-shell.md` al pie de la letra. Crea: `app/providers.tsx`, `lib/motion/{ticker,scroll,inView,reduced,bus}.ts`, `components/Cursor.tsx` y los tokens en `globals.css` con `@theme`. Usa `gsap.ticker` como único rAF (Lenis incluido) y no uses `requestAnimationFrame` ni `setInterval` en ningún otro sitio. El cursor anima solo `transform: scale/translate` y `opacity`, nunca width ni height. El snap del hero va por la opción `virtualScroll` de Lenis más `lenis.scrollTo({ lock: true })`. Monta 5 `<section>` vacías con los `id` y `data-section` indicados, de 100vh, para probar el snap y `section:change`. Con movimiento reducido, sin Lenis ni cursor. Añade un `<noscript>` que quite `is-loading`. Al terminar: `tsc --noEmit` sin errores y Lighthouse con CLS < 0.05 y TBT < 200ms en la home vacía.
