# 10-marketplace — Handoff (página `/marketplace`)

Referencia visual: `referencia/Web Marketplace Pagina v7.dc.html` (se abre directamente en el navegador).
Stack: Next.js (App Router) + TypeScript + Tailwind v4 + GSAP + Lenis. Usa los tokens y el ticker de 00-shell.
Tipografía: **solo Fraunces**, variable `wght 300..600`. Hace falta el eje variable para que la negrita del hover se anime; con pesos estáticos no transiciona.

---

## 1. Estructura semántica y textos

```html
<div class="mk" data-testid="mk-page">
  <div class="mk-top">
    <a href="/">← INICIO</a>
    <button type="button" data-testid="mk-search">BUSCAR <LoopLine w=34/> <kbd>⌘K</kbd></button>
  </div>

  <nav class="mk-cats" aria-label="Categorías" data-testid="mk-cats">
    <button aria-pressed="true" data-cat="">TODO <sup>47</sup></button>
    <!-- UNA por subcategoría, en el orden de las raíces ROPA → CALZADO → ACCESORIOS; sin los padres -->
    <button aria-pressed="false" data-cat="{categoryId}">CAMISETAS <sup>14</sup></button>
    <button disabled data-cat="{categoryId}">BOTAS <sup>00</sup></button>   <!-- recuento 0 -->
  </nav>

  <div class="mk-bar" data-testid="mk-bar">                                <!-- sticky top:0 -->
    <div class="mk-bar__left">
      <div role="group" aria-label="Columnas">
        <span>VISTA</span>
        <button aria-label="2 columnas" aria-pressed="false" data-testid="mk-view-2"></button>
        <button aria-label="4 columnas" aria-pressed="true"  data-testid="mk-view-4"></button>
        <button aria-label="6 columnas" aria-pressed="false" data-testid="mk-view-6"></button>
      </div>
      <button aria-pressed="false" data-testid="mk-sale">OFERTAS <i class="switch"></i></button>
      <button aria-expanded="false" aria-controls="mk-filters" data-testid="mk-filters-toggle">FILTROS (2) <i>+</i></button>
    </div>
    <p class="mk-bar__count" aria-live="polite" data-testid="mk-count">47 PIEZAS</p>
    <button aria-expanded="false" aria-controls="mk-sort" data-testid="mk-sort-toggle">ORDENAR <span>RELEVANCIA</span> <svg/></button>

    <div id="mk-sort" class="mk-expand" role="radiogroup" aria-label="Ordenar">
      <button role="radio" aria-checked="true">RELEVANCIA</button>
      <button role="radio" aria-checked="false">PRECIO: DE MENOR A MAYOR</button>
      <button role="radio" aria-checked="false">PRECIO: DE MAYOR A MENOR</button>
      <button role="radio" aria-checked="false">MARCA: A–Z</button>
    </div>

    <section id="mk-filters" class="mk-expand" aria-label="Filtros" data-testid="mk-filters">
      <div class="mk-filters__brands">
        <header><span>MARCAS</span><span>ELIGE UNA O VARIAS | 02 ELEGIDAS</span></header>
        <ul class="logo-wall">
          <li><button aria-pressed="false" aria-label="SATENIER" data-testid="mk-brand">
            <img src="{brand.logo}" alt="" /> <small>SATENIER</small>
          </button></li>
        </ul>
      </div>
      <div class="mk-filters__side">
        <fieldset><legend>PRECIO</legend>
          <button role="checkbox" aria-checked="false">HASTA 30 € <span>12</span></button>
          <button role="checkbox" aria-checked="false">30–60 €</button>
          <button role="checkbox" aria-checked="false">60–100 €</button>
          <button role="checkbox" aria-checked="false">MÁS DE 100 €</button>
        </fieldset>
        <footer>
          <button>BORRAR</button>
          <button data-testid="mk-filters-apply">MOSTRAR 23 PIEZAS</button>
        </footer>
      </div>
    </section>
  </div>

  <main>
    <ul class="mk-chips" aria-label="Filtros activos" data-testid="mk-chips">
      <li><button>MARCA · SATENIER ✕</button></li>
      <li><button>CAMISETAS ✕</button></li>
      <li><button>EN OFERTA ✕</button></li>
      <li><button>30–60 € ✕</button></li>
      <li><button>BORRAR TODO</button></li>
    </ul>

    <ul class="mk-grid" data-testid="mk-grid">
      <li><article class="card" data-testid="mk-card">
        <a href="?pieza={product.id}" class="card__link">              <!-- abre la ficha -->
          <div class="card__media">
            <img src="{imageUrls[0]}" alt="{name}" width="600" height="800" loading="lazy" />
            <img src="{imageUrls[1]}" alt="" loading="lazy" />          <!-- máximo 4 -->
            <span class="card__tag">−26%</span>                         <!-- si isOnSale -->
            <span class="card__line"></span>
          </div>
          <p class="card__brand">SATENIER</p>
          <p class="card__row"><span>{name}</span> <s>EUR 46</s> <b>EUR 34</b></p>
        </a>
        <button class="card__prev" aria-label="Foto anterior" data-testid="mk-card-prev"></button>
        <button class="card__next" aria-label="Foto siguiente" data-testid="mk-card-next"></button>
        <ol class="card__dots" aria-hidden="true"><li></li></ol>
      </article></li>
    </ul>

    <div class="mk-empty" hidden>
      <img src="/loader/gato-error.webp" width="150" height="150" alt="" />
      <h2>NADA POR AQUÍ</h2>
      <p>Ninguna prenda cumple estos filtros.</p>
      <button>BORRAR FILTROS</button>
    </div>
    <div class="mk-sentinel" aria-hidden="true"></div>
  </main>

  <!-- Ficha: modal a pantalla completa -->
  <div role="dialog" aria-modal="true" aria-labelledby="pd-brand" data-testid="mk-detail" hidden>
    <figure class="pd-media"></figure>
    <div class="pd-info">
      <nav><button aria-label="Anterior">←</button> <span>003 / 047</span> <button aria-label="Siguiente">→</button></nav>
      <button>CERRAR <kbd>ESC</kbd></button>
      <p>ROPA / CAMISETAS</p>
      <h2 id="pd-brand">SATENIER</h2>
      <p>{name}</p>
      <p><b>EUR 34</b> <s>EUR 46</s></p>
      <a href="{productUrl}" target="_blank" rel="noopener">COMPRAR EN SU WEB ↗</a>
      <button>TODO DE SATENIER →</button>
      <section><h3>MÁS DE SATENIER</h3> <!-- 3 miniaturas --></section>
    </div>
  </div>
</div>
```

**Textos fijos (exactos):**
- ← INICIO · BUSCAR · ⌘K
- TODO · VISTA · OFERTAS · FILTROS / FILTROS (n) · ORDENAR
- RELEVANCIA · PRECIO ↑ · PRECIO ↓ · A–Z son las etiquetas cortas de la barra. Las largas del desplegable son RELEVANCIA, PRECIO: DE MENOR A MAYOR, PRECIO: DE MAYOR A MENOR y MARCA: A–Z.
- MARCAS · ELIGE UNA O VARIAS · NN ELEGIDA(S) · PRECIO · HASTA 30 € · 30–60 € · 60–100 € · MÁS DE 100 € · BORRAR · MOSTRAR NN PIEZAS
- MARCA · {NOMBRE} ✕ · EN OFERTA ✕ · BORRAR TODO
- NN PIEZA / NN PIEZAS
- NADA POR AQUÍ · Ninguna prenda cumple estos filtros. · BORRAR FILTROS
- CERRAR · ESC · COMPRAR EN SU WEB ↗ · TODO DE {MARCA} → · MÁS DE {MARCA}
- Precio = 0 → «SIN PRECIO»

**Medidas clave:**
- **Margen lateral:** `clamp(16px,3vw,40px)`.
- **Fila superior:** 60px de alto. Texto en 11px con tracking .2em.
- **Categorías:**
  - Fraunces 400 a 13px/1.2, tracking .14em, todo en mayúsculas.
  - Recuento en superíndice a 8px.
  - Separación entre categorías `14px clamp(22px,2.4vw,36px)`.
  - Padding vertical `clamp(28px,3.4vw,48px)`, con borde superior de 1px negro.
  - Las categorías deshabilitadas van en `#cfcfcf`.
- **Barra fija:**
  - 56px de alto, borde superior de 1px `#e4e4e4` y borde inferior de 1px negro.
  - Grid `auto 1fr auto`, con separadores verticales de 1px `#e4e4e4` (inspirada en una barra de tienda: VISTA | recuento | ORDENAR).
  - Iconos de vista: 2, 3 o 4 rectángulos de 13px de alto. Ancho de cada rectángulo: 9px con 2 columnas, 6px con 4 y 4px con 6. Relleno negro si está activo.
  - Interruptor de OFERTAS: rectángulo de 26×13 con un bloque interior de 9×7 que se desplaza 11px.
- **Cuadrícula:**
  - `grid-template-columns: repeat(auto-fill, minmax(max(calc(100%/N - 2px), MINpx), 1fr))`, con N = 2, 4 o 6. MIN es 160px, o 130px cuando N = 6.
  - Así se hace solo con CSS: no se mide el ancho en JS.
  - Separación `clamp(30px,3vw,44px) 2px`. La imagen es 3/4 sobre `#ededed`.
  - Bajo la imagen, padding lateral de 14px: marca en 9px/.2em `#8a8a8a`, nombre en Fraunces 300 a 16px/1.3 y precio en 13px.
- **Muro de logos:**
  - Grid `repeat(auto-fill,minmax(140px,1fr))`. Las celdas son 2/1 y cada una lleva su propio borde derecho e inferior de 1px `#e4e4e4`, más el borde superior e izquierdo del contenedor.
  - Logo: `max-height:42%`, `filter:grayscale(1) contrast(1.15)` estático y `mix-blend-mode:multiply`.
  - Opacidad del logo: .75 en reposo, .3 si hay otra marca elegida, 1 si está elegido o con hover.
  - Celda elegida: anillo interior `inset 0 0 0 1px #000` y un cuadrado de 6px arriba a la izquierda. Nombre de la marca en 7.5px debajo del logo.

---

## 2. Coreografía de animación

Easings de 00-shell: out-expo `(.16,1,.3,1)` y standard `(.4,0,.2,1)`. Solo se anima `transform` y `opacity`, salvo las **EXCEPCIONES** marcadas.

| # | Elemento | Propiedad | Duración | Easing | Delay / stagger | Disparador |
|---|---|---|---|---|---|---|
| 1 | Categorías (cada botón) | opacity 0→1, translateY 14px→0 | 900ms | out-expo | i·28ms (máximo 24 escalones) | carga, una vez |
| 2 | Celdas de la barra (3) | opacity 0→1 | 800ms | out-expo | 250 + i·90ms | carga, una vez |
| 3 | Categoría: peso | font-weight 400→600 (**EXCEPCIÓN**: eje variable, sin bucle) | 350ms | standard | 0 | hover y activa |
| 4 | Categoría: subrayado | scaleX 0→1. Origen a la izquierda al entrar y a la derecha al salir | 550ms | out-expo | 0 | hover y activa |
| 5 | Botones de la barra | font-weight 400→600 (**EXCEPCIÓN**) | 300ms | standard | 0 | hover |
| 6 | Signo «+» de FILTROS | rotate 0→45° | 500ms | out-expo | 0 | abrir y cerrar |
| 7 | Chevron de ORDENAR | rotate 0→180° | 500ms | out-expo | 0 | abrir y cerrar |
| 8 | Interruptor de OFERTAS | translateX 0→11px | 450ms | out-expo | 0 | toggle |
| 9 | Desplegables FILTROS y ORDENAR | grid-template-rows 0fr→1fr (**EXCEPCIÓN**: layout, sin bucle) | 750 / 600ms | out-expo | 0 | toggle. Solo puede haber uno abierto |
| 10 | Contenido del desplegable | opacity 0→1 | 450ms | standard | 120ms al abrir, 0 al cerrar | toggle |
| 11 | Logos | opacity 0→1, translateY 10px→0 | 750ms | out-expo | i·22ms | abrir FILTROS |
| 12 | Filas de precio | igual que #11 | 750ms | out-expo | 120 + i·50ms | abrir FILTROS |
| 13 | Opciones de ORDENAR | opacity 0→1, translateY 8px→0 | 750ms | out-expo | i·50ms | abrir ORDENAR |
| 14 | Recuento | translateY 110%→0, opacity 0→1, dentro de un contenedor con `overflow:hidden` | 550ms | out-expo | 0 | cambia N |
| 15 | Entrada de las cards | opacity 0→1 (.9s, standard); translateY 40px→0 (1.2s, out-expo) | — | — | columna·80ms (columna = posición en su fila, máximo 5) | la card entra al 94% del viewport. Se rearma al cambiar filtros o vista |
| 16 | Hover de card: zoom | scale 1→1.03 del contenedor de imágenes | 1.4s | out-expo | 0 | hover |
| 17 | Hover de card: foto | crossfade opacity a la foto `idx+1` | 550ms | standard | 0 | `pointerenter`. Al salir vuelve a la 0 |
| 18 | Hover de card: flechas | opacity 0→1, translateX ∓8px→0 | 350ms / 600ms | standard / out-expo | 0 | hover |
| 19 | Hover de card: línea inferior | scaleX 0→1 (origen a la izquierda al entrar, a la derecha al salir), 3px negro | 700ms | out-expo | 0 | hover |
| 20 | Hover de card: puntos | opacity del activo 1, resto .45 | 300ms | — | 0 | cambio de foto |
| 21 | Cursor «VER» | lerp .22 + scale 0→1 (círculo de 86px, `mix-blend-mode:difference`) | 400ms | out-expo | 0 | hover sobre card (solo con puntero fino) |
| 22 | Ficha: apertura | translateY 101%→0 | 850ms | curtain `(.76,0,.24,1)` | 0 | clic en card |
| 23 | Ficha: cierre | translateY 0→101% | 850ms | curtain | 0 | ESC, CERRAR o «TODO DE…» |
| 24 | Flechas: fondo | `#fff`→`#000` (**EXCEPCIÓN**: color) | 250ms | — | 0 | hover sobre la flecha |

**Reglas:**
- La entrada de las cards (#15) no puede depender solo de IntersectionObserver.
  - Las cards se renderizan **visibles** por defecto.
  - JS solo las oculta si `document.visibilityState === 'visible'`.
  - El revelado se comprueba en `scroll`, en el ticker y con un intervalo de seguridad de 700ms.
  - En `visibilitychange` a `hidden` se muestran todas.
  - Así no se queda la cuadrícula en blanco en pestañas inactivas, al exportar o al hacer capturas.
- Los staggers #1, #11, #12 y #13 se hacen con Web Animations API (`el.animate`, `fill:'backwards'`) o con `gsap.from`, y solo si la pestaña está visible.
- La negrita del hover reserva su ancho: un duplicado con `visibility:hidden; font-weight:600` va en la misma celda de un inline-grid. Así el layout no salta.
- Las flechas hacen `stopPropagation` + `preventDefault` para no abrir la ficha.
- Mientras la ficha está abierta, el scroll del body queda bloqueado: `lenis.stop()` + `overflow:hidden`.

---

## 3. Movimiento reducido (`prefers-reduced-motion: reduce`)

- Sin los staggers #1, #2, #11, #12 y #13: los elementos aparecen ya visibles.
- Sin la entrada de las cards (#15) ni el zoom (#16).
- Los desplegables abren al instante, sin transición de filas, y su contenido aparece con opacity 150ms.
- La foto cambia sin crossfade. Las flechas siguen visibles con hover o foco, sin desplazarse.
- La ficha se abre y se cierra con opacity 200ms, sin telón.
- Sin cursor personalizado.
- El peso y el subrayado de las categorías cambian sin transición.

---

## 4. Assets

| Asset | Tamaño | Notas |
|---|---|---|
| `Product.imageUrls[]` (cards) | se muestra entre ~230 y 460px de ancho; pedir 600×800 | `sizes="(min-width:1100px) 25vw, (min-width:760px) 25vw, 50vw"`. Lazy. Máximo 4 por card |
| `Product.imageUrl` (ficha) | se muestra a ~55vw × 100vh; pedir 1400px de ancho | carga prioritaria al abrir |
| `Brand.logo` | se muestra a ~70×28; svg/png/webp/avif | precargarlos con `new Image()` al montar; si fallan o `naturalWidth===0`, se muestra el nombre |
| `loader/gato-error.webp` | 300×300 (se muestra a 150) | estado vacío |
| Fraunces variable (woff2, wght 300..600, normal e itálica) | — | `next/font/local` con `axes` o un archivo variable |

---

## 5. Datos dinámicos

```ts
// GET /brands → Brand[]   GET /categories → Category[]   GET /products → Product[]
type CardVM = {
  id: string;               // Product.id
  brandName: string;        // Brand.name → toLocaleUpperCase('es')   (cruzado por brandId)
  name: string;             // Product.name
  price: number;            // Product.price → formato «EUR 34» / «EUR 34,99» / «SIN PRECIO» si es 0
  originalPrice: number | null; // Product.originalPrice (solo si isOnSale)
  isOnSale: boolean;        // Product.isOnSale → etiqueta −NN% = round((1 - price/originalPrice)*100)
  images: string[];         // Product.imageUrls (fallback [imageUrl]); máximo 4; se descartan las fallidas
  productUrl: string;       // Product.productUrl → COMPRAR EN SU WEB
  categoryId: string;       // → subcategoría; su raíz se obtiene subiendo por parentId
};
```

Ejemplo:

```json
{
  "brands": [{ "id": "0208bdca-…", "name": "Satenier", "url": "https://satenier.com",
               "logo": "https://…/satenier_logo.webp", "totalProductCount": 84, "onSaleCount": 49 }],
  "categories": [{ "id": "213b160c-…", "name": "ROPA", "parentId": null },
                 { "id": "38de51a7-…", "name": "Camisetas", "parentId": "213b160c-…" }],
  "products": [{ "id": "p1", "brandId": "0208bdca-…", "categoryId": "38de51a7-…",
                 "name": "STR Ascii Green Tee", "productUrl": "https://satenier.com/products/…",
                 "price": 34, "originalPrice": 46, "isOnSale": true,
                 "imageUrl": "https://…/front.webp", "imageUrls": ["https://…/front.webp", "https://…/back.webp"] }]
}
```

**Fijo:** todos los textos de la sección 1, los tramos de precio y las opciones de orden.

**Datos:** marcas (logo y nombre), subcategorías y sus recuentos, productos y la ficha.

**Estado en la URL** (compartible; sin slugs, se usan ids):
`?cat={categoryId}&marcas={id},{id}&precio=a|b|c|d&oferta=1&orden=rel|asc|desc|az&vista=2|4|6&pieza={productId}`

**Recuentos (en cliente):**
- Recuento de cada subcategoría = productos que pasan el filtro de marcas.
- Recuento de precio = productos de la categoría actual dentro de ese tramo.
- Orden «relevancia»: alterna marcas, primero el producto nº 1 de cada marca, luego el nº 2, y así sucesivamente.

**FALTA EN BACKEND:**
- `Product.currency`: de momento se usa 'EUR'.
- **Filtros y paginación en servidor:** `GET /products?categoryId&brandIds&minPrice&maxPrice&onSale&sort&page&pageSize`. Con catálogos grandes, el filtrado en cliente no escala. Mientras no exista, se filtra en cliente con scroll infinito: páginas de 24 cargadas desde un elemento centinela al final de la lista.
- **Recuentos agregados** por categoría y tramo de precio para el filtro actual. Mientras no existan, se calculan en cliente.

---

## 6. Estados

| Estado | Comportamiento |
|---|---|
| Carga inicial | Las categorías se muestran como 12 placeholders de 13px de alto y ~80px de ancho en `#ededed`. La cuadrícula muestra 8 esqueletos (imagen `#ededed` 3/4 y barra de 9px al 50%). El recuento muestra «— PIEZAS». |
| Cargando más | 4 esqueletos al final de la cuadrícula; el centinela vuelve a activarse. |
| Vacío por filtros | Gato + «NADA POR AQUÍ» + texto + BORRAR FILTROS, que restablece todo. |
| Vacío total (0 productos) | Igual, pero con el texto **propuesta** «Todavía no hay prendas en el escaparate.» y sin botón (mismo texto que en la app). |
| Error de `/products` | Igual que vacío, con «No hemos podido cargar las prendas.» + «REINTENTAR ↻» (**propuesta**). |
| Error de una imagen | Se quita de la galería de esa card. Si no le queda ninguna, la card muestra el fondo `#ededed`. |
| Error de un logo | La celda muestra el nombre de la marca en 10px con tracking .16em. |
| Subcategoría con 0 | Botón deshabilitado en `#cfcfcf`, sin hover. |
| Precio 0 | Se muestra «SIN PRECIO», queda fuera de los tramos de precio y se ordena al final. |
| Táctil | Sin hover: las flechas se ven siempre en la card, con opacity .9, y también se puede deslizar en horizontal sobre la imagen. Tocar abre la ficha. |

---

## Prompt para Claude Code

> Implementa la página `/marketplace` según `handoff-marketplace/10-marketplace.md`, usando como referencia visual `referencia/Web Marketplace Pagina v7.dc.html`. Ábrela en el navegador y compárala con la tuya.
>
> Estructura de archivos:
> - `app/marketplace/page.tsx` (Server Component que carga brands, categories y products).
> - `components/marketplace/{CategoryNav,FilterBar,FilterPanel,SortPanel,ProductGrid,ProductCard,ProductDetail,EmptyState}.tsx`.
> - `lib/marketplace/{filters.ts,url.ts,format.ts}`: lógica pura, con tests unitarios.
>
> Requisitos:
> - El estado de los filtros vive en la URL (`useSearchParams` + `router.replace`, sin scroll).
> - El número de columnas se resuelve **solo con CSS**: la fórmula auto-fill de la sección 1, sin medir el ancho en JS.
> - Animaciones con exactamente los tiempos y easings de la tabla de la sección 2.
> - Las cards nacen visibles y solo se ocultan para animar su entrada si la pestaña está visible; incluye los fallbacks de la sección 2.
> - Fraunces variable, para que la transición de font-weight funcione; negrita con el ancho reservado mediante el duplicado oculto.
> - Galería de la card: crossfade al hacer hover, flechas, puntos y swipe en táctil.
> - La ficha es un diálogo accesible: foco atrapado, ESC y ←/→ para pasar de pieza.
> - Movimiento reducido y todos los estados de la sección 6.
> - Añade `data-testid` exactamente como en la sección 1.
>
> Al terminar, lanza los agentes `e2e-tester`, `visual-qa` y `perf-a11y-reviewer` de `.claude/agents/` y corrige todo lo que reporten hasta que los tres den OK.
