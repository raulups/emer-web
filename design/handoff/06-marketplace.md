# 06-marketplace — Handoff

Fondo negro. Carrusel 3D de dos anillos de 18 productos que giran en sentidos opuestos. Con el cursor encima, la rueda hace girar el carrusel (con inercia); en reposo gira solo, despacio. Los productos que pasan por detrás se sustituyen por otros. En hover: la tarjeta se eleva y aparece un popup con línea.

## 1. Estructura y textos
```html
<section id="marketplace" data-section="MARKETPLACE" aria-labelledby="mk-title">
  <div class="mk__deco" aria-hidden="true">                 <!-- z-index -1 -->
    <img src="/deco-negro/paloma.webp" alt="" />            <!-- ×12, ver tabla -->
  </div>

  <header class="mk__head">
    <div>
      <p class="eyebrow">MARKETPLACE</p>
      <h2 id="mk-title">TODAS LAS<br />PRENDAS</h2>
    </div>
    <p class="mk__hint">Pon el cursor encima y haz scroll para girarlo.</p>
  </header>

  <div class="mk__stage" data-lenis-prevent>
    <!-- 2 anillos -->
    <div class="mk__ring" data-ring="0">
      <!-- ×18 -->
      <a class="mk__card" data-cursor="prod" href="{product.productUrl}" target="_blank" rel="noopener" draggable="false">
        <div class="card__lift">
          <div class="card__img"><img alt="" /></div>
          <p class="card__row"><span class="name">{name}</span><span class="price">34 €</span></p>
          <p class="card__brand">SATENIER</p>
        </div>
      </a>
    </div>

    <div class="mk__popline" aria-hidden="true"><span class="ln"></span><span class="dot"></span></div>

    <aside class="mk__pop" role="tooltip">
      <div class="pop__top">
        <h3>SATENIER</h3>
        <p><span>{product.name}</span><span>34 €</span></p>
      </div>
      <div class="pop__mid">
        <img alt="" />
        <div>
          <small>CAMISETAS</small>        <!-- Category.name en mayúsculas -->
          <strong>34 €</strong>
        </div>
      </div>
      <a href="{product.productUrl}" target="_blank" rel="noopener">IR A LA TIENDA <span class="loop-line"></span></a>
    </aside>
  </div>

  <a class="mk__cta" href="[PENDIENTE]">IR AL MARKETPLACE <span class="loop-line"></span></a>
</section>
```

**Textos fijos:**
- MARKETPLACE · TODAS LAS / PRENDAS
- Pon el cursor encima y haz scroll para girarlo.
- IR A LA TIENDA · IR AL MARKETPLACE

**Cabecera y sección:**
- Sección: padding `clamp(80px, 10vw, 150px) 0 clamp(64px, 8vw, 120px)`.
- Cabecera: padding lateral `clamp(16px, 3vw, 40px)`.
  - Eyebrow: 300 9px `#8a8a8a`.
  - Título: Anton `clamp(60px, 9vw, 150px) / .86`.
  - Pista: 300 italic 15px `#bdbdbd`, máximo 300px.

**Geometría del carrusel** (depende del ancho `w`):
```ts
N = 18
cw = round(clamp(140, w * 0.16, 270))       // ancho de tarjeta
gap = round(cw * .22); step = 360 / N       // 20°
R = round(max((cw + gap) * N / (2π), w * .52))
cardH = round(cw * 4/3 + 44); rowGap = round(cw * .32)
stageH = 2 * cardH + rowGap + 60
perspective = R * 4 px; perspective-origin = 50% 46%
ring0.top = 20px; ring1.top = cardH + rowGap + 20
card[j].transform = rotateY(j * step) translateZ(R); margin-left = -cw/2
```
- `backface-visibility: hidden` en las tarjetas.

**Tarjeta:**
- Imagen 3/4 sobre `#151515`, con outline de 1px y offset de 5px (transparente en reposo).
- Nombre en 300 12px; precio en 11px; marca en 7.5px con tracking .26em `#8a8a8a`.

**Popup:**
- Ancho `clamp(260px, 22vw, 330px)`, fondo blanco, texto negro.
- Marca: Anton `clamp(34px, 3vw, 48px)`.
- Fila nombre / precio: 300 13px / 12px, con borde superior.
- Bloque medio: grid de `1.1fr` y `1fr`, imagen 3/4; categoría en 8px `#666`; precio en Anton 30px.
- CTA: 54px de alto, 9.5px con tracking .3em. En hover pasa a fondo negro con texto blanco (.3s).
- Línea: 1px blanco, con un punto de 11px en el extremo de la tarjeta.

**CTA inferior:** 58px de alto, padding de 30px, borde blanco de 1px, 10px con tracking .32em. En hover pasa a fondo blanco con texto negro (.35s).

**Decorados** (12 en `deco-negro/`; contraste, brillo y recorte ya aplicados en los WebP; sin `blend`):
| Archivo | Posición | Ancho | Extra |
|---|---|---|---|
| paloma | left 50 %, top 44 %, translate(-50 %, -30 %) | clamp(240px,24vw,400px) | |
| dientes | right 3vw, top 1 % | clamp(170px,16vw,270px) | |
| asterisco | left 52vw, top 3 % | clamp(60px,5vw,96px) | |
| cara-doble | left 1vw, top 30 % | clamp(170px,16vw,270px) | |
| hate | left 24vw, top 36 % | clamp(100px,8vw,140px) | rotate -8° |
| pasamontanas | right 23vw, top 31 % | clamp(100px,8vw,150px) | |
| ojo-cementerio | right 1vw, top 42 % | clamp(170px,16vw,260px) | |
| corazon-ojo | left 9vw, top 62 % | clamp(120px,10vw,170px) | |
| billete | left 28vw, top 66 % | clamp(90px,7vw,130px) | rotate 10° |
| cara-luna | right 28vw, top 62 % | clamp(120px,11vw,190px) | opacity .75 |
| carrito | right 3vw, bottom 1 % | clamp(160px,15vw,250px) | |
| caballo-tumbado | left 2vw, bottom 1 % | clamp(180px,17vw,280px) | |

`dvd` y `estrellas-rayo` se entregan pero no se usan en el diseño actual.

Hover de los decorados: mismo patrón que Emergentes (elevación de 10px, scale 1.08, ghost desplazado 12/9px al 40 %), por la regla del proyecto. **Propuesta:** el diseño de Marketplace los tiene estáticos.

## 2. Coreografía
**Rotación** (subscriber del ticker con `{ el: stage }`):
```ts
idle = hovered ? 0 : 0.06            // °/frame a 60 fps → normalizar con dt/16.67
v += (idle - v) * 0.035              // inercia
a += v
ring0: translateZ(-R) rotateX(-4deg) rotateY(a)
ring1: translateZ(-R) rotateX(-4deg) rotateY(-a + step/2)
```
- Rueda sobre el stage: `preventDefault`; `d` = el eje dominante (deltaY o deltaX); `v = clamp(v + d * .012, -6, 6)`.
- El stage lleva `data-lenis-prevent`, así que mientras el cursor está encima la página no hace scroll. Es intencional y la pista lo explica.

**Visibilidad por tarjeta** (en cada frame, solo dentro de la vista):
- `c = cos((j·step + ángulo del anillo) · π/180)`.
- `opacity = c > 0 ? 1 : 0` (sin transición) y `pointer-events` activos si `c > .35`.

**Rotación de productos:**
- Cuando `c < -0.9` (la tarjeta está detrás) y aún no se ha cambiado, se sustituye por un producto que no esté visible en ningún slot.
- La marca de «ya cambiado» se limpia cuando la tarjeta vuelve a quedar de frente (`c > 0`).
- El cambio solo toca el estado de ese slot: no hay re-render global.

**Hover de la tarjeta:**
| Elemento | Propiedad | Duración | Easing | Delay |
|---|---|---|---|---|
| `.card__lift` | scale 1 → 1.14, translateZ 0 → 30px (origen 50 % 40 %) | .7s | out-expo | 0 |
| Imagen | scale 1 → 1.06 | 1.2s | out-expo | 0 |
| Outline | color transparente → `#fff` | .4s | — | 0 (**EXCEPCIÓN**: color) |
| Línea del popup | scaleX 0 → 1 (origen en el lado de la tarjeta) | .4s | out-expo | entrada 50ms / salida 200ms |
| Punto de la línea | scale 0 → 1 | .3s | out-expo | 0 |
| Cuerpo del popup | se despliega de arriba abajo | .65s | out-expo | entrada 280ms / salida 0 |
| Giro en reposo | se detiene (idle 0) | inercia .035 | — | — |

**Popup:**
- Posición en cada frame: a la derecha de la tarjeta con 64px de separación; si no cabe, a la izquierda.
- `y` = top de la tarjeta + 10 % de su alto, limitado al stage.
- La línea va desde el borde de la tarjeta hasta el popup, a la altura de `y + 34px`.
- El cuerpo se despliega con `clip-path` como en el diseño (**EXCEPCIÓN**: un elemento, sin bucle).

**Cierre:**
- Al salir de la tarjeta, el cierre espera 220ms; al salir del popup, 160ms. Entrar en el popup lo cancela.
- Al salir del stage se cierra inmediatamente.

**Dato importante:** `getBoundingClientRect` de la tarjeta en hover se lee en cada frame, pero solo de esa tarjeta y solo mientras el popup está abierto. Es aceptable.

## 3. Movimiento reducido
- Sin giro automático ni inercia. Los anillos se presentan como dos **filas planas con scroll horizontal nativo** y snap.
- Sin rotación de productos: se fija un conjunto de 36.
- Hover: solo el outline y el popup con opacity 200ms, sin línea ni persiana.

## 4. Assets
| Asset | Tamaño |
|---|---|
| `deco-negro/*.webp` (12 de la tabla) | 408–1152px; el mayor se muestra a 400px |
| `Product.imageUrl` | se muestra a 140–270px de ancho (× 1.14 en hover); pedir a 600×800 |

## 5. Datos
```jsonc
// GET /products → Product[] (pool ≥ 36 con imageUrl). Se cruza con GET /brands y GET /categories.
{
  "id": "prod-1",                         // string — datos → key del slot
  "brandId": "0208bdca-…",                // string — datos → brand.name (upper) en tarjeta y popup
  "categoryId": "38de51a7-…",             // string — datos → Category.name en mayúsculas (texto pequeño del popup)
  "name": "STR Ascii Green Tee",          // string — datos
  "productUrl": "https://satenier.com/…", // string — datos → href de tarjeta y CTA del popup
  "price": 34,                            // number — datos
  "currency": "EUR",                      // FALTA EN BACKEND en Product (fallback 'EUR')
  "originalPrice": null,                  // no se usa en el diseño
  "isOnSale": false,                      // no se usa en el diseño
  "imageUrl": "https://…",                // string — datos
  "imageUrls": []                         // no se usa
}
```
- **Fijo:** los textos de la cabecera y los CTA; la tabla de decorados.
- En el diseño, el enlace de la tarjeta iba a `brand.url`. Con el backend real se usa `productUrl`, que es más directo.
- El precio aparece dos veces en el popup (en la fila y en grande). Es fiel al diseño.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Tarjetas en `#151515` con la fila de texto vacía (skeleton sin animar). Las imágenes hacen fade-in de .4s. El giro empieza igualmente. |
| Pool < 36 | Los slots repiten productos (índice `j % pool.length`) y la rotación elige cualquiera que no esté visible. |
| Vacío (0 productos) | No hay stage. En su lugar, el texto **propuesta** «Las prendas llegan pronto.» en 300 italic 15px `#bdbdbd`, y el CTA inferior oculto. |
| Error de imagen | Ese producto se quita del pool y el slot se rellena al pasar por detrás. |
| Error de datos | Igual que vacío, con «No hemos podido cargar las prendas.» + «REINTENTAR ↻» (**propuesta**). |
| Táctil | Sin rueda. **Propuesta:** arrastre horizontal sobre el stage que suma velocidad (`v += dx * .05`) con `touch-action: pan-y`; el tap abre el popup y el segundo tap navega. |

## Prompt para Claude Code
> Implementa `components/sections/Marketplace.tsx` según `handoff/06-marketplace.md`. Geometría exacta: N=18, cw, R, perspectiva R·4, dos anillos (el segundo invertido y desfasado step/2). Rotación con inercia en un subscriber del ticker `{ el: stage }`: idle .06°/frame, lerp .035, la rueda suma `d·.012` con límite ±6. El stage lleva `data-lenis-prevent` y la rueda se escucha con `passive: false`. Visibilidad por coseno (opacity 0/1 y pointer-events con c > .35), y sustitución del producto cuando c < -0.9 tocando solo ese slot. Hover: lift scale 1.14 + translateZ 30px (.7s), zoom de imagen 1.06 (1.2s), outline blanco, línea (.4s, delay 50ms), y cuerpo del popup con clip-path (.65s, delay 280ms). Cierre con 220 / 160ms. Datos: Product cruzado con Brand (nombre) y Category (nombre de la subcategoría); el enlace es `productUrl`; la moneda es 'EUR' por defecto (falta en el backend). Decorados de deco-negro con la tabla de posiciones, en z-index -1. Implementa también movimiento reducido (filas planas con scroll nativo) y los estados.
