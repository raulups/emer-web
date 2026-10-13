# Pendientes

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

- [ ] **Reglas de animación de CLAUDE.md**: piden GSAP + `gsap.ticker` y prohíben `requestAnimationFrame`, pero el README del handoff calcula el scroll en un bucle rAF con lerp (`s += (t − s) · 0.14`). Decidir antes de implementar la Landing. (`gsap`, `lenis` y `motion` siguen en `package.json`, sin uso.)
- [ ] **`src/lib/api/suggestions.ts`** (`postSuggestion`) ya no lo usa nadie: borrar si el nuevo diseño no tiene formulario de sugerencias.
- [ ] **Assets de `public/assets/deco/`**: son los PNG del handoff tal cual (≈2 MB en total). Pasarlos a WebP/AVIF o servirlos con `next/image`.
- [ ] **`docs/API_CONTRACT.md` desfasado en `/products`**: el backend cambió (2026-10). Ver la nota al principio del contrato; `src/lib/api` ya usa la forma nueva.
- [ ] **Animaciones de layout del Marketplace** (exigidas por el README, contra la regla 1 de CLAUDE.md): ancho del menú 260→0, `max-height` de MARCAS 181→300, `padding` del grid, ancho de los guiones del índice de fotos y `font-weight` en hover/selección. Todo lo demás es `transform`/`opacity`.
- [ ] **Marketplace en móvil** (no está en el diseño): el menú empieza oculto y se abre como panel fijo; [ MENÚ ] baja a una segunda fila bajo el switch. Confirmar.
- [ ] **Galería de la tarjeta**: la referencia rellena con fotos de otros productos de la marca cuando un producto tiene una sola; no se ha portado (con una foto no hay carrusel ni flechas). Máximo 8 fotos por tarjeta.
- [ ] **Precio del slider lineal 0–1750 €**: casi todos los productos caen en el primer 10 % del recorrido. Valorar escala no lineal.
- [ ] **Tokens en `src/styles/theme.*`** en vez de `styles/tokens.*`: una regla de permisos impide crear archivos con «token» en el nombre.
- [ ] Favicon y OG de EMER (el `favicon.ico` actual es el de Next).
