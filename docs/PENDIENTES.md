# Pendientes

Revisión final contra los prototipos: ver `docs/REVISION_FINAL.md`.

Todo lo aplazado durante la implementación, para abordarlo al final. Se actualiza en cada PR.

## Assets que faltan

- [ ] Favicon: SVG + PNG 32 y 180 (apple-touch).
- [ ] Imagen para compartir en redes (OG), JPG 1200×630, < 200 KB.

## Backend (repo KMP)

- [ ] **CORS**: añadir el dominio final de la web (hoy solo `localhost:3000`). Solo hace falta si se llama a la API desde el navegador.
- [ ] **Tallas en las listas**: `product_sizes` solo llega en `GET /products/{id}`. La franja de tallas del hover del Marketplace hace una petición por producto (con retardo de 180 ms y caché); mejor que `/products` las incluya (o un `sizes` ligero). Con el rate limit de 60/min es lo más delicado del Marketplace.
- [ ] **Facetas de `/products`**: el recuento por categoría solo responde al filtro de marca (no a talla, color, oferta ni precio), y no hay faceta de marcas ni de ofertas. Hoy: recuento de marca = `total_product_count` global (incluye agotados) y «SOLO OFERTAS · n» se pide aparte (`page_size=1`). Pedir `filters.brands` y `filters.on_sale` calculados con el resto de filtros.
- [ ] **Colores sin hex**: algunas facetas de color llegan con `hex: null` (ROSE, Ash, ANTHRA…): son nombres sin normalizar. El panel solo muestra los que tienen hex.
- [ ] **`founded_year` y `style`**: solo 11 de 41 marcas tienen año y casi ninguna estilo (2026-10-13). La ficha de marca del Marketplace muestra lo que haya; Emergentes los necesita para ordenar.
- [ ] **Rate limit compartido**: verificar si el límite de 60 peticiones/min es por IP real o por la IP del proxy de Render (sección 6 del contrato). Si es compartido, instalar `XForwardedHeaders`.
- [ ] **Cold start de ~35 s** en Render free: valorar subir de plan o un ping a `/health`.
- [ ] **Caché HTTP** (`Cache-Control`, `ETag`) en los GET.
- [ ] Slugs de marca: solo si en el futuro hay páginas de detalle por marca.

> Nota: el handoff marca `Brand.createdAt` y `Product.currency` como «falta en backend», pero **ya existen** en la API (`created_at`, `currency`) y en `src/lib/api/types.ts`. No hay que pedirlos.

## Rehecho desde cero (handoff etapa 2)

- [x] **Reglas de animación de CLAUDE.md**: decidido: un único bucle con `gsap.ticker.add` (sin rAF directo), estilos escritos en refs y lerp 0.14 como en el README. La regla 6 de CLAUDE.md ya lo recoge; se aplica al implementar la Landing.
- [ ] **`src/lib/api/suggestions.ts`** (`postSuggestion`) ya no lo usa nadie: borrar si el nuevo diseño no tiene formulario de sugerencias.
- [ ] **Assets de `public/assets/deco/`**: son los PNG del handoff tal cual (≈2 MB en total). Pasarlos a WebP/AVIF o servirlos con `next/image`.
- [ ] **`docs/API_CONTRACT.md` desfasado en `/products`**: el backend cambió (2026-10). Ver la nota al principio del contrato; `src/lib/api` ya usa la forma nueva.
- [ ] **Listas CATEGORÍAS / MARCAS / COLOR** (`expandable-list`): 6 filas y «Ver más» con `max-height` animado (contra la regla 1 de CLAUDE.md, como en el README). Con MARCAS abierta el alto se reparte con la ficha (mínimo 3 filas); en pantallas muy bajas (< ~700 px) el menú vuelve a hacer scroll propio. Las fixtures llevan categorías y colores extra para probarlo.
- [ ] **Animaciones de layout del Marketplace** (exigidas por el README, contra la regla 1 de CLAUDE.md): ancho del menú 260→0, `max-height` de MARCAS 181→300, `padding` del grid, ancho de los guiones del índice de fotos y `font-weight` en hover/selección. Todo lo demás es `transform`/`opacity`.
- [ ] **Marketplace en móvil** (no está en el diseño): el menú empieza oculto y se abre como panel fijo; [ MENÚ ] baja a una segunda fila bajo el switch. Confirmar.
- [ ] **Galería de la tarjeta**: la referencia rellena con fotos de otros productos de la marca cuando un producto tiene una sola; no se ha portado (con una foto no hay carrusel ni flechas). Máximo 8 fotos por tarjeta.
- [ ] **Precio del slider lineal 0–1750 €**: casi todos los productos caen en el primer 10 % del recorrido. Valorar escala no lineal.
- [ ] **Tokens en `src/styles/theme.*`** en vez de `styles/tokens.*`: una regla de permisos impide crear archivos con «token» en el nombre.
- [ ] **Landing — fuentes y tamaños**: League Gothic y Anton sustituidas por Inter. EMER: 900, `min(27vw,50vh)`, tracking −.035em (más abierto que el token −.06em, a petición); contador: `min(30vw,52vh)`; manifiesto: 800, `min(4.4vw,9vh)`. Ajustar a ojo con el diseño y revisar móvil (el diseño no lo define).
- [ ] **Landing — clip-path** en las imágenes del manifiesto (README, contra la regla 1 de CLAUDE.md); `will-change` solo mientras la sección está en pantalla.
- [ ] **Landing sin movimiento** (`prefers-reduced-motion`): sin loader, hero y manifiesto estáticos y [ MARKETPLACE ] como enlace. No está en el diseño: confirmar.
- [ ] **Landing sin JavaScript**: el loader tapa la página (el contador es JS). Valorar `<noscript>`.
- [ ] **Túnel de la Landing**: usa `brand.img` o la foto del primer producto; con 12 huecos y menos marcas se repiten. El contador final es el nº real de marcas de la BDD (41 solo si el backend no responde). El loader espera (hasta 45 s) a las marcas y a sus imágenes; si el backend falla, abre con tarjetas vacías.
- [ ] **Autoscroll de la Landing**: velocidades por tramo en `AUTO` (`components/landing/content.ts`): zoom 0.9 px/ms, túnel 0.45, manifiesto 0.5, hueco y salida 1.6, pausa de 0,8 s en la bomba. Ajustar a ojo.
- [ ] **Explora (§4.1 y §4.2)**: Helvetica Now Display sustituida por Inter (MARCAS y PO/PU/LA/RES en 800, nombres de Populares en 300, texto en 300/400). Ajustar tamaños a ojo con el diseño. Catálogo (§4.5) hecho; Explora completo.
- [ ] **Populares con datos reales**: las 6 marcas con más piezas, sin repetir (si hay menos de 6 con productos, se recorren solo esas). La descripción lleva estilo y «Desde AAAA» cuando existen; las etiquetas no llegan de la API (`tags: []`). «Ver marca» y las fotos enlazan a la web de la marca / del producto (no hay página de marca propia).
- [ ] **Populares: 7 peticiones** al montar (marcas + `/brands/{id}/products?page_size=2` por marca), todas en caché; con el rate limit de 60/min está bien, pero conviene que `/brands` incluya nombre y enlace de las `preview_products`.
- [ ] **Explora sin movimiento**: listas estáticas (Populares y Emergentes) en lugar del recorrido por scroll; Novedades queda sin transición ni spacer (no está en el diseño; confirmar).
- [ ] **Novedades (§4.3)**: lista las 12 últimas marcas por `created_at` (`NEWEST_SIZE` en `lib/explora-data.ts`); el README dice «marcas tal cual» sin fijar tope. Título en Inter 800 `min(6vw,15vh)` y «EMERGENTES» `min(5.6vw,14vh)` (Inter es más ancha: con el tamaño de la referencia desbordaba). Las piezas de la foto en hover llevan nombre solo en las marcas que piden sus productos (Populares y Novedades).
- [ ] **Transición Novedades → Emergentes**: la máscara `conic-gradient` y `visibility` se escriben en cada frame durante 100vh de scroll (pinta más que transform/opacity, como en la referencia). Revisar rendimiento en móviles/portátiles flojos.
- [ ] **Emergentes (§4.4)**: usa todas las marcas por `founded_year` (solo 11 de 41 tienen año: el resto va por orden alfabético) y las vistas previas de la API (sin nombre de pieza; solo precios). Con ≈ 40 marcas la sección mide 100 + n·70 vh. En alturas muy bajas (924×540) las 3 piezas de la info se ocultan si no caben sin pisar el texto.
- [ ] **Populares: piezas adaptables**: hasta 3, tamaño según el hueco que dejan la descripción y la línea central (`fitProducts` en `populares.tsx`: máx. 200 px, mín. 64 px; si no caben, se ocultan).
- [ ] **Slide Marketplace ↔ Explora**: View Transitions (Chromium, Safari 18, Firefox ≥ 144); sin soporte o con «reducir movimiento» el cambio es instantáneo. Al cambiar de vista, el Marketplace se vuelve a montar (los filtros se reinician), como antes.
- [ ] **Catálogo (§4.5)**: todas las marcas (orden de Emergentes) en el grid irregular `LAY`. El hover se limpia al salir de la celda (la referencia solo lo limpiaba al salir de la sección). La pista se desplaza con el scroll vertical: alto de la sección = `vh` + recorrido medido (`scrollWidth − ancho`), fijado al medir (no por frame). `clip`/`height` solo se escriben al medir; por frame solo `transform` y `opacity`. Sin movimiento: el grid se recorre con scroll horizontal nativo.
- [ ] Favicon y OG de EMER (el `favicon.ico` actual es el de Next).
