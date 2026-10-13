# Revisión final contra `referencia/`

Comprobado con los prototipos servidos en local (servidor estático sobre `referencia/`, con React y Babel de unpkg
interceptados) y la web con `EMER_API_FIXTURES=1`, en 1440×900 y 924×540.

## Verificaciones

| Punto | Resultado |
|---|---|
| Familias tipográficas | Solo **Inter** (`src/fonts/Inter.woff2`, una petición). Sin Google Fonts ni otros orígenes (test e2e). |
| Pesos | Todos en la escala del README: 900 display, 800 titulares, 300 texto y nombres, 200 UI, 500 activo/hover. El 400 solo en nombre y precio de la tarjeta del Marketplace (lo fija el README). Los 400 de Explora y de `VER n`/reintentar pasaron a 300. |
| Duraciones y easings | Todas las duraciones de los CSS existen en la referencia (0.25 – 2.2 s, `cubic-bezier(.16,1,.3,1)` y `(.65,0,.35,1)`). Único añadido: el slide entre vistas (0.9 s, expo). |
| Colores | Los mismos hex que la referencia (ninguno de más ni de menos). |
| Tamaños en px | Los mismos (9, 10, 11, 12, 13, 15, 22, 26, 56). |
| Textos y orden | Mismos textos y mismo orden de secciones: Landing (loader → hero → manifiesto → salida), Marketplace (menú → FILTROS → ficha; panel: ORDENAR, TALLA, PRECIO, COLOR, OFERTAS, BORRAR/VER n), Explora (intro → Populares → Novedades → Emergentes → Catálogo). |
| `SAMPLE` | Ninguno en `src/`. Las marcas inventadas y repeticiones de la referencia no se portan. Las fixtures (solo con `EMER_API_FIXTURES=1`, compiladas en otra carpeta) no entran en el build real. |
| Imágenes rotas | Marca → foto del primer producto (ficha del menú, túnel, Populares, Emergentes, Catálogo). Test e2e con la marca «Imagen Rota». |
| Consola | Sin errores de JS. Solo el 404 de la imagen inexistente de las fixtures, que es lo que prueba el fallback. |
| CLS | 0.000 en `/` y `/web`; 0.011 en Explora (presupuesto ≤ 0.05). |

## Diferencias respecto a la referencia (todas deliberadas)

| Qué | Referencia | Web | Motivo |
|---|---|---|---|
| Tipografías | League Gothic, Anton, Helvetica Now Display | Inter | Decisión: solo Inter. |
| Tamaños en vw de titulares | EMER `min(50vw,60vh)`, contador 30vw, manifiesto `min(6.4vw,11vh)`, NOVEDADES `min(7vw,16vh)` | EMER `min(27vw,50vh)`, contador `min(30vw,52vh)`, manifiesto `min(4.4vw,9vh)`, títulos `min(6vw,15vh)` y EMERGENTES `min(5.6vw,14vh)` | Inter es más ancha: bajar el tamaño, no el peso (README). |
| Tracking de EMER | −.06em | −.035em | Petición. |
| Menú y panel | 6 filas, 181→300 px | 5 filas, «Ver más» abre 8 con scroll; huecos más compactos; cabe sin scroll de primeras | Petición. |
| Landing: carga | Contador de 1.8 s fijo | Espera a marcas e imágenes (hasta 45 s) | Petición. |
| Landing: [ AUTOMÁTICO ] | Un solo recorrido de 12 s o más con in-out, con [ DETENER ] | Por tramos (zoom rápido, túnel y manifiesto al ritmo anterior, salida rápida), sin [ DETENER ] | Petición. |
| Contador de marcas | 00 → 41 fijo | 00 → nº real de marcas (41 solo si falla el backend) | Petición. |
| Slide entre vistas | Cambio instantáneo | Slide horizontal (View Transitions) | Petición. |
| Populares: piezas | 2 de 140 px | Hasta 3, tamaño según el hueco | Petición. |
| Novedades | 6 filas de muestra | 12 últimas marcas reales | El README no fija tope. |
| Catálogo: hover | Se limpia solo al salir de la sección | Se limpia al salir de la celda | Evita que quede una celda marcada y las demás atenuadas. |
| `prefers-reduced-motion` | No contemplado | Versiones estáticas | CLAUDE.md, regla 5. |
