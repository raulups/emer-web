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
- [ ] **Assets de `public/assets/deco/`**: son los PNG del handoff tal cual (≈2 MB en total). Pasarlos a WebP/AVIF o servirlos con `next/image`.
- [ ] **`docs/API_CONTRACT.md` desfasado en `/products`**: el backend cambió (2026-10). Ver la nota al principio del contrato; `src/lib/api` ya usa la forma nueva.
- [ ] **Listas CATEGORÍAS / MARCAS / COLOR** (`expandable-list`): 6 filas y «Ver más» con `max-height` animado (contra la regla 1 de CLAUDE.md, como en el README). Con MARCAS abierta el alto se reparte con la ficha (mínimo 3 filas); en pantallas muy bajas (< ~700 px) el menú vuelve a hacer scroll propio. Las fixtures llevan categorías y colores extra para probarlo.
- [ ] **Animaciones de layout del Marketplace** (exigidas por el README, contra la regla 1 de CLAUDE.md): ancho del menú 260→0, `max-height` de MARCAS 181→300, `padding` del grid, ancho de los guiones del índice de fotos y `font-weight` en hover/selección. Todo lo demás es `transform`/`opacity`.
- [ ] **Marketplace en móvil** (no está en el diseño): en un teléfono, barra inferior (CATEGORÍA · MARCAS · FILTROS · columnas) con hojas inferiores; sin menú lateral ni ficha de marca. En una ventana estrecha de escritorio sigue el menú lateral superpuesto bajo el switch. Confirmar con diseño.
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
- [ ] **Populares con datos reales**: *(la selección de marcas está superada por «Secciones de Explora por tag», más abajo)* las 6 marcas con más piezas, sin repetir (si hay menos de 6 con productos, se recorren solo esas). La descripción lleva estilo y «Desde AAAA» cuando existen; las etiquetas no llegan de la API (`tags: []`). «Ver marca» y las fotos enlazan a la web de la marca / del producto (no hay página de marca propia).
- [ ] **Populares: 7 peticiones** al montar (marcas + `/brands/{id}/products?page_size=2` por marca), todas en caché; con el rate limit de 60/min está bien, pero conviene que `/brands` incluya nombre y enlace de las `preview_products`.
- [ ] **Explora sin movimiento**: listas estáticas (Populares y Emergentes) en lugar del recorrido por scroll; Novedades queda sin transición ni spacer (no está en el diseño; confirmar).
- [ ] **Novedades (§4.3)**: *(la selección de marcas está superada por «Secciones de Explora por tag», más abajo)* lista las 12 últimas marcas por `created_at` (`NEWEST_SIZE` en `lib/explora-data.ts`); el README dice «marcas tal cual» sin fijar tope. Título en Inter 800 `min(6vw,15vh)` y «EMERGENTES» `min(5.6vw,14vh)` (Inter es más ancha: con el tamaño de la referencia desbordaba). Las piezas de la foto en hover llevan nombre solo en las marcas que piden sus productos (Populares y Novedades).
- [ ] **Transición Novedades → Emergentes**: la máscara `conic-gradient` y `visibility` se escriben en cada frame durante 100vh de scroll (pinta más que transform/opacity, como en la referencia). Revisar rendimiento en móviles/portátiles flojos.
- [ ] **Emergentes (§4.4)**: usa todas las marcas por `founded_year` (solo 11 de 41 tienen año: el resto va por orden alfabético) y las vistas previas de la API (sin nombre de pieza; solo precios). Con ≈ 40 marcas la sección mide 100 + n·70 vh. En alturas muy bajas (924×540) las 3 piezas de la info se ocultan si no caben sin pisar el texto.
- [ ] **Populares: piezas adaptables**: hasta 3, tamaño según el hueco que dejan la descripción y la línea central (`fitProducts` en `populares.tsx`: máx. 200 px, mín. 64 px; si no caben, se ocultan).
- [ ] **Slide Marketplace ↔ Explora**: View Transitions (Chromium, Safari 18, Firefox ≥ 144); sin soporte o con «reducir movimiento» el cambio es instantáneo. Al cambiar de vista, el Marketplace se vuelve a montar (los filtros se reinician), como antes.
- [ ] **Catálogo (§4.5)**: *(la selección de marcas está superada por «Secciones de Explora por tag», más abajo)* todas las marcas (orden de Emergentes) en el grid irregular `LAY`. El hover se limpia al salir de la celda (la referencia solo lo limpiaba al salir de la sección). La pista se desplaza con el scroll vertical: alto de la sección = `vh` + recorrido medido (`scrollWidth − ancho`), fijado al medir (no por frame). `clip`/`height` solo se escriben al medir; por frame solo `transform` y `opacity`. Sin movimiento: el grid se recorre con scroll horizontal nativo.
- [ ] Favicon y OG de EMER (el `favicon.ico` actual es el de Next).
- [ ] **Sugerir marca** (`handoff_sugerir_footer`, §1): el handoff pide insertar en Supabase (`brand_suggestions` con RLS de solo inserción para `anon`), pero la web nunca habla con la BDD. El formulario envía a `/api/suggestions` → `postSuggestion` (`POST /suggestions` del backend KMP, **falta en backend**: hasta entonces todo envío real muestra el error). Pedir el endpoint con la tabla y los checks del README §3 (instagram sin `@` y en minúsculas; la ruta ya lo normaliza). El bucle va por `gsap.ticker` (no rAF propio, regla 6) con el lerp 0.085 del README. Si el foco entra con el formulario oculto, la página baja hasta mostrarlo. Sin movimiento: sección de 100vh en su estado final. En el estado «enviado» las filas vuelven y «EN REVISIÓN · GRACIAS» queda sobre una de ellas (como en la referencia): valorar.
- [ ] **Footer** (§2): Sobre EMER, Contacto, Privacidad, Términos, Cookies, Instagram y TikTok con `href="#"` + `TODO`. A 800 px «SUGERIR MARCA» casi toca la columna Legal (sigue en el negro). Eventos entre secciones por `src/lib/bus.ts` (vista del Shell, filtros del Marketplace, scroll a Sugerir marca).
- [ ] **`?brand=<uuid>` en el Marketplace**: `/marketplace` no es una ruta propia, redirige (307) a `/web` conservando la query. Leer `searchParams` hace que la sección del Marketplace se renderice en cada petición (dentro de su Suspense; el resto de `/web` sigue en el shell estático y los datos siguen cacheados). Una marca que existe pero sin productos se acepta, aunque no sale en la lista del menú.
- [ ] **Orden por defecto del Marketplace** (`CATEGORY_ORDER` en `lib/marketplace.ts`): recorre las categorías de la lista y después las que no están en ella (`APPEND_UNLISTED_CATEGORIES`: hoy **Camisas** y **Accesorios**, 340 productos). **119 productos sin categoría** (2026-10-14) no salen en el orden por defecto: `/products` no permite pedir `category_id` nulo. Pedir al backend que los clasifique o un filtro para «sin categoría».
- [ ] **Rate limit de 60/min**: ventana deslizante por proceso en `apiGet` (espera hasta 10 s y si no, 429). Con varias instancias del servidor el límite real es por instancia. El timeout del servidor sigue en 45 s (un "use cache" no puede pasar de 50 s); el de 60 s es el de la primera petición del navegador.
- [ ] **Búsqueda (`q`) y género**: la API los admite pero el Marketplace no tiene controles para ellos; cuando existan, `isDefaultOrder` debe tenerlos en cuenta.
- [ ] **Secciones de Explora por tag** (2026-10-14): Destacados (`destacada`), Populares (`popular`), Novedades (`novedad`), Emergentes (`emergente` o sin tags). La API los da en minúsculas y singular; `src/lib/explora-tags.ts` acepta también plural y mayúsculas. Los componentes conservan el nombre de su posición original (`Populares` pinta Destacados, etc.). La 2.ª sección conserva su texto «Llegó el …» por fila. Ya no hay tope de marcas por sección (antes 6 y 12). Una marca con solo tags desconocidos no sale en ninguna sección.

## Web de móvil (2026-10-18)

- [ ] **Qué es «móvil»**: lo decide `src/proxy.ts` por user-agent (`userAgent().device.type === "mobile"`). Teléfonos → solo Marketplace (`/` y `/web` se sirven desde la ruta interna `/m`, sin redirigir). Tablets (iPad, Android sin «Mobile») y ordenadores, aunque la ventana sea estrecha, siguen con la web completa. `/m` fuera del móvil redirige a `/web`. Confirmar que las tablets deben ver la web completa.
- [ ] **Enlaces de la app**: `APP_LINKS` en `src/lib/app-links.ts` (hoy `null`: botones «Próximamente», sin enlace). Rellenar App Store y Google Play cuando estén publicadas; el aviso los convierte en enlaces solo.
- [ ] **Aviso de la app**: hoja inferior modal (`<dialog>` nativo), una vez por sesión del navegador (`sessionStorage`, clave `emer:app-prompt`). Texto y diseño propios (no hay diseño): revisar con diseño. En Safari < 17.5 (sin `@starting-style`) aparece sin deslizarse.
- [ ] **Caché por dispositivo**: la misma URL da contenido distinto según el user-agent. En Vercel el proxy corre antes de la caché (sin problema); detrás de otra CDN, revisar que no sirva la versión de escritorio a un móvil. El proxy añade `Vary: User-Agent`, pero Next lo sustituye en las páginas renderizadas.
- [ ] **Lighthouse en CI**: `lhci` mide `/` con emulación móvil, así que ahora mide la web de móvil (Marketplace), no la Landing. Valorar añadir una pasada con `preset: desktop` para la Landing. En local (fixtures) el Marketplace móvil da rendimiento ≈ 0.7: el LCP es la primera foto de la tarjeta, con ~5 s de «render delay» (ya pasaba antes con el Marketplace en un teléfono).
- [ ] **Build**: `pnpm build` con el backend real avisa «Unexpected cache miss after cache warming phase» en `/web` (Explora, `getBrands` desde `explora-data.ts`). Ya pasaba antes de la web de móvil; el build termina bien.

## Marketplace: vista, loader y estados (2026-10-18)

- [ ] **Halos fuera**: el switch, [ MENÚ ], [ SALTAR ], VISTA, el título de móvil, las flechas de la tarjeta, [ SALTAR ] y el contador de la Landing van en blanco con `mix-blend-mode: difference` (se invierten sobre lo que tengan debajo). La etiqueta de descuento y la franja de tallas son bandas negras. Sobre fotos de grises medios el contraste baja: revisar con fotos reales. Las opciones inactivas del switch (40 %) se leen peor sobre fotos con mucho detalle.
- [ ] **VISTA (productos por fila)**: escritorio 2–6 (por defecto 4), móvil 1–3 (por defecto 2). Si no caben a 150 px (96 px en móvil) se ponen menos. Se guarda en la cookie `emer-grid-<dispositivo>` para que el servidor pinte ya con ellas. Con muchas por fila el precio baja bajo el nombre (`@container`).
- [ ] **Loader**: tragaperras con las categorías del catálogo (GSAP, solo transform/opacity). Sin movimiento, palabra fija. No está en el diseño.
- [ ] **Vacío y error**: 0 gigante en contorno con los filtros activos (se quitan uno a uno) y BORRAR FILTROS; error con cinta SIN CONEXIÓN y REINTENTAR. La cinta corre con una animación CSS infinita (transform). No están en el diseño.
