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
- [ ] **Texto gris del popup** (#8a8a8a a 8px sobre blanco) da 3,45:1. Valorar `muted-dark`.

## Ajustes de diseño hechos en la implementación (confirmar)

- [ ] **03-hero «VER TODO →»** hace salto de línea en móvil: con el grid a 300 px cada tile mide ~67 px y el texto se salía de la caja.
- [ ] **03-hero ←/→** también funcionan con el foco en los segmentos (tras hacer clic en uno), no solo con el foco en la página.
- [ ] **03-hero táctil**: el hero permite el scroll vertical nativo y el zoom (`touch-action: pan-y pinch-zoom`). El diseño bloqueaba el táctil y hacía snap con el swipe hacia arriba; eso impedía hacer zoom y, sin JS, bajar de la primera pantalla. El swipe horizontal sigue cambiando de marca.
- [ ] **03-hero autoplay** también se pausa con el foco dentro del hero (además de las 4 condiciones del diseño).
- [ ] **03-hero primera imagen** sin fade de entrada: es el LCP y no debe esperar a la hidratación. El resto sí hace el fade de 1,6 s.
- [ ] **03-hero altura** `100svh` en vez de `100vh`: en móvil no queda tapado por la barra del navegador.
- [ ] **03-hero popup**: se puede sobrevolar con el ratón y se cierra con Esc (WCAG 1.4.13). En táctil se cierra tocando fuera de los productos.

## Rendimiento

- [ ] **TBT** en Lighthouse: en el contenedor sale 190–470 ms (presupuesto 200), dominado por la hidratación de React. Medir en local con `pnpm build && pnpm lhci`. Si se confirma, valorar cargar GSAP/Lenis con `import()` tras la hidratación.

- [ ] **LCP del hero**: con los datos de ejemplo sale ~3,8 s porque el elemento LCP es el nombre (entra con la animación de máscara tras la carga). Chrome ignora como LCP las imágenes de poca entropía, como los grafismos de ejemplo. Con fotos reales el LCP debería ser la foto (eager, `fetchPriority="high"`, sin fade). Medir con datos reales.

## Verificación con datos reales

- [ ] Primera prueba contra el backend real en local (`EMER_API_URL=https://emerapp.onrender.com`): desde el entorno de desarrollo de Claude no se llega a Render, todo se probó con datos de ejemplo.
