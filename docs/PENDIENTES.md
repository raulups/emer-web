# Pendientes

Todo lo aplazado durante la implementación, para abordarlo al final. Se actualiza en cada PR.

## Assets que faltan

- [ ] Favicon: SVG + PNG 32 y 180 (apple-touch).
- [ ] Imagen para compartir en redes (OG), JPG 1200×630, < 200 KB.

## Backend (repo KMP)

- [ ] **CORS**: añadir el dominio final de la web (hoy solo `localhost:3000`). Solo hace falta si se llama a la API desde el navegador.
- [ ] **`PreviewProduct.name` y `PreviewProduct.productUrl`**: el popup del hero (y de Emergentes) los necesita. Mientras tanto, el nombre se oculta y «VER EN SU WEB» apunta a la web de la marca.
- [ ] **`POST /suggestions`** `{ name?, instagram? }` para 07-sugiere. Mientras tanto, el envío falla de forma controlada.
- [ ] **Rate limit compartido**: verificar si el límite de 60 peticiones/min es por IP real o por la IP del proxy de Render (sección 6 del contrato). Si es compartido, instalar `XForwardedHeaders`.
- [ ] **Cold start de ~35 s** en Render free: valorar subir de plan o un ping a `/health`.
- [ ] **Caché HTTP** (`Cache-Control`, `ETag`) en los GET.
- [ ] Slugs de marca: solo si en el futuro hay páginas de detalle por marca.

> Nota: el handoff marca `Brand.createdAt` y `Product.currency` como «falta en backend», pero **ya existen** en la API (`created_at`, `currency`) y en `src/lib/api/types.ts`. No hay que pedirlos.

## Decisiones de criterio

- [ ] **Las 6 marcas del hero**: no existe el campo «destacada». Implementado: las 6 primeras del orden de la API que tienen imagen (`src/lib/config/hero.ts`). Confirmar o definir otro criterio.
- [ ] **Destinos sin definir**: MARKETPLACE y TIENDAS del footer, «IR AL MARKETPLACE» de 06, PARA MARCAS, PRIVACIDAD, TÉRMINOS, App Store, Google Play, Instagram y X de 07.

## Accesibilidad

- [ ] **Autoplay del hero (WCAG 2.2.2)**: se pausa con hover, foco, buscador, scroll y fuera de pantalla, pero no hay un botón visible de pausa. El diseño no lo contempla; valorar añadirlo.

- [ ] **Contraste del hero sobre fotos claras**: con el velo del diseño, en el peor caso (zona blanca de la foto) BUSCAR, el nombre e «IR A LA TIENDA» quedan por debajo de 3:1, y la pista de los segmentos (`white/35`) también. Depende de las fotos reales: valorar un velo inferior más opaco, una franja tras BUSCAR o un `text-shadow` suave.
- [ ] **Gris `muted` (#8a8a8a) sobre blanco** da 3,45:1 (AA pide 4,5:1 en texto pequeño): popup del hero, nav inactiva y «⌘K» de la topbar. El mínimo que pasa es #767676. Decisión de diseño.
- [ ] **Gris `muted-dark` (#6f6f6f) sobre negro** en el footer da ~4:1 (AA pide 4,5:1 a 8-9px). Decisión de diseño.
- [ ] **Textos en mayúsculas en el HTML** (nav, BUSCAR, etiquetas): algunos lectores de pantalla deletrean palabras en mayúsculas. Se podrían escribir en minúsculas con `text-transform: uppercase`.

## Ajustes de diseño hechos en la implementación (confirmar)

- [ ] **03-hero «VER TODO →»** hace salto de línea en móvil: con el grid a 300 px cada tile mide ~67 px y el texto se salía de la caja.
- [ ] **03-hero ←/→** también funcionan con el foco en los segmentos (tras hacer clic en uno), no solo con el foco en la página.
- [ ] **03-hero táctil**: el hero permite el scroll vertical nativo y el zoom (`touch-action: pan-y pinch-zoom`). El diseño bloqueaba el táctil y hacía snap con el swipe hacia arriba; eso impedía hacer zoom y, sin JS, bajar de la primera pantalla. El swipe horizontal sigue cambiando de marca.
- [ ] **03-hero autoplay** también se pausa con el foco dentro del hero (además de las 4 condiciones del diseño).
- [ ] **03-hero primera imagen** sin fade de entrada: es el LCP y no debe esperar a la hidratación. El resto sí hace el fade de 1,6 s.
- [ ] **03-hero altura** `100svh` en vez de `100vh`: en móvil no queda tapado por la barra del navegador.
- [ ] **03-hero popup**: se puede sobrevolar con el ratón y se cierra con Esc (WCAG 1.4.13). En táctil se cierra tocando fuera de los productos.

- [ ] **04-emergentes fecha**: se muestra la fecha de alta (dd.mm.aa). El handoff la daba por inexistente, pero `createdAt` sí llega del backend.
- [ ] **04-emergentes pin** con `position: sticky` (y la altura de la sección calculada), no con el pin de ScrollTrigger: sin saltos ni `pin-spacer`.
- [ ] **04-emergentes teclado**: un botón por panel abre el popup. Enter lleva al CTA, Tab sigue al siguiente panel y Esc cierra. Con foco, el scroll vertical lleva el panel a la vista.
- [ ] **04-emergentes contraste**: la fecha y el índice de prenda pasan a `#6f6f6f` (el `#8a8a8a` del diseño da 3,45:1).
- [ ] **04-emergentes popup** sin `role="dialog"` (es un disclosure que no atrapa el foco): botón con `aria-expanded` + `aria-controls`.
- [ ] **04-emergentes altura** `100svh` en el pin (diseño `100vh`); paneles y decorados siguen en `vh`. Revisar en móvil real.
- [ ] **04-emergentes popup en móvil estrecho**: mide `100vw - 32px` y puede tapar el panel activo. Valorar colocarlo debajo del panel por debajo de ~600 px.
- [ ] **04-emergentes nombres largos**: se cortan con elipsis (panel y popup). Valorar 2 líneas.

- [ ] **06-marketplace accesibilidad (añadido, fuera del diseño — confirmar en el punto de control)**: botones «Pausar giro» y ←/→ (WCAG 2.2.2 y 2.5.7); la rueda solo gira el carrusel con el escenario centrado en pantalla (si no, la página sigue bajando); con foco de teclado el anillo trae la tarjeta al frente; Esc cierra el popup.
- [ ] **06-marketplace popup** `aria-hidden` (la tarjeta ya tiene nombre, precio, marca y categoría) y CTA del popup fuera del orden de Tab.
- [ ] **06-marketplace decorados** estáticos, como en el diseño (el handoff proponía el hover de Emergentes).
- [ ] **06-marketplace móvil**: el popup no cabe a ningún lado (≤ 600 px) y se coloca dentro del escenario, tapando parte de la tarjeta. Valorar colocarlo debajo.
- [ ] **06-marketplace orden inicial** determinista (los más nuevos); el diseño barajaba al montar. La rotación sí elige al azar.
- [ ] **06-marketplace «IR AL MARKETPLACE»** se pinta como texto hasta tener `LINKS.marketplace`.
- [ ] **06-marketplace nombres largos** se cortan con elipsis; marca (7,5 px) y categoría (8 px) muy pequeñas.
- [ ] **Reintentar tras error** (catálogo y marketplace): el error se cachea con `cacheLife("seconds")` y el primer `router.refresh()` puede devolverlo aún. Valorar una server action con `updateTag`.

- [ ] **Backend `POST /suggestions`** (falta): mientras no exista, 07-sugiere muestra el error (no se simula éxito). Al crearlo, añadir **rate limit por IP** en el backend: el límite de 10 s de la web es solo de cliente.
- [ ] **07-sugiere decorados** estáticos, como en el diseño (el handoff proponía activar el hover). Son `background-image` (no `next/image`): se descargan al cargar la página aunque la sección esté abajo. Valorar `next/image` lazy.
- [ ] **07-sugiere Instagram/X**: los iconos solo aparecen cuando existan `LINKS.instagram` y `LINKS.x` (de momento solo el mail).
- [ ] **07-sugiere Instagram**: se acepta «@handle» o URL de instagram.com y se envía el handle validado (`[a-z0-9._]{1,30}`); el campo admite 60 caracteres para poder pegar la URL (diseño: 40).
- [ ] **09-buscar → 07-sugiere**: usar el evento `emer:suggest` (el `?sugiere=` solo se lee al cargar la página).
- [ ] **`initSectionTracking`** ya no encuentra placeholders (todas las secciones son reales): quitarlo de `HomeMotion` y de la regla 12 de CLAUDE.md.

- [ ] **Hosts de imágenes**: un host no declarado en `images.remotePatterns` rompe toda la página (error de `next/image`). Hay Shopify, Supabase y Cloudinary; al aparecer otro CDN en el backend hay que añadirlo en `next.config.ts` (o valorar un fallback `unoptimized` para hosts desconocidos).

- [ ] **05-catálogo «sin imagen»**: el nombre grande va en trazo negro. El diseño lo pide blanco, pero sobre el fondo #f3f3f1 no se veía (1,1:1).
- [ ] **05-catálogo móvil**: celdas de igual ancho (2 por fila, como dice el handoff). La referencia tenía anchos irregulares también en móvil.
- [ ] **05-catálogo revelado**: incluye la cabecera, como dice el handoff (la referencia solo revelaba las marcas).
- [ ] **05-catálogo**: añadido «Saltar el catálogo» (visible solo con foco de teclado) para no tabular por ~32 enlaces.
- [ ] **Etiqueta del catálogo en `difference`** (8px sobre la foto): en tonos medios el contraste cae cerca de 1:1. Valorar una pastilla sólida o `text-shadow`. Decisión de diseño.

## Rendimiento

- [ ] **05-catálogo, expansión con hover**: durante los .85s de `flex-grow` se redimensionan todas las celdas y se repintan sus imágenes, incluida la copia en gris (`filter: grayscale` estático). Medir en el Mac con CPU 4× en el panel Performance; si hay tirones, usar la variante gris del CDN (Supabase image transformations) o atenuar solo con el velo.

- [ ] **04-emergentes al entrar con `/#catalogo`** o con restauración de scroll: en SSR la sección mide `100svh` y al hidratar crece a `vh + recorrido`, así que el destino queda desplazado. Opciones: altura estimada desde el servidor o re-hacer el scroll al hash tras la primera medida.
- [ ] **04-emergentes apertura del popup**: anima `clip-path` y `box-shadow` por frame (≈0,5 s). Si da tirones en móvil, pasar la sombra a un `::after` con `transform`.

- [ ] **06-marketplace con popup abierto**: se leen 2 `getBoundingClientRect` por frame (aceptado en el handoff). Alternativa: calcular la posición desde el ángulo y `--r`.
- [ ] **06-marketplace `translateZ(30px)`** del hover no tiene efecto (la tarjeta no es `preserve-3d`, igual que en la referencia).

- [ ] **TBT** en Lighthouse: en el contenedor sale 190–470 ms (presupuesto 200), dominado por la hidratación de React. Medir en local con `pnpm build && pnpm lhci`. Si se confirma, valorar cargar GSAP/Lenis con `import()` tras la hidratación.

- [ ] **LCP del hero**: con los datos de ejemplo sale ~3,8 s porque el elemento LCP es el nombre (entra con la animación de máscara tras la carga). Chrome ignora como LCP las imágenes de poca entropía, como los grafismos de ejemplo. Con fotos reales el LCP debería ser la foto (eager, `fetchPriority="high"`, sin fade). Medir con datos reales.

## Verificación con datos reales

- [ ] Primera prueba contra el backend real en local (`EMER_API_URL=https://emerapp.onrender.com`): desde el entorno de desarrollo de Claude no se llega a Render, todo se probó con datos de ejemplo.
