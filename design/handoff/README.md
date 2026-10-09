# Emer Web — Handoff

Stack: Next.js (App Router) + TypeScript + Tailwind v4 + GSAP/ScrollTrigger + Lenis.
Formato de cada sección: 1 estructura · 2 coreografía · 3 movimiento reducido · 4 assets · 5 datos · 6 estados · prompt para Claude Code.

## Orden de implementación
1. `00-shell.md`: layout, ticker, Lenis, snap, cursor y bus
2. `03-hero.md`
3. `02-topbar.md`
4. `08-footer.md`
5. `05-catalogo.md`
6. `04-emergentes.md`
7. `06-marketplace.md`
8. `07-sugiere.md`
9. `09-buscar.md`
10. `01-loader.md`

## Contenido del zip
- `*.md`: un handoff por sección.
- `assets/`: todo listo para producción, en WebP.
  - `deco/`: 21 imágenes. El blanco ya es transparencia (se hizo «unmultiply» del blanco, así que se ve igual que el multiply del diseño sobre fondo blanco). Los recortes ya vienen aplicados.
  - `deco-negro/`: 14 imágenes. El negro ya es transparencia (equivale al `screen` del diseño). Llevan ya aplicados el contraste 1.25, el brillo .95 y el recorte del 2 %.
  - `loader/`: `gato-1…4.webp` (240×240, 2× de 120px) y `gato-error.webp` (480×480).
  - `brand/`: `emer-logo-white` y `emer-logo-black`, en WebP y PNG, a 333×121.
- `referencia/`: los `.dc.html` originales del diseño. Se abren en el navegador directamente (incluyen `support.js`, `emer-data.js` y los assets originales). **Solo son referencia visual.** Usa `?v=` o la prop `variant` para ver las variantes descartadas de Emergentes.

**No incluidos (no existen todavía):** favicon (SVG + PNG 32/180) y OG (1200×630).

## Regla de capas (CLAUDE.md del proyecto)
Las imágenes decorativas de fondo van **siempre** por debajo de todos los componentes, con un z-index inferior. Pueden quedar detrás de títulos, textos o botones sin necesidad de esquivarlos.

El estilo de referencia es el de Emergentes: tamaños muy variados, repartidas por la sección, y un hover con elevación más una copia desplazada. En producción no se usa `mix-blend-mode`: los WebP ya traen la transparencia.

## Modelo de datos (backend real)
```ts
// types/emer.ts
export type PreviewProduct = { id: string; imageUrl: string; price: number; currency: string };
export type Brand = {
  id: string; name: string; url: string;
  img: string | null; logo: string | null; color: string | null;   // color = fondo mientras carga la imagen
  isEmergent: boolean;
  previewProducts: PreviewProduct[];
  totalProductCount: number; onSaleCount: number;
  categoryCounts: Record<string /* categoryId */, number>;
  storeLocations: { city: string }[];
};
export type Product = {
  id: string; brandId: string; categoryId: string; name: string; productUrl: string;
  price: number; originalPrice: number | null; isOnSale: boolean;
  imageUrl: string; imageUrls: string[];
};
export type Category = { id: string; name: string; parentId: string | null }; // raíces: ROPA, CALZADO, ACCESORIOS
```

### Derivados en cliente (no son campos nuevos)
```ts
upper(b)  = b.name.toLocaleUpperCase('es')
domain(b) = new URL(b.url).hostname.replace(/^www\./, '')
price(v, cur = 'EUR') = new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur, minimumFractionDigits: v % 1 ? 2 : 0 }).format(v)
pad2(n)   = String(n).padStart(2, '0')
norm(s)   = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
rootOf(categoryId) → subir por parentId hasta la raíz (ROPA | CALZADO | ACCESORIOS)
```

### FALTA EN BACKEND (resumen global)
| Campo o recurso | Lo usa | Mientras tanto |
|---|---|---|
| `PreviewProduct.name` | popups de 03-hero y 04-emergentes | resolverlo por `id` en la lista de `Product` si ya está cargada; si no, ocultar la línea |
| `PreviewProduct.productUrl` | «VER EN SU WEB ↗» del popup del hero | igual que arriba; si no, `brand.url` |
| `Brand.createdAt` | orden de Emergentes y su fecha (`dd.mm.aa`) | conservar el orden de la API y ocultar la fecha |
| `Product.currency` | precios de 06-marketplace | `'EUR'` |
| `POST /suggestions` `{ name?, instagram? }` | 07-sugiere | el envío falla de forma controlada (estado de error) |

### Decisiones pendientes (no son datos, son criterio)
- **Las 6 marcas del hero.** No existe el campo «destacada». Propuesta: las 6 primeras del orden de la API que tengan `img`. Se configura en `lib/config/hero.ts`.
- **Destinos sin definir:**
  - MARKETPLACE y TIENDAS del footer
  - «IR AL MARKETPLACE» de 06
  - PARA MARCAS, PRIVACIDAD y TÉRMINOS
  - App Store y Google Play
  - Instagram y X de 07

## Reglas de animación (aplican a todas las secciones)
- Solo se anima `transform` y `opacity`. Las excepciones permitidas se marcan en cada sección como **EXCEPCIÓN** y nunca van en un bucle continuo.
- Un solo reloj: `subscribe(fn, { el })` del ticker de 00-shell. Prohibido `requestAnimationFrame` o `setInterval` propios.
- Los rects se cachean en `resize` y `refresh`. No se lee el layout en cada frame salvo donde se indique.
- Las imágenes siempre llevan `width`/`height` o `aspect-ratio`. Todas son lazy salvo la primera del hero.
