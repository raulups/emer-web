# Prompts — ejecutar en orden

Cada prompt asume que Claude Code tiene acceso a `handoff_sugerir_footer/` (README.md, assets/, referencia/).

---

## 1 · Supabase

Lee `handoff_sugerir_footer/README.md` sección 3. Crea la migración de la tabla `brand_suggestions` con sus checks y la política RLS de solo inserción para `anon`. Añade al cliente de datos una función `suggestBrand({ name, instagram })` que normalice (trim, sin `@`, instagram en minúsculas) e inserte. Devuelve `{ ok: true }` o `{ ok: false, error }`. No toques nada más.

---

## 2 · Sugerir marca — estructura y formulario

Lee el README, secciones 0 y 1 (1.1, 1.3, 1.4). Crea el componente `SuggestBrand` y móntalo en Explora justo después de Catálogo. Por ahora sin animación de scroll: muestra el estado final (slot centrado, filas ocultas, formulario visible). Incluye:
- Las 12 filas con nombres de marca (dato real de `brands`, repetido si hay menos de 12, con comentario `SAMPLE`).
- El slot con los corchetes, el input de nombre sin placeholder, el span mirror invisible y el cursor propio.
- El título "AYÚDANOS A ENCONTRAR MARCAS", el campo Instagram y el botón con la línea que se llena según la validación.
Usa Inter, los tamaños y colores exactos del README. Bordes 1px, sin radios.

---

## 3 · Sugerir marca — animación de scroll

Implementa la línea de tiempo de la sección 1.2 del README dentro de `SuggestBrand`:
- Sección de 380vh con contenido sticky de 100vh.
- Un solo bucle `requestAnimationFrame`, activo solo cuando la sección está cerca del viewport. Escribe `transform`/`opacity` directamente en los nodos (refs), sin `setState` por frame.
- Progreso `q` con inercia (`lerp 0.085`); fórmulas de `off`, `s`, `t`, foco de filas, corchetes que siguen el ancho del mirror (`lerp 0.2`), cursor al final del texto, entrada escalonada del formulario y `pointer-events` solo con `t > 0.5`.
- Con `prefers-reduced-motion`, sin bucle: estado final directo.
Verifica que el arranque tiene espacio en blanco y que los nombres entran desde abajo de forma fluida, sin saltos.

---

## 4 · Sugerir marca — envío

Conecta el submit a `suggestBrand` (prompt 1). Botón deshabilitado hasta que nombre e Instagram sean válidos. Mientras envía, ignora más clics. Si sale bien: estado "enviado" de la sección 1.5 (las filas vuelven, los corchetes se cierran sobre el nombre en mayúsculas, "EN REVISIÓN · GRACIAS" + "SUGERIR OTRA"). Si falla: conserva los datos y muestra el mensaje de error del README.

---

## 5 · Footer

Lee la sección 2 del README. Copia `handoff_sugerir_footer/assets/footer-car.png` a los assets del proyecto. Crea `Footer` y móntalo al final de Explora, después de `SuggestBrand`. Contenedor con `aspect-ratio: 2119/611` y los tres bloques posicionados en % exactos de la tabla (trasera, puerta, morro), con textos blancos sobre el negro del coche, EMER en Inter 800, títulos de columna en Inter 300. Los iconos de Instagram y TikTok son SVG inline en `currentColor`. Conecta Marketplace, Explora, Ofertas y Sugerir marca como dice el README. Sobre EMER, Contacto, Privacidad, Términos, Cookies e iconos quedan con `href="#"` y `// TODO`.
Comprueba a 1440, 1024 y 800px de ancho que ningún texto se sale de las zonas negras; si alguno pisa el blanco, ajusta solo su `top`/`left`.

---

## 6 · Revisión

Revisa `SuggestBrand` y `Footer` contra el README punto por punto: tipografía (solo Inter), colores, bordes, easing, tamaños, fórmulas de scroll, validaciones, estados enviado/error, RLS, enlaces y `TODO`s. Comprueba que no hay errores en consola, que el rAF se pausa fuera de la sección y que todo funciona con `prefers-reduced-motion`. Haz una lista de las diferencias que encuentres y corrígelas.
