# Prompts para Claude Code (en orden)

Pega cada prompt en una sesión de Claude Code abierta en el repo de la web, con esta carpeta `design_handoff_emer_web/` copiada en la raíz. Lanza el siguiente cuando el anterior compile y se vea bien.

---

## 0 · Reset (empezar de cero)
> Vamos a rehacer la web de EMER desde cero. Lee `design_handoff_emer_web/README.md` entero antes de tocar nada.
> **Elimina todo el diseño actual**: páginas, componentes, estilos globales, animaciones, fuentes y assets que no sean del handoff. Conserva solo la configuración del proyecto (framework, build, despliegue, variables de entorno y cliente de Supabase).
> Crea la estructura: rutas `/` (Landing) y `/web` (Shell con Marketplace/Explora), carpeta `components/`, `lib/data.ts` (consultas a Supabase con las tablas del README) y `styles/tokens` con los colores, easings y fuentes del README.
> **Tipografía única: Inter**, autoalojada desde `fonts/` (`@font-face` con el `.woff2` variable, `font-weight: 100 900`, `font-display: swap`). No cargues ninguna otra fuente: donde la referencia use League Gothic, Anton o Helvetica Now Display, usa Inter con la escala de pesos del README (titulares 800–900 muy apretados, resto 200–300). Crea tokens `--font`, `--w-display:900`, `--w-title:800`, `--w-text:300`, `--w-ui:200`, `--w-active:500`.
> Añade el cursor propio global (punto de 12px con `mix-blend-mode:difference`, solo en `pointer:fine`).
> No implementes pantallas todavía. Enséñame el árbol de archivos final y qué has borrado.

## 1 · Shell + switch
> Implementa el Shell según README §2 y `referencia/Web.dc.html`: `padding-top` de 76px, switch fijo arriba al centro con halo blur, letras con stagger, corchetes animados y línea que viaja entre opciones en hover. Abre en MARKETPLACE; EXPLORA monta Explora a sangre (`margin-top:-76px`). De momento usa placeholders para Marketplace y Explora.

## 2 · Marketplace
> Implementa Marketplace según README §3 y `referencia/Marketplace.dc.html`, con datos reales de Supabase. Incluye:
> - Menú lateral sticky: categorías, marcas con "Ver más", scroll propio con barra de 1px, ficha de marca bajo FILTROS y fallback de imagen.
> - Botón [ MENÚ ] fijo para ocultar o mostrar el menú.
> - Panel de filtros (ordenar, talla con corchetes, precio con slider doble, color, ofertas, BORRAR con recuadro y VER n subrayado).
> - Grid de tarjetas sin borde, con carrusel de fotos en hover, flechas, índice, franja de tallas con blur y subrayado del nombre.
> - Estado vacío.
>
> Todos los hovers y selecciones animados exactamente con los tiempos del README. En hover las etiquetas no cambian de tamaño: solo negrita y subrayado.

## 3 · Landing
> Implementa la Landing según README §1 y `referencia/Landing.dc.html`:
> - Loader con contador y barra de 2px, y [ SALTAR ] centrado que viaja a la esquina.
> - Transición tipo scroll (el loader sube y EMER entra desde abajo).
> - Hero sticky con EMER en Inter 900 (display), las imágenes decorativas (posiciones y tamaños del array DECO), la mujer abajo a la derecha, [ AUTOMÁTICO ] parpadeando y la línea de BAJA en bucle.
> - Zoom de EMER y salida de las imágenes antes del negro.
> - Túnel de imágenes de marca bajo el contador 00→41.
> - Manifiesto en 5 líneas fijas con imágenes que se destapan y corte brusco a la bomba.
> - Salida con barra y cortina, que navega a `/web`.
>
> Todo el scroll va en un bucle rAF que escribe estilos en refs (sin re-render por frame).

## 4 · Explora: intro + Populares
> Implementa Explora §4.1 y §4.2 según README y `referencia/Explora.dc.html` (método `frame()` y `renderVals()`):
> - Intro MARCAS + PO/PU/LA/RES en escalera, con la cuadrícula 2×2 sticky.
> - Populares: nombres en fila con capa negra recortada a la ventana 50–75%, pista de imágenes sincronizada, descripción y 2 productos abajo a la izquierda, y contador abajo a la derecha.
>
> Desplazamientos interpolados con `offsetLeft` medido y suavizado con lerp de 0.14.

## 5 · Explora: Novedades + transición + Emergentes
> Implementa §4.3 y §4.4:
> - Novedades con fondo negro, título sticky a la izquierda, lista con opacidad según la distancia al centro, entrada escalonada y preview de marca en hover **sin animación**.
> - Transición: spacer de 200vh, línea que gira 180° y máscara `conic-gradient` sobre Novedades que deja ver Emergentes, fija debajo (`margin-top:-200vh`). Debe ir sin saltos al terminar.
> - Emergentes en blanco: título e info a la derecha, carrusel de dos columnas en sentidos opuestos con filas alineadas al final, hover para cambiar la marca activa y sin repetidas.
>
> Revísalo frame a frame en 1440×900 y 924×540.

## 6 · Explora: Catálogo
> Implementa §4.5:
> - 70vh de entrada con la línea vertical bajando.
> - Bloque sticky con scroll horizontal de toda la pista (título incluido); el alto se calcula con el recorrido medido.
> - Grid irregular (LAY), hover con zoom, atenuado de las demás, miniaturas o "Catálogo pronto" y "Ver marca ↗".
> - Sin cambiar el tamaño de las celdas.

## 7 · Repaso final
> Comprueba que en todo el proyecto solo se carga Inter (sin Google Fonts ni otras familias) y que los pesos siguen la escala del README. Recorre la web completa contra los prototipos de `referencia/` (sírvelos con `npx serve design_handoff_emer_web/referencia`). Haz una lista de diferencias en tiempos, tamaños, colores, textos y orden, y corrígelas. Confirma que no queda ningún dato `SAMPLE`, que las imágenes rotas usan el fallback y que no hay errores en consola.
