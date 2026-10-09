# 05-catalogo — Handoff

Grid irregular a pantalla completa con todas las marcas. Las celdas están separadas por líneas negras de 1px (el gap deja ver el fondo negro). En hover, la fila y la celda se expanden y aparecen el nombre, 3 productos y «VER MARCA».

## 1. Estructura y textos
```html
<section id="catalogo" data-section="CATÁLOGO" aria-labelledby="cat-title">
  <div class="cat__row">                      <!-- 3 o 4 filas en escritorio -->
    <div class="cat__head">                   <!-- solo la primera celda -->
      <p class="eyebrow">CATÁLOGO</p>
      <h2 id="cat-title">TODAS LAS<br />MARCAS</h2>
      <button type="button" class="cat__search">BUSCAR <span class="loop-line"></span></button>
    </div>

    <a class="cat__cell" href="{brand.url}" target="_blank" rel="noopener">
      <div class="cell__reveal">
        <span class="cell__ghost" aria-hidden="true">SATENIER</span>   <!-- nombre en trazo detrás de la imagen -->
        <img class="cell__img" alt="" loading="lazy" />
        <span class="cell__veil"></span>
        <span class="cell__label">SATENIER</span>                    <!-- etiqueta pequeña en reposo -->
        <div class="cell__open">
          <ul class="cell__prods">                                   <!-- ×3, solo escritorio -->
            <li><img alt="" /><span>34 €</span></li>
          </ul>
          <h3 class="mask"><span>SATENIER</span></h3>
          <span class="cell__cta">VER MARCA <span class="loop-line"></span></span>
        </div>
      </div>
    </a>
  </div>
</section>
```

**Textos fijos:**
- CATÁLOGO
- TODAS LAS / MARCAS
- BUSCAR
- VER MARCA

**Layout de la sección:**
- Escritorio: 100vh, mínimo 560px, flex en columna con gap de 1px, fondo `#000`, bordes superior e inferior de 1px.
- **Algoritmo de filas** (determinista, se calcula en servidor):
  ```ts
  cells = [HEAD, ...brands]
  nRows = cells.length > 22 ? 4 : 3
  weights = [0.9, 1.15, 0.85, 1.1].slice(0, nRows)
  counts[r] = round(cells.length * weights[r] / sum(weights))   // la última fila absorbe el resto
  rnd(i) = frac(sin((i + 1) * 91.17) * 43758.5453)
  flexBase(r, c) = 0.8 + rnd(r * 13 + c) * 1.3
  ```

**Layout de las celdas:**
- Cabecera: flex fijo `0 0 clamp(260px, 24vw, 420px)`, fondo blanco, padding `clamp(14px, 1.6vw, 24px)`.
  - Eyebrow: 300 9px, tracking .3em, `#666`.
  - Título: Anton `clamp(40px, 4.6vw, 76px) / .88`.
- Celda de marca: fondo `#f3f3f1`.
  - Ghost: Anton `clamp(16px, 1.6vw, 26px)` con trazo de 1px `#c4c4c4`, sin relleno.
  - Imagen en cover.
  - Etiqueta: 8px, tracking .24em, `mix-blend-mode: difference`, abajo a la izquierda a 10 / 9px.
- Bloque abierto, abajo con padding `clamp(14px, 1.6vw, 24px)`:
  - Productos: flex con gap 8px, máximo 96px de ancho cada uno, imagen 3/4 con borde blanco de 1px, precio en 9.5px.
  - Nombre: Anton `clamp(34px, 3.6vw, 64px) / .95`.
  - CTA: 9px, tracking .3em + línea en bucle de 40px.

**Móvil (<760px):**
- 2 celdas por fila, filas de 46vw, alto de sección `auto`.
- Sin expansión en hover y sin productos; la cabecera ocupa media fila.

## 2. Coreografía
| # | Elemento | Propiedad | Duración | Easing | Delay | Disparador |
|---|---|---|---|---|---|---|
| 1 | Revelado de celdas (todas, incluida la cabecera) | ver nota *reveal* | 1.1s | out-expo | 80 + k·45ms (k = orden en el DOM) | la sección entra al 75 % del viewport; una sola vez |
| 2 | Fila en hover | flex-grow 1 → 2.3 | .85s | out-expo | 0 | hover en una celda de la fila (**EXCEPCIÓN** layout) |
| 3 | Celda en hover | flex-grow base → base · max(4, celdasEnFila · .75) | .85s | out-expo | 0 | hover (**EXCEPCIÓN** layout) |
| 4 | Imagen | scale 1.12 → 1.05 | 1.4s | out-expo | 0 | hover |
| 5 | Velo | opacity: hover .38 / atenuada .15 / reposo 0 (capa negra) | .6s | standard | 0 | hover |
| 6 | Resto de celdas | grayscale(1) | .6s | — | 0 | hay hover en otra celda (**EXCEPCIÓN** filter; alternativa abajo) |
| 7 | Etiqueta pequeña | opacity 1 → 0 | .3s | standard | 0 | hover |
| 8 | Nombre grande | translateY 105 % → 0 (máscara) | .8s | out-expo | 100ms | hover |
| 9 | CTA | opacity 0 → 1 | .45s | standard | 300ms | hover |
| 10 | Productos 1–3 | opacity 0 → 1 (.5s) + translateY 24px → 0 (.8s out-expo) | | | 380 / 470 / 560ms | hover |
| 11 | Salida del hover | todo vuelve sin delays | mismas duraciones | | 0 | `mouseleave` de la sección o cambio de celda |

**Nota *reveal*:** el diseño usa `clip-path: inset(100% 0 0 0) → inset(0)`. En producción se hace con transform:
- `.cell__reveal` lleva `overflow: hidden` y empieza en `translateY(100%)`.
- Su hijo directo empieza en `translateY(-100%)`.
- Ambos van a 0 a la vez, con el mismo easing.

**Alternativa a #6 (recomendada):**
- Cada celda tiene una segunda `<img>` en gris, generada en build o con CSS `filter` estático sin transición.
- Se cruza por opacity (.6s).
- Si el peso de imágenes preocupa, usar #6 tal cual: solo ocurre en hover y no está en bucle.

**Expansión (#2 y #3):** es la esencia del diseño.
- Se implementa con `transition: flex-grow .85s` y `contain: layout paint` en la sección.
- No se usa GSAP en cada frame.
- Solo a partir de 760px.

## 3. Movimiento reducido
- Revelado: opacity 0 → 1 en 200ms, todas a la vez.
- Sin expansión de filas ni celdas, sin zoom y sin máscara.
- En hover, solo se cruzan por opacity (200ms) el velo, el nombre, el CTA y los productos.

## 4. Assets
| Asset | Tamaño |
|---|---|
| `brand.img` | las celdas miden de ~120 a ~900px de ancho en hover; pedir a 1200px; `sizes="(min-width:760px) 40vw, 50vw"` |
| `previewProducts[].imageUrl` | se muestra a 96×128; pedir a 200×267 |
| Imagen en gris (si se usa la alternativa a #6) | misma URL procesada en el CDN, o filtro estático |

## 5. Datos
```jsonc
// GET /brands → Brand[] (todas, en el orden de la API)
{
  "id": "0208bdca-…",           // string — datos → key
  "name": "Satenier",           // string — datos → upper()
  "url": "https://satenier.com",// string — datos → href de la celda
  "img": "https://…",           // string|null — datos; si es null → estado sin imagen
  "previewProducts": [ { "id": "p1", "imageUrl": "https://…", "price": 34, "currency": "EUR" } ]   // máx. 3 — datos
}
```
- **Fijo:** los textos de la cabecera, «VER MARCA» y «BUSCAR».
- Sin campos FALTA EN BACKEND en esta sección.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Las celdas muestran `#f3f3f1` con el nombre en trazo (ghost) hasta que llega la imagen, con fade de opacity de .4s. |
| Marca sin imagen | Nombre en trazo blanco grande, Anton `clamp(22px, 2.4vw, 40px)`, centrado; desaparece en hover. |
| Vacío (0 marcas) | Solo la celda de cabecera, a ancho completo, con el texto **propuesta** «Aún no hay marcas. Vuelve pronto.» en 300 italic 15px. |
| Error de datos | Igual que vacío, con el texto **propuesta** «No hemos podido cargar las marcas.» + «REINTENTAR ↻». |

## Prompt para Claude Code
> Implementa `components/sections/Catalogo.tsx` según `handoff/05-catalogo.md`. Calcula el reparto de filas y los flex-grow de forma determinista en servidor con el algoritmo indicado. El revelado inicial se hace con el patrón de doble translateY (no clip-path), 1.1s out-expo, delay 80 + k·45ms, disparado una vez con `observe()` al 75 %. La expansión en hover es `transition: flex-grow .85s out-expo` (excepción documentada) con `contain: layout paint`, y solo a partir de 760px. Los demás estados del hover (zoom, velo, máscara del nombre, CTA y productos con stagger 380 + j·90ms) van con CSS y data-attributes (`data-hover`, `data-dim`). En móvil: 2 por fila, filas de 46vw y sin hover. BUSCAR emite `emer:search:open`. Implementa también movimiento reducido y los estados.
