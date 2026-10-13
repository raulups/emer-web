# Handoff: EMER · Web (etapa 2)

## Overview
EMER es un agregador de marcas de moda emergentes. Esta web tiene 3 piezas:
1. **Landing** animada por scroll (intro → manifiesto → entra al Marketplace).
2. **Shell** con un switch fijo arriba al centro: **[ MARKETPLACE ] / EXPLORA**.
3. **Marketplace** (catálogo de productos con filtros) y **Explora** (experiencia por scroll: Populares → Novedades → Emergentes → Catálogo).

> ⚠️ **Se empieza de cero.** Todo lo que haya ahora en la web actual (páginas, componentes, estilos, animaciones) se elimina. Solo se conservan la configuración del proyecto (framework, despliegue, conexión a Supabase) y los datos.

## About the Design Files
Los archivos de `referencia/` son **prototipos de diseño en HTML** (formato "Design Component": `*.dc.html` + `support.js`). Muestran el aspecto y el comportamiento exactos, **no son código de producción**. La tarea es **recrearlos** en el framework de la web (React/Next u otro que ya exista; si no hay ninguno, Next.js + React + CSS Modules o Tailwind). Para verlos en local: servir la carpeta `referencia/` con un servidor estático (`npx serve referencia`) y abrir `Landing.dc.html` o `Web.dc.html`.

Cada `.dc.html` tiene dos partes: el **template** (HTML con estilos inline y huecos `{{ }}`) y, abajo, el `<script type="text/x-dc">` con la **lógica** (`renderVals()` y un bucle `requestAnimationFrame` en `frame()`). Todas las medidas, colores, tiempos y fórmulas de scroll están ahí: **cuando haya duda, manda el código de referencia.**

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografías, espaciados, tiempos de animación y fórmulas de scroll son finales. Recrear pixel-perfect.

---

## Design Tokens

**Color**
| Token | Hex | Uso |
|---|---|---|
| ink | `#0f0f0f` / `#000` | texto, líneas activas |
| paper | `#ffffff` | fondo general |
| dark | `#0f0f0f` | fondo de **Novedades** |
| text-on-dark | `#f2f2f2` | texto en Novedades |
| grey-text | `#6b6b6b` | metadatos |
| grey-mute | `#9a9a9a` / `#8a8a8a` | inactivos, meta sobre oscuro |
| hairline | `#e4e4e4` | líneas de cuadrícula horizontales |
| hairline-strong | `#d9d9d9` | línea vertical central |
| hairline-dark | `#262626` / `#2e2e2e` | líneas en Novedades |
| placeholder | `#f3f3f1` | fondo de imagen mientras carga |

**Tipografía — SOLO Inter (variable, 100–900), en `fonts/`**
Se usa una única familia y se juega con el peso: **titulares muy gordos, resto muy fino**. Las referencias usan otras fuentes (League Gothic, Anton, Helvetica Now Display); al portar, **sustituirlas todas por Inter** con esta escala:
| Rol | Peso | Ejemplos | Ajustes |
|---|---|---|---|
| Display gigante | 900 (Black) | EMER (Landing), contador 41 | `letter-spacing:-.06em`, `line-height:.8`; sin text-stroke |
| Titular de sección | 800 (ExtraBold) | MARCAS, NOVEDADES, EMERGENTES, CATÁLOGO, POPULARES, manifiesto, SIN RESULTADOS | `-.05em`, `line-height:.84` (manifiesto 1.02) |
| Nombre de marca grande | 300 | nombres en Populares/Novedades/Emergentes | `-.035em` |
| Texto | 300 | descripciones, 13px/1.35 | — |
| UI / etiquetas | 200–300 | switch, menú, filtros, captions | mayúsculas `.06–.28em` |
| Activo / hover | 500 | seleccionado, hover del menú | — |
Tamaños: los de la referencia (`min(7vw,16vh)`, `min(50vw,60vh)`, etc.). Inter es más ancha que League Gothic/Anton: si un titular desborda su columna, bajar el tamaño, no el peso.

**Movimiento**
- Easing principal: `cubic-bezier(.16,1,.3,1)` (out-expo). Transición de carga: `cubic-bezier(.65,0,.35,1)`.
- Nada de sombras ni radios. Bordes/líneas de 1px.
- Las animaciones ligadas al scroll se calculan **en cada frame** (rAF) y se suavizan con lerp: `s += (t - s) * 0.14`.

**Recursos comunes**
- **Halo blur** (detrás de textos fijos sobre contenido): capa absoluta `rgba(255,255,255,.72)` + `backdrop-filter: blur(14px) saturate(1.3)` + máscara doble `linear-gradient(90deg,transparent,#000 22%,#000 78%,transparent)` ∩ `linear-gradient(180deg,transparent,#000 30%,#000 70%,transparent)`; extiende ~110px a los lados y ~40px arriba/abajo. El texto lleva además `text-shadow:0 0 1px rgba(255,255,255,.9),0 0 8px rgba(255,255,255,.8)`.
- **Corchetes animados**: el elemento activo va entre `[` `]`. Al activarse los corchetes hacen fade (0.5s) y se abren desde el texto hacia fuera (`translateX(±7–8px → 0)`, 0.7s).
- **Subrayado hover**: línea de 1px bajo el texto con `scaleX(0→1)` desde la izquierda (0.7–0.8s).
- **Cursor propio** (solo `pointer:fine`): punto blanco de 12px con `mix-blend-mode:difference` que sigue al ratón; `cursor:none` global.

---

## Screens / Views

### 1. Landing (`Landing.dc.html`)
Página independiente. Al terminar navega a la web (Marketplace).

**1.1 Loader.** Pantalla blanca fija. Abajo: "RASTREANDO MARCAS" (izq.) y contador `000→100` (der.) durante 1.8s. Arriba del todo, barra de progreso negra de 2px que sigue el contador. **[ SALTAR ]** aparece centrado del todo a escala 1.5 (sin animarse hasta ahí: está centrado desde el primer frame). Al terminar:
- El loader sube `translateY(0 → -100vh)` y la pantalla EMER entra desde abajo (`100vh → 0`) a la vez, 1.2s `cubic-bezier(.65,0,.35,1)`: es como un scroll.
- [ SALTAR ] viaja a la esquina superior derecha (`right:48px; top:22px`) y vuelve a escala 1 (1.4s), y aparece su halo blur.
- La pantalla EMER **no tiene animación de entrada propia**: ya está pintada.

**1.2 Hero (sticky, sección de 460vh).**
- "EMER" centrado, League Gothic `min(50vw,60vh)`.
- Imágenes decorativas por **detrás** de todo, `mix-blend-mode:multiply`, cada una con posición y tamaño propios (ver array `DECO`): rally (15%,26%,28vw), labios (60%,10%,17vw), estrellas-col (3%,62%,6vw), cerezas (30%,78%,12vw), choque (18%,92%,22vw), pistolera (95%,36%,11vw), golondrinas-2 (90%,11%,8vw), móvil (36%,16%,6vw). La **mujer** va pegada al borde inferior, `left:87%`, alto `min(68vh,58vw)`.
- **[ AUTOMÁTICO ]** bajo EMER (`top: calc(50% + min(19vw,24vh) + 56px)`), parpadeo seco `steps(1)` 0.7s. Al pulsarlo hace autoscroll lento (`max(12s, dist/0.4)`, easing in-out) hasta el final y entra en la web. Pasa a **[ DETENER ]**, que no parpadea. Se para con wheel/touch/teclado.
- Abajo a la izquierda: "MARCAS EMERGENTES, / ANTES QUE NADIE." Abajo al centro: "BAJA" con una línea de 1px×36px animada en bucle (se dibuja hacia abajo y se vacía, 2.2s).
- **Scroll**: EMER hace zoom (`scale 1 → 12`) y se desvanece. Las imágenes salen despedidas hacia fuera y desaparecen **antes** de que la pantalla se ponga negra (opacidad 0 al 28% del zoom).
- **Túnel**: después, 12 imágenes de **marca** (no de producto) vuelan desde el centro en espiral (ángulo áureo) creciendo hasta `scale≈4.2`, **siempre por debajo** del contador. Contador gigante `00 → 41` (League Gothic 30vw) con "MARCAS EMERGENTES / UN SOLO LUGAR" encima de un halo blur.

**1.3 Manifiesto (sticky, 340vh).** Anton `min(6.4vw,11vh)`, 5 líneas **fijas, sin reflujo**:
`RASTREAMOS [ojo-grito] / LAS MEJORES MARCAS / POR TI [manos] / TU CARTERA SE ENCARGA / DE ARDER.`
Las palabras se encienden una a una con el scroll (opacidad 0.1 → 1). Las imágenes tienen su hueco reservado (1.9em) y se destapan con `clip-path` de izquierda a derecha. En cuanto se enciende "ARDER.", el siguiente scroll oculta el texto **de golpe** y muestra `bomba-policia.png` a 92vh, sin transición. Contador `000–100` abajo a la derecha.

**1.4 Salida (160vh).** "[ MARKETPLACE ]" con una barra de 140px que se llena con el scroll. Al llegar al 99%, una cortina blanca cubre la pantalla (0.9s) y navega a la web.

### 2. Shell (`Web.dc.html`)
- `padding-top:76px` en todo el contenido.
- **Switch** fijo `top:26px`, centrado, gap 44px, con halo blur. Dos opciones, Inter 300 11px mayúsculas `.28em`:
  - Activa: letras al 100%, entre corchetes animados.
  - Inactiva: letras al 40%. En hover suben al 80% y `-2px` con stagger de 28ms por letra.
  - Bajo cada opción hay una línea de 1px; está a `scaleX(1)` en la opción en hover, o si no hay hover, en la activa. Al pasar de una a otra, la línea viaja (`origin` derecha en MARKETPLACE e izquierda en EXPLORA).
- Abre en **MARKETPLACE**. EXPLORA monta Explora con `margin-top:-76px` (Explora es a sangre).

### 3. Marketplace (`Marketplace.dc.html`)
**Menú lateral** (260px, sticky `top:76px`), padding `28px 24px 40px 48px`:
- **Categorías**: "Ver todo" + categorías con productos. Inter 300 12px mayúsculas `.06em`.
  - Hover: negrita 500 + subrayado de 1px (offset 4px). **No cambia de tamaño.**
  - Seleccionada: negrita y una línea de 1px que crece a 18px a la izquierda (0.6s).
  - Recuento en superíndice (200 9px), que **no** se subraya.
- **MARCAS**: misma estética, selección múltiple. Muestra 6; "Ver más · N" abre la lista con max-height 181→300px (1s) y las filas nuevas entran escalonadas (35ms cada una, fade + 10px). Tiene scroll propio con un indicador minimalista (barra negra de 1px a la derecha, sin flechas). "Ver menos" la recoge y hace scroll arriba suave.
- **FILTROS (n)** + **BORRAR** (subrayado, gris).
- **Ficha de marca** debajo de FILTROS: imagen 4:5 con borde de 1px, logo en una caja blanca de 64×40 abajo a la izquierda, nombre y "estilo · año". Muestra la marca en hover o, si no hay hover, la primera seleccionada. Si la imagen falla, usa la del primer producto.

**Botón [ MENÚ ]** fijo arriba a la izquierda (`left:48px; top:26px`), a la altura del switch y con el mismo estilo (letras, corchetes, subrayado en hover y halo). Oculta o muestra el menú lateral: el ancho pasa 260→0 en 0.8s, con fade y `translateX(-40px)`, y el grid se ensancha.

**Panel de filtros**: entra desde la derecha (`min(420px,100vw)`, borde izquierdo de 1px, 0.8s) sobre un overlay blanco al 55% con blur de 3px. Se cierra con ×, Esc o clic fuera. Secciones con etiqueta gris 10px `.28em`:
- ORDENAR POR (Novedades / Precio ascendente / Precio descendente): línea de 18px + negrita.
- TALLA (S, M, L, XL, ÚNICA): corchetes animados.
- PRECIO: slider doble de 1px con puntos de 9px.
- COLOR: cuadrado de 10px; al seleccionarlo aparece un outline a 3px y escala 1.1.
- OFERTAS: "[ SOLO OFERTAS · n ]".
- Abajo: **BORRAR** con recuadro de 1px (en hover se rellena de negro) y **VER n** sin recuadro, subrayado (en hover el offset pasa de 6 a 10px).

**Grid de productos**: `repeat(auto-fill,minmax(230px,1fr))`, gap `48px 16px`. **Tarjeta sin borde**:
- Imagen 3:4 sobre `#f3f3f1`. Descuento "−n%" como texto arriba a la derecha.
- Debajo: nombre (400 11px mayúsculas) y precio a la derecha; marca (300 10px `.2em` gris) y precio original tachado.
- **Hover**:
  - Pasa a la 2.ª foto (carrusel con `translateX`, 0.9s) y aparecen flechas ‹ › a los lados.
  - Sube una franja blanca con blur (12px) con las tallas (agotadas en gris tachado) y un índice de líneas + "2/3" a la derecha.
  - Leve zoom de la foto (1.035, cada foto dentro de su marco) y el nombre se subraya.
  - Al salir vuelve a la 1.ª foto.

**Vacío**: "SIN RESULTADOS" (Anton 56px) + "Prueba con otra talla o quita algún filtro."

### 4. Explora (`Explora.dc.html`) — secciones en orden

**4.1 Intro POPULARES.** Cuadrícula 2×2 de líneas grises (vertical al 50%, horizontal al 50%), sticky.
- Izquierda: **MARCAS** fija al centro vertical (Helvetica 500 `min(9vw,30vh)`, `-.045em`), con "Populares" (13px) justo debajo.
- Derecha: PO / PU / LA / RES apiladas (gap .12em). Empiezan bajo el pliegue (`padding-top:100vh`) y suben en escalera: cada palabra se desplaza `translateX = t²·0.4·vw` con `t=(y−centro)/(vh/2)`. Cuando cruza el centro queda alineada junto a MARCAS. RES termina exactamente a la altura de MARCAS (`padding-bottom:.42em`) y desde ahí todo sigue bajando junto.

**4.2 POPULARES (6 marcas, sticky, N×100vh).**
- Líneas: vertical al 50% y horizontal al 47%.
- **Nombres** en fila (Helvetica 400 `min(5.6vw,12vh)`, `-.04em`), con un `padding-right` de 8vw entre ellos. Se desplazan a la izquierda con el scroll, interpolando entre los `offsetLeft` medidos de cada nombre para que el activo caiga en la línea del 50%. Hay dos capas: base gris `#d6d6d6` y copia negra recortada con `clip-path: inset(0 25% 0 50%)`, así que el nombre es negro solo dentro de la ventana 50–75%.
- **Imagen de marca** en la ventana 50–75%, por debajo de la línea. Pista horizontal de 25vw por marca, sincronizada con los nombres.
- Abajo a la izquierda:
  - Descripción: estilo, etiquetas sin repetir el estilo, "Desde AAAA." (`clamp(15px,1.3vw,20px)`).
  - "Ver marca · N piezas" con subrayado en hover.
  - 2 productos de ejemplo (`min(9vw,17vh,140px)`, foto 3:4, nombre y precio).
- Abajo a la derecha: "Nombre 01 | 06".

**4.3 NOVEDADES (fondo NEGRO `#0f0f0f`, texto `#f2f2f2`, líneas `#262626`).**
- Grid 50/50. La izquierda es sticky 100vh: "NOVEDADES" justo encima de la línea horizontal (centro) y debajo el texto "Las últimas marcas en llegar a EMER. Pasa por encima de un nombre para verla." Al entrar en pantalla, título y texto hacen fade 1.6s + `16px→0`.
- Derecha: lista de marcas por `created_at` descendente.
  - Filas de `min-height:22vh`, con borde superior.
  - Nombre Helvetica 400 `min(4vw,8vh)`, "+" a la derecha (gira 45° en hover) y "Llegó el dd.mm.aa · N piezas".
  - Entrada escalonada 300 + i·110ms (fade 1.4s + 14px).
  - La opacidad de cada fila depende de su distancia al centro de la pantalla: `max(.22, 1 − d·.85)`.
- **Hover sobre una fila**: toda la mitad izquierda muestra la foto de la marca **sin animación** (aparece y desaparece de golpe) con 3 productos abajo. Al salir de la fila desaparece.
- **Transición a Emergentes** (spacer de 200vh al final de la lista, ver `frame()`):
  - Con `q = −spacerTop / (spacerH − vh)`, la línea vertical (160vmax, `#8a8a8a`) gira `q·180°` sobre el centro: una sola vuelta visual.
  - El contenido de Novedades lleva una máscara `conic-gradient` que solo deja ver la zona aún no barrida. Así, por un lado de la línea se va ocultando Novedades (incluido el título) y por el otro aparece **la sección Emergentes real**, ya fija debajo y con el carrusel entrando.
  - Emergentes va solapada con `margin-top:-200vh` y oculta hasta que el spacer llega arriba. Al final del giro se oculta la capa de Novedades: **sin saltos ni recargas**.

**4.4 EMERGENTES (fondo blanco, espejo de Novedades).**
- Derecha:
  - "EMERGENTES" sobre la línea horizontal (que solo ocupa la mitad derecha).
  - Texto "Marcas que acaban de nacer. Baja para recorrerlas."
  - Info de la marca activa: nombre `min(4vw,8vh)`, "Desde AAAA · N piezas", 3 productos o "Catálogo pronto", "Ver marca ↗" y contador "01 / 12" abajo a la derecha.
- Izquierda, **carrusel tipo hoja de contactos**:
  - Dos columnas (25vw cada una, separadas por una línea) con tarjetas 3:4 (padding 1.2vw, caption nombre + número).
  - Al hacer scroll, la columna A baja y la B sube (modo "Inverso"; "Normal" las invierte).
  - Recorrido `D = (n − ceil(vh/tile))·tile`, para que **al final las filas de ambas columnas queden alineadas**.
  - El carrusel y la info entran con el scroll (fade + translate), sin cambios bruscos.
- **Marca activa**: la de la columna A más cercana al centro o, si hay hover, la tarjeta bajo el ratón (en cualquiera de las dos columnas). Su caption pasa a negro.
- **Sin marcas repetidas.**

**4.5 CATÁLOGO.**
- Entrada: 70vh en blanco donde la línea vertical del 50% baja dibujándose con el scroll (`scaleY`, origen arriba).
- Después, bloque sticky con scroll horizontal (alto = vh + recorrido medido). La pista contiene:
  - Panel de 50vw con "CATÁLOGO" sobre la línea horizontal de la izquierda (se dibuja de derecha a izquierda), el texto "Todas las marcas de EMER. Baja para recorrerlas." y "N marcas".
  - Las columnas del grid, con borde izquierdo de 1px.
- Título y columnas aparecen cuando el bloque está llegando (fade escalonado).
- Al hacer scroll vertical, **toda la pista** (título incluido) se desplaza en horizontal hasta que el grid ocupa la pantalla completa.
- **Grid irregular**: columnas de 26/20/32/18/28/22/30vw con 1, 2 o 3 marcas de alturas distintas (ver `LAY`), separadas por líneas.
- **Celda**: foto cover con padding de 12px y el nombre siempre sobre una caja blanca.
- **Hover**:
  - Zoom 1.05 de la foto y el resto de celdas al 30%.
  - Arriba a la derecha, 3 miniaturas de producto (`min(5.4vw,11vh,84px)`) o "Catálogo pronto".
  - "Ver marca ↗" en caja blanca.
  - Las celdas **no cambian de tamaño** (rendimiento).

---

## State Management
- Shell: `view: 'market'|'explora'`, `hover`.
- Marketplace: `cat`, `brands[]`, `sizes[]`, `colors[]`, `sale`, `sort`, `lo/hi` (precio), `open` (panel), `side` (menú visible), `brOpen` (ver más), `hp` (producto en hover), `gi{}` (índice de foto por producto), `lg` (marca en hover para la ficha).
- Explora: `idx` (Populares), `hv` (fila en hover en Novedades), `er`/`erH` (marca activa/hover en Emergentes), `eh` (celda en hover en Catálogo), `erShow`, `nvIn`, `ok{}` (imágenes de marca que cargan).
- Landing: `intro`, `ready`, `auto`, `leaving`.
- Todo lo que depende del scroll se aplica en un bucle rAF **escribiendo estilos directamente en el DOM** (refs), no con estado de React. Usar el estado solo para cambios discretos (índice activo, hover).

## Datos (Supabase)
Ver `referencia/emer-db.js` (misma forma que el esquema):
- `brands(id, name, url, img, logo, color, tags[], founded_year, style, created_at)`
- `products(id, brand_id, category_id, name, product_url, currency, current_price, original_price, is_on_sale, main_image_url, image_urls[], color_name, color_hex, created_at, …)`
- `product_sizes(product_id, size_label, size_normalized, stock_status, available, …)`
- `categories(id, name)`

Reglas:
- Si `brand.img` no carga, usar el `main_image_url` del primer producto de la marca.
- Precio con formato `34 €` / `25,60 €`.
- Descuento: `round((1 − current/original)·100)`.
- Novedades: por `created_at` descendente.
- Emergentes: por `founded_year` descendente.
- Populares: por número de productos descendente.
- **Quitar todo lo marcado `SAMPLE`** en la referencia: marcas inventadas y repeticiones para llegar a 6/12. Con datos reales se usan las marcas tal cual.

## Assets
`referencia/assets/deco/`: rally, labios, estrellas-col, cerezas, choque, pistolera, golondrinas-2, movil, mujer (Landing hero); ojo-grito, manos, bomba-policia (manifiesto). Son PNG con fondo blanco y se usan con `mix-blend-mode:multiply`. Las imágenes de marca y producto vienen de Supabase.

## Files
- `referencia/Landing.dc.html`: landing.
- `referencia/Web.dc.html`: shell y switch.
- `referencia/Marketplace.dc.html`: catálogo de productos.
- `referencia/Explora.dc.html`: Populares, Novedades, Emergentes y Catálogo.
- `referencia/emer-db.js`: datos de prueba con la forma del esquema.
- `fonts/` (la añade el usuario): Inter variable `.woff2`.
- `referencia/support.js`: runtime para abrir los prototipos (no se porta).
- `PROMPTS.md`: prompts listos para Claude Code, en orden.
