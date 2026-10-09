# 01-loader — Handoff

Pantalla blanca de carga: gato en flipbook de 4 frames, 4 barras de progreso, «CARGANDO MARCAS» y un contador de imágenes. Cuando termina, emite `emer:loaded` (ver 00-shell).

## 1. Estructura y textos
```html
<div id="loader" role="status" aria-live="polite" aria-label="Cargando marcas">
  <div class="ld__cat" aria-hidden="true">
    <img src="/loader/gato-1.webp" width="120" height="120" alt="" data-on />
    <img src="/loader/gato-2.webp" width="120" height="120" alt="" />
    <img src="/loader/gato-3.webp" width="120" height="120" alt="" />
    <img src="/loader/gato-4.webp" width="120" height="120" alt="" />
  </div>
  <div class="ld__bars" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <p class="ld__label">CARGANDO MARCAS</p>
  <p class="ld__count">07 / 18</p>
</div>
```

**Textos fijos:**
- CARGANDO MARCAS
- `— / —` mientras no se conoce el total

**Layout:**
- Fijo a pantalla completa, `z-index: 500`, fondo blanco, flex en columna centrado, gap de 16px.
- Gato: 120×120, frames superpuestos, `object-fit: cover`, `object-position: 50% 100%`.
- Barras: 64px de ancho total, gap de 3px, 2px de alto. Llenas en `#000`, vacías en `#d6d6d6`.
- Etiqueta: Fraunces 9px, tracking .24em.
- Contador: 8px, tracking .22em, `#8a8a8a`.

## 2. Coreografía
| Elemento | Propiedad | Duración | Easing | Disparador |
|---|---|---|---|---|
| Frames del gato | se muestra el frame (frame + 1) % 4 (opacity 0/1, sin transición) | cada 420ms | escalonado | mientras carga |
| Barras | la barra i se llena si i ≤ frame (cambio de color sin transición; **EXCEPCIÓN** de color) | cada 420ms | — | mismo tick que el frame |
| Contador | texto `pad2(cargadas) / pad2(total)` | — | — | onload u onerror de cada imagen |
| Salida | opacity 1 → 0 y `pointer-events: none` | .35s | reveal `(.2,.7,.2,1)` | condición de salida |
| Desmontaje | quitar del DOM y emitir `emer:loaded` | a los 380ms de iniciar la salida | — | — |

**Condición de salida** (se comprueba en cada tick del ticker):
```
tiempo ≥ 1700ms  Y  datos de marcas recibidos  Y  (todas las imágenes de marca cargadas o fallidas  O  tiempo ≥ 5000ms)
```

**Qué se precarga:**
- Cuenta para el total y el contador: las `brand.img` de todas las marcas con imagen.
- En segundo plano, sin contar: las `previewProducts[].imageUrl`.
- Una imagen que falla cuenta como terminada y se registra en un set `badImages` compartido. Las secciones lo usan para descartar esa marca o ese producto.

**Frames:** los lleva el ticker (`subscribe`), acumulando dt hasta 420ms, no un `setInterval`.

**Primera visita y siguientes:** **propuesta**. Si `sessionStorage['emer:loaded']` existe, el mínimo de 1700ms baja a 0 y el loader sale en cuanto hay datos.

## 3. Movimiento reducido
- Gato fijo en el frame 1, sin flipbook. Las barras reflejan el progreso real (cargadas / total, en cuartos).
- Salida: opacity en 200ms. El mínimo de 1700ms se mantiene para que no parpadee.

## 4. Assets
| Asset | Tamaño | Peso |
|---|---|---|
| `loader/gato-1…4.webp` | 240×240 (2× de 120) | 8–10 KB cada uno |
| `loader/gato-error.webp` | 480×480 | 15 KB; para el estado de error (**propuesta**) |

Los 4 frames van con `<link rel="preload" as="image">` en el `<head>`: son lo primero que se pinta.

## 5. Datos
```jsonc
// Usa el resultado de GET /brands (el mismo que alimenta el resto). Solo lee:
{ "img": "https://…/satenier_image.png" }   // string|null — datos → precarga y total
```
- **Fijo:** CARGANDO MARCAS y la mecánica.
- El total cuenta las `Brand` con `img !== null`.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Flipbook + barras + contador (es el propio loader). |
| Datos lentos (> 5s) | Sale igualmente si ya hay datos; las imágenes siguen cargando en cada sección con sus fondos de color o skeleton. |
| Sin datos a los 5s | Sigue en pantalla hasta un máximo de 10s; después muestra el error. |
| Error (fallo de `/brands`) | El gato cambia a `gato-error.webp`, las barras desaparecen y se muestra «NO HEMOS PODIDO CARGAR LAS MARCAS» (9px, tracking .24em) + «REINTENTAR ↻» (**propuesta**). REINTENTAR repite la petición. Si sigue fallando, «ENTRAR IGUALMENTE →» emite `emer:loaded` y las secciones muestran sus estados de error. |
| Vacío (0 marcas) | Total 0: sale al cumplirse los 1700ms. |
| Sin JS | `<noscript>` oculta el loader (00-shell). |

## Prompt para Claude Code
> Implementa `components/Loader.tsx` según `handoff/01-loader.md`. Flipbook de 4 frames cada 420ms desde el ticker (no setInterval), barras sincronizadas y contador de las `brand.img` precargadas (las fallidas cuentan y se añaden a un store `badImages` compartido). Las imágenes de producto se precargan en segundo plano sin contar. Salida cuando se cumplan: ≥1700ms, datos listos y (imágenes listas o ≥5000ms). La salida es opacity .35s `(.2,.7,.2,1)`, desmontaje a los 380ms y `bus.emit('emer:loaded')`. Precarga los frames con `<link rel="preload">`. Estado de error con gato-error.webp, REINTENTAR y ENTRAR IGUALMENTE. Implementa también movimiento reducido.
