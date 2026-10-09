# 03-hero — Handoff

Carrusel de marcas a pantalla completa: autoplay de 7s, nombre con máscara, 3 productos con popup, «VER TODO» y segmentos de progreso. Fondo `#0a0a0a`, texto blanco.

## 1. Estructura y textos
```html
<section id="marcas" data-section="MARCAS" aria-roledescription="carrusel" aria-label="Marcas destacadas" data-cursor="hero">
  <div class="hero__layers" aria-hidden="true">
    <!-- 1 por marca (máx. 6) -->
    <div class="hero__layer" data-active>
      <img class="hero__img" src="" alt="" width="1920" height="1080" />  <!-- fondo de la capa = brand.color -->
    </div>
  </div>
  <div class="hero__veil" aria-hidden="true"></div>

  <button class="hero__search" type="button">BUSCAR <kbd>⌘K</kbd></button>

  <div class="hero__bottom">
    <div class="hero__id">
      <h2 class="hero__name"><span class="mask"><span>SATENIER</span></span></h2>
      <a class="hero__cta" href="{brand.url}" target="_blank" rel="noopener">IR A LA TIENDA ↗</a>
    </div>

    <div class="hero__tiles">
      <article class="hero__pop" role="tooltip" aria-hidden="true">
        <img alt="" />
        <div>
          <p class="pop__brand">SATENIER</p>
          <p class="pop__name">{product.name}</p>
          <p class="pop__price">34 €</p>
          <a href="{productUrl}" target="_blank" rel="noopener">VER EN SU WEB ↗</a>
        </div>
      </article>

      <!-- ×3 -->
      <a class="hero__tile" data-cursor="prod" href="…" target="_blank" rel="noopener">
        <img alt="" width="300" height="400" loading="lazy" />
        <span>34 €</span>
      </a>
      <a class="hero__more" href="{brand.url}" target="_blank" rel="noopener">VER TODO →</a>

      <!-- si previewProducts está vacío -->
      <p class="hero__empty">Sus prendas aún no están en Emer. Mientras tanto, están en su tienda.</p>
    </div>
  </div>

  <nav class="hero__segs" aria-label="Marcas">
    <!-- ×6 -->
    <button aria-label="Ir a Satenier" aria-current="true"><span class="seg__fill"></span></button>
  </nav>
</section>
```

**Textos fijos:**
- BUSCAR · ⌘K
- IR A LA TIENDA ↗
- VER TODO →
- VER EN SU WEB ↗
- Sus prendas aún no están en Emer. Mientras tanto, están en su tienda.

**Layout:**
- Sección de 100vh, mínimo 560px.
- Margen lateral `clamp(20px, 4vw, 56px)`.
- BUSCAR: arriba en el centro, a 22px, Fraunces 12px, tracking .32em. «⌘K» al 55 % de opacidad, solo a partir de 860px.
- Bloque inferior a 64px del borde: flex con `space-between`, que hace wrap con gaps de 28px / 48px.
- Nombre: Anton `clamp(54px, 8vw, 150px) / .88`, sin salto de línea.
- CTA: línea de 36px + Fraunces 10px, tracking .3em. En hover aparece el subrayado (border-bottom de 1px, .3s).
- Tiles: grid de 4 columnas, gap 10px, ancho `min(100%, clamp(300px, 40vw, 580px))`.
  - Cada tile: imagen 3/4 sobre `#1a1a1a` y precio en 9.5px, tracking .12em.
  - «VER TODO»: borde `rgba(255,255,255,.85)`, texto en 8.5px. En hover pasa a fondo blanco con texto negro (.3s).
- Popup:
  - Medidas: ancho `min(400px, 86vw)`, a 18px por encima del grid, fondo blanco, borde negro de 1px.
  - Columnas: imagen al 44 % (3/4) y, separado por un borde de 1px, el texto con padding 18/16.
  - Textos: marca en 8px `#8a8a8a`; nombre en 300 17px/1.25; precio en 13px; CTA en 8.5px con borde superior.
  - Posición horizontal: `left` = centro del tile en % del grid (`(i + .5) / 4`), y `translateX(-ese %)`.
- Velo: `linear-gradient(180deg, rgba(0,0,0,.28), transparent 18%, transparent 52%, rgba(0,0,0,.62))`.
- Segmentos: a 26px del borde, flex con gap 8px. Zona de toque de 16px de alto, línea de 1px `rgba(255,255,255,.35)` con relleno blanco.

## 2. Coreografía
| # | Elemento | Propiedad | Duración | Easing | Delay / stagger | Disparador |
|---|---|---|---|---|---|---|
| 1 | Capa entrante | opacity 0 → 1 (z-index 2) | 1.6s | standard `(.4,0,.2,1)` | 0 | cambio de marca |
| 2 | Capa saliente | opacity 1 → 0 (z-index 1) y, al terminar, scale vuelve a 1.06 sin transición | 1.6s | standard | el reset de scale a +1.6s | cambio de marca |
| 3 | Imagen activa (Ken Burns) | scale 1.06 → 1 | 10s | `(.2,.6,.2,1)` | 0 | capa activa |
| 4 | Nombre | translateY 105 % → 0 dentro de la máscara | 1.3s | out-expo | 280ms | carga y cambio |
| 5 | CTA | opacity 0 → 1 + translateY 12px → 0 | opacity 1s standard / transform 1.2s out-expo | | 620ms | carga y cambio |
| 6 | Tiles 1–3 | igual que #5 | | | 620 / 710 / 800ms | carga y cambio |
| 7 | VER TODO | igual que #5 | | | 620 + n·90ms (890ms con 3 tiles) | carga y cambio |
| 8 | Texto vacío | igual que #5 | | | 660ms | carga y cambio |
| 9 | Segmento activo | scaleX 0 → 1 (`transform-origin` izquierda); los pasados a 1 y los futuros a 0 | 7s, lineal (lo maneja el ticker) | lineal | — | autoplay |
| 10 | Popup: entrada | opacity 0 → 1 / translateY 14px → 0 | .35s / .6s | standard / out-expo | 0 | hover o tap en un tile |
| 11 | Tiles no activos | opacity 1 → .45 | .4s | standard | 0 | popup abierto |
| 12 | Popup: salida | al revés de #10; `left` salta al nuevo tile sin animar si ya estaba cerrado | .35s | standard | 0 | salir del grid |

**Secuencia al cambiar de marca:**
1. Se resetean sin transición el nombre (105 %) y los ítems (opacity 0, +12px).
2. Se fuerza un reflow.
3. Al siguiente frame se aplican las transiciones #4–#8.
4. El tiempo del autoplay se reinicia.

**Disparo inicial:** al recibir `emer:loaded` (fin del loader).

**Autoplay:**
- Avanza cada 7000ms, en bucle sobre `min(6, n)` marcas.
- Se **pausa** (acumulando el tiempo transcurrido, sin reiniciar) en estos casos:
  - el ratón está sobre el hero;
  - el buscador está abierto;
  - el scroll ha pasado del 2 % de la altura del hero;
  - el hero está fuera de pantalla (inView).

**Interacción:**
- Rueda horizontal y teclas ←/→: llegan por el `hero:step` de 00-shell.
- Arrastre: `pointerdown` → `pointerup`.
  - `|dx| > |dy|` y `|dx| > 50`: siguiente o anterior (dx < 0 pasa a la siguiente).
  - Si es vertical con `dy < -50`: `snapToContent()`.
- Mientras arrastras con `|dx| > 10`: `cursor.set('drag')`; al soltar, `cursor.clear()`.
- Clic en un segmento: va a esa marca.

**EXCEPCIÓN:** ninguna (el segmento usa scaleX, no width).

## 3. Movimiento reducido
- Sin autoplay. Los segmentos son solo navegación; el activo aparece lleno.
- Cambio de marca: crossfade de 200ms. Sin Ken Burns (scale fijo en 1).
- Nombre e ítems aparecen solo con opacity, 200ms, sin delays.
- El popup aparece con opacity y sin desplazamiento.

## 4. Assets
| Asset | Tamaño | Notas |
|---|---|---|
| `brand.img` (6) | se muestra a 100vw × 100vh; pedir en origen hasta 2560px de ancho | `next/image` con `fill`, `sizes="100vw"`, `priority` **solo en la primera**; el resto lazy y precargado al ir a mostrarse |
| `previewProducts[].imageUrl` | se muestra a ~145×193; pedir a 300×400 | `object-fit: cover` |
| Iconos | ninguno | las flechas son caracteres de texto |

## 5. Datos
```jsonc
// GET /brands → Brand[]; el hero usa heroBrands = brands.filter(b => b.img).slice(0, 6)   [DECISIÓN PENDIENTE]
{
  "id": "0208bdca-…",                    // string — datos
  "name": "Satenier",                    // string — datos → upper() para el nombre
  "url": "https://satenier.com",         // string — datos → IR A LA TIENDA, VER TODO
  "img": "https://…/satenier_image.png", // string|null — datos → capa
  "color": "#e1609f",                    // string|null — datos → fondo de la capa mientras carga (si es null, #0a0a0a)
  "previewProducts": [                   // máx. 3 — datos
    { "id": "p1", "imageUrl": "https://…", "price": 34, "currency": "EUR" }
  ]
}
```
- **Fijo:** todos los textos de la sección 1.
- **Popup:** `name` y `productUrl` → **FALTA EN BACKEND** en `PreviewProduct`. Se resuelven por `id` contra `Product` si está cargado. Si no, se oculta la línea del nombre y el CTA apunta a `brand.url`.
- `logo`, `isEmergent`, los contadores y `storeLocations` no se usan aquí.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | La capa muestra `brand.color` (o `#0a0a0a`) hasta que llega la imagen, con fade de 1.6s. Los tiles muestran `#1a1a1a`. El nombre ya está en el HTML (SSR) y se anima tras `emer:loaded`. |
| Vacío (marca sin previewProducts) | Sin tiles ni VER TODO; texto «Sus prendas aún no están en Emer…» a todo el ancho del grid, con borde superior blanco al 85 % y padding-top de 14px. |
| Vacío (0 marcas con img) | No se monta la sección. El snap del shell salta directamente a Emergentes. |
| Error de imagen de una marca | Se descarta esa marca del carrusel (onError) y se recalcula `n`. |
| Error de imagen de un producto | Se oculta ese tile. |
| Error de datos (fallo de `/brands`) | Fondo `#0a0a0a`, sin segmentos ni tiles. En el lugar del nombre: «EMER» y el CTA «REINTENTAR ↻» (**propuesta**). |

## Prompt para Claude Code
> Implementa `components/sections/Hero.tsx` según `handoff/03-hero.md`. Usa los tipos de `types/emer.ts` y las utilidades `upper/price/pad2`. Las capas son `next/image` `fill` (priority solo en la primera), y el fondo de cada una es `brand.color`. Las transiciones del cambio de marca van con GSAP (`gsap.set` + `gsap.to`) con exactamente estas duraciones, easings y delays: nombre 1.3s out-expo con 280ms; ítems 620 + i·90ms. El autoplay de 7s y el segmento (scaleX) los lleva el ticker con `subscribe(fn, { el })`, y se pausan con hover, buscador abierto, scroll > 2 % o fuera de pantalla. Escucha `hero:step` del bus. Arrastre con pointer events y umbral de 50px; swipe vertical → `snapToContent()`. Cursor: `data-cursor="hero"` en la sección, `data-cursor="prod"` en los tiles, y `cursor.set('drag')` al arrastrar. Para el nombre del producto en el popup, resuelve por id contra los productos si están disponibles; si no, oculta la línea. Implementa también movimiento reducido y los estados de la sección 6.
