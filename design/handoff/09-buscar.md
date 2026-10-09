# 09-buscar — Handoff (variante «Índice»)

Overlay que baja como un telón desde arriba y ocupa 2/3 de la pantalla. El texto se escribe gigante y centrado, y debajo los resultados aparecen como un índice de nombres separados por «/». Al pasar por un resultado se muestra su imagen fija a la derecha. La búsqueda es solo en cliente, sobre las marcas.

## 1. Estructura y textos
```html
<div id="buscar" role="dialog" aria-modal="true" aria-label="Buscar marcas">
  <div class="sr__veil"></div>                         <!-- clic → cerrar -->
  <div class="sr__panel">
    <div class="sr__top">
      <button type="button" class="sr__close">CERRAR <kbd>ESC</kbd></button>
    </div>
    <div class="sr__body">
      <label class="sr__field">
        <span class="sr-only">Nombre de la marca</span>
        <input type="search" maxlength="22" spellcheck="false" autocomplete="off"
               aria-controls="sr-results" aria-activedescendant="" />
        <span class="sr__echo" aria-hidden="true">SATEN<span class="caret"></span></span>
      </label>
      <span class="sr__rule"></span>
      <p class="sr__count" aria-live="polite">03 MARCAS</p>

      <ul id="sr-results" class="sr__results" role="listbox">
        <li role="option" id="sr-0">
          <a href="{brand.url}" target="_blank" rel="noopener">
            <span class="dim">SA</span><span class="hit">TEN</span><span class="dim">IER</span>
          </a>
          <span class="sep">/</span>
        </li>
      </ul>

      <p class="sr__none">Ninguna marca con ese nombre. <button type="button">Sugiérela.</button></p>
    </div>
  </div>
  <img class="sr__preview" alt="" />                    <!-- fija a la derecha -->
</div>
```

**Textos fijos:**
- CERRAR · ESC
- `NN MARCAS` / `1 MARCA`
- Ninguna marca con ese nombre. Sugiérela.

En el diseño «Sugiérela.» era texto plano y la función `goSuggest` ya existía. Se convierte en botón.

**Overlay:**
- Velo a pantalla completa, `rgba(0,0,0,.35)`.
- Panel fijo arriba, 66.6vh, fondo `rgba(0,0,0,.84)` con `backdrop-filter: blur(8px)` (estático), `border-bottom` de 1px `#2a2a2a`, scroll vertical propio.
- CERRAR: arriba a la derecha, padding `28px clamp(16px, 3vw, 40px)`, 9px con tracking .3em; «ESC» en `#8a8a8a`.

**Campo y eco:**
- El input real es invisible y ocupa el área del eco.
- Eco: Anton en mayúsculas, centrado, sin salto de línea, color blanco.
  - Tamaño con texto: `min(min(200, 70 + L·14)px, (100vw − 80px) / (L·.5 + .3))`, donde L = longitud de la consulta.
  - Tamaño vacío: 64px.
- Caret: 3px × .8em blanco.
- Raya: 1px blanco, margen superior de 12px.
- Contador: 8.5px con tracking .28em, `#bdbdbd`, margen superior de 14px.

**Resultados:**
- Margen superior `clamp(36px, 4vw, 60px)`, máximo 760px, flex con wrap centrado, gaps de 14px / 12px.
- Fraunces 10px, tracking .28em, interlineado 1.6.
- La coincidencia va en `#fff`, el resto en `#7a7a7a`, y el separador «/» en `#5a5a5a`.
- Activo u hover: subrayado blanco de 1px con padding-bottom de 2px.

**Preview:** fija, a la derecha a `clamp(16px, 4vw, 64px)`, centrada en vertical, ancho `clamp(150px, 12vw, 190px)`, 3/4, en cover.

**Vacío:** 300 italic 16px `#bdbdbd`, margen superior de 40px.

## 2. Coreografía
| # | Elemento | Propiedad | Duración | Easing | Delay | Disparador |
|---|---|---|---|---|---|---|
| 1 | Panel: apertura | se despliega de arriba abajo | .75s | curtain `(.76,0,.24,1)` | 30ms tras montar | `emer:search:open` |
| 2 | Velo | opacity 0 → 1 (capa negra al 35 %) | .6s | standard | 0 | apertura |
| 3 | Foco | el input recibe el foco | — | — | 30ms | apertura |
| 4 | Espacio superior | translateY del bloque del campo: 14vh vacío → 1vh con texto | .8s | out-expo | 0 | primera letra / borrar todo |
| 5 | Eco | tamaño según la fórmula | .5s | out-expo | 0 | cada tecla |
| 6 | Raya | scaleX: 40px vacío → `min(70vw, 720px)` con texto | .7s | out-expo | 0 | primera letra / borrar todo |
| 7 | Contador | opacity 0 ↔ 1 | .4s | standard | 0 | consulta vacía o no |
| 8 | Caret | parpadeo de opacity, `steps(1)` | 1s infinito | — | — | siempre |
| 9 | Resultados nuevos | opacity 0 → 1 (.6s) + translateY 8px → 0 (.8s out-expo) | | | k · 40ms (k = orden de los resultados que no estaban antes) | cambio de la lista |
| 10 | Subrayado | border-color transparente → blanco | .3s | — | 0 | hover o selección por teclado |
| 11 | Preview | opacity 0 → 1 (.4s) + translateY 16px → 0 (.7s out-expo) | | | 0 | hover o selección |
| 12 | Panel: cierre | se recoge hacia arriba (al revés de #1); desmontar a los 700ms | .75s | curtain | 0 | ESC con la consulta vacía, CERRAR o clic en el velo |

**Cómo implementar cada paso:**
- **#1 y #12:** el diseño usa `clip-path: inset(0 0 100% 0) → inset(0)`. En producción se usa el patrón de doble translateY: el panel va de -100 % a 0 y su contenido de 100 % a 0. El velo y el blur se quedan fijos.
- **#4:** el diseño anima `min-height`. Aquí se usa translateY del bloque.
- **#5:** el diseño anima `font-size`. Opción recomendada: fijar `font-size` al tamaño destino sin transición y animar un `scale` que va de `tamañoAnterior / tamañoNuevo` a 1 en .5s out-expo (técnica FLIP).
- **#6:** el diseño anima `width`. Aquí, ancho fijo de `min(70vw, 720px)` y scaleX de `40/ancho` a 1.

**Teclado:**
| Tecla | Acción |
|---|---|
| ↑ / ↓ | Mueve la selección (empieza en 0) y actualiza `aria-activedescendant`, el subrayado y la preview |
| Enter | Abre `brand.url` de la selección en una pestaña nueva |
| Esc | Con texto, borra; sin texto, cierra |
| Tab | El foco queda atrapado dentro del diálogo |

Al cerrar, el foco vuelve al elemento que abrió el buscador.

**Filtrado:** `norm(brand.name).includes(norm(q))`. La coincidencia se resalta en la posición que devuelve `indexOf` sobre el texto normalizado, aplicada al nombre en mayúsculas (`upper(name)`) para mostrarlo.

**Scroll:** Lenis se para al abrir (`emer:search:open`) y se reanuda al cerrar. El panel tiene su propio scroll con `data-lenis-prevent`.

## 3. Movimiento reducido
- El panel aparece y desaparece con opacity 200ms. Sin telón.
- El eco cambia de tamaño sin animar; la raya y el espacio superior saltan sin transición.
- Resultados sin stagger ni desplazamiento. La preview aparece solo con opacity.
- Caret fijo, sin parpadeo.

## 4. Assets
| Asset | Tamaño |
|---|---|
| `brand.img` (preview) | se muestra a 190×253; pedir a 400×533 |

Sin SVG ni imágenes fijas.

## 5. Datos
```jsonc
// Reutiliza las Brand[] ya cargadas (sin petición nueva). La búsqueda es en cliente.
{
  "id": "0208bdca-…",            // string — datos → key / id de la opción
  "name": "Satenier",            // string — datos → filtro y texto
  "url": "https://satenier.com", // string — datos → enlace y Enter
  "img": "https://…"             // string|null — datos → preview (si es null, no hay preview)
}
```
- **Fijo:** CERRAR / ESC, las etiquetas del contador y el texto de vacío.
- No hay slugs ni búsqueda en el backend, por diseño del sistema.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Inicial (sin consulta) | Caret parpadeando a 64px, raya de 40px, sin contador ni resultados. |
| Con resultados | Índice + contador `NN MARCAS` / `1 MARCA`. |
| Vacío (0 resultados) | Contador «00 MARCAS» + «Ninguna marca con ese nombre. Sugiérela.». Sugiérela cierra el buscador, emite `emer:suggest` con la consulta y hace `lenis.scrollTo('#sugiere')` a los 360ms. |
| Carga (marcas aún sin cargar) | El buscador se abre; el contador muestra «— MARCAS» y los resultados aparecen cuando llegan los datos. |
| Error de datos | Texto «No hemos podido cargar las marcas.» en el lugar del vacío (**propuesta**). |
| Imagen de la preview rota | No hay preview para esa marca. |

## Prompt para Claude Code
> Implementa `components/Search.tsx` según `handoff/09-buscar.md`. Es un diálogo modal accesible: foco atrapado, ESC, `aria-activedescendant` y devolución del foco al cerrar. Se abre con `emer:search:open` y se cierra emitiendo `emer:search:close`, lo que para y reanuda Lenis. El telón usa el patrón de doble translateY (.75s curtain); el velo, opacity .6s. El eco tipográfico usa la fórmula de tamaño exacta con FLIP (font-size al destino + scale animado .5s out-expo). La raya va con scaleX y el espacio superior con translateY. Resultados con stagger de 40ms solo para los nuevos. La búsqueda es en cliente con `norm()` sobre las Brand ya cargadas, con resaltado de la coincidencia. ↑/↓ seleccionan y Enter abre `brand.url`. «Sugiérela.» emite `emer:suggest` y hace scroll a #sugiere. Implementa también movimiento reducido y los estados.
