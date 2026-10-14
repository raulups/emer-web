# EMER · Handoff — "Sugerir marca" + Footer

Dos piezas nuevas al final de **Explora**, en este orden: `… Catálogo → Sugerir marca → Footer`.
Las páginas Contacto / Sobre / Privacidad / Términos / Cookies **no entran todavía**: los enlaces del footer se dejan como `href="#"` con un `TODO`.

Referencia visual: `referencia/Explora.dc.html` (prototipo; las dos secciones están al final del template y en `sgFrame()` de la lógica).

---

## 0. Reglas generales (iguales que el resto de la web)

- Tipografía: **Inter** (200–900), única familia. Donde el prototipo pone *Helvetica Now Display*, usar Inter con el mismo peso. Si un titular no cabe, **bajar tamaño, no peso**.
- Blanco y negro: tinta `#0f0f0f`, fondo `#fff`. Grises: `#cfcfcf`, `#9a9a9a`, `#8a8a8a`, `#6f6f6f`.
- Bordes 1px `#0f0f0f`, sin radios ni sombras.
- Easing único: `cubic-bezier(.16,1,.3,1)`.
- Etiquetas: 11px, mayúsculas, `letter-spacing: .24em`.
- Animación por scroll en **un solo `requestAnimationFrame`**, escribiendo `transform`/`opacity` directamente en el DOM (no re-render de React por frame).
- Respeta `prefers-reduced-motion`: sin animación de scroll, todo en su estado final.

---

## 1. Sección "Sugerir marca"

### 1.1 Estructura

```
<section ref=sg  height: 380vh  bg #fff>
  <form sticky top:0 height:100vh overflow:hidden>
    label sup. izq.  "SUGERIR MARCA"     (data-slab)
    label sup. dcha. "FALTA UNA"         (data-slab)
    12 filas de nombres de marca          (data-sr = 0..12, sin el 6)
    slot (fila 6)                         (data-slot)
      título "AYÚDANOS A ENCONTRAR MARCAS"  (data-sf=0, encima del slot)
      corchete [  (data-bl)    corchete ]  (data-br)
      cursor propio (data-cur)
      mirror invisible (data-smir) — mide el ancho del texto
      input nombre (data-sf=0)  |  texto enviado (data-sname)
    bloque bajo el slot
      campo Instagram (data-sf=1)
      botón enviar (data-sf=2)
      estado enviado: "EN REVISIÓN · GRACIAS" + "SUGERIR OTRA"
```

Tamaño de fila: `F = min(10vw, 17vh)`. Todas las filas y el slot: `position:absolute; left:0; right:0; top:50%; text-align:center; font: 500 F/1 Inter; letter-spacing:-.05em; white-space:nowrap`.

Nombres: `brands.name.toUpperCase()`. Con 4 marcas de prueba se repiten hasta 12 (marcado `SAMPLE`).

### 1.2 Línea de tiempo (scroll)

```
qr = clamp((vh - rect.top) / rect.height, 0, 1)   // 0 = la sección entra por abajo, 1 = sale
q  = lerp(q, qr, 0.085) cada frame               // inercia → movimiento fluido
E(x) = 1 - (1-x)^3
off = (1 - E(clamp((q-0.08)/0.50))) * 10          // filas que faltan para centrar el slot
s   = E(clamp((q-0.56)/0.16))                     // las filas se apartan
t   = E(clamp((q-0.64)/0.16))                     // aparece el formulario
```

Al principio hay un **espacio en blanco**: con `off = 10` la lista está por debajo de la pantalla y entra subiendo.

**Filas** (`d = índice - 6`):
- `y = (d + off) * F + sign(d) * S * vh * 0.7`
- `foco(y) = clamp(1 - |y| / (vh*0.62))^1.6`
- `opacity = max(0.06, foco) * (1 - S)`, y `0` si `y > vh*0.62`
- `transform: translateY(calc(-50% + y px))`

**Slot**: `y = off * F`, `opacity = foco(y)`.

**Corchetes** (fuente Inter 200, mismo tamaño F): abrazan el texto escrito y crecen al teclear.
- `w = mirror.offsetWidth` (mirror = span invisible con el valor del input, mismo font y uppercase)
- `objetivo = min(vw*0.47, max(F*0.3, w/2 + F*0.14))`; tras enviar se mide el texto enviado
- `g = lerp(g, objetivo, 0.2)`
- `[` → `translate(calc(-100% - g px), -50%)`, `]` → `translate(g px, -50%)`

**Cursor propio**: barra de 2px × 58% de alto, `#0f0f0f`, parpadeo a 500ms. Va al final del texto: `translateX(w/2 + F*0.04)`. El input lleva `caret-color: transparent`. Se oculta al enviar.

**Formulario** (`data-sf = k`): `v = E(clamp((q - 0.64 - k*0.035)/0.16)) * (1 - SV)` → `opacity: v; transform: translateY((1-v)*40px)`.
`pointer-events` de input y botón solo con `t > 0.5` y sin enviar.

**Labels superiores**: `opacity = E(clamp((q-0.3)/0.2))`.

`S` y `SV` (0→1 al enviar) se suavizan con `lerp(…, 0.1)` por frame.

### 1.3 Campos

- **Nombre**: sin placeholder, mayúsculas, máx. 40 caracteres, centrado dentro de los corchetes (`left:12vw; right:12vw`).
- **Instagram**: fila con borde inferior 1px; etiqueta "INSTAGRAM" (110px de ancho), "@" gris `#9a9a9a`, input 24px Inter 500. Se quitan los espacios y la `@` inicial. Válido: `/^[a-zA-Z0-9._]{2,30}$/`.
- **Nombre válido**: `trim().length > 1`.

### 1.4 Botón "ENVIAR SUGERENCIA"

- `padding 18px 20px; border 1px #0f0f0f`, etiqueta 11px.
- A la derecha **no hay flecha**: una línea de 96×1px que se va llenando.
  - Pista: `currentColor` al 25% de opacidad.
  - Relleno: `scaleX(fill)`, `transform-origin:left`, transición `.8s` easing EMER.
  - `fill = (nombre válido ? .5 : 0) + (instagram válido ? .5 : 0)`.
- Inválido: fondo `#fff`, texto `#9a9a9a`, cursor normal. Válido: fondo `#0f0f0f`, texto `#fff`. Transición `.45s`.

### 1.5 Envío

Insertar en Supabase `brand_suggestions` (ver 3). Al terminar bien:
- Las filas vuelven (S → 0) y los corchetes se cierran alrededor del nombre enviado (en mayúsculas).
- Debajo aparecen "EN REVISIÓN · GRACIAS" y el botón "SUGERIR OTRA" (hover: fondo negro, texto blanco), que vuelve al formulario vacío.
- Si falla: mantener el formulario y mostrar debajo "No se pudo enviar. Inténtalo de nuevo." (11px, mayúsculas).

---

## 2. Footer

- `<footer>` fondo `#fff`, `padding-top: 12vh`, `overflow:hidden`.
- Imagen `assets/footer-car.png` (2119×611, coche negro sobre transparente, recortado para que las ruedas toquen el borde inferior).
- Contenedor: `position:relative; width:100%; aspect-ratio: 2119/611`. La imagen lo llena (`position:absolute; inset:0`).
- Los textos van **en blanco dentro de las zonas negras del coche**, posicionados en % del contenedor:

| Bloque | Posición | Contenido |
|---|---|---|
| Trasera | `left:9%; top:54%; width:11%; height:24%`, columna con `space-between` | "EMER" **Inter 800**, `clamp(18px,2.6vw,46px)/.9`, `letter-spacing:-.04em`, `#fff` · "© 2026" Inter 400 `clamp(7px,.62vw,11px)`, `#8a8a8a` |
| Puerta | `left:37.5%; top:52%; width:34%; height:30%`, grid 3 columnas, `gap:1.4vw` | Explorar (Marketplace, Explora, Ofertas) · EMER (Sobre EMER, Sugerir marca, Contacto) · Legal (Privacidad, Términos, Cookies) |
| Morro | `left:85%; top:60%; width:10%; height:20%`, flex fila, `gap:clamp(10px,1.2vw,20px)` | Solo los iconos de Instagram y TikTok, `#fff`, tamaño `clamp(14px,1.6vw,26px)`; hover `opacity:.55` |

Columnas de la puerta:
- Título: Inter **300**, `clamp(7px,.62vw,11px)/1`, `letter-spacing:.24em`, mayúsculas, `#8a8a8a`, `margin-bottom:.9em`.
- Enlaces: Inter 400, `clamp(8px,.78vw,13px)/1.6`, `letter-spacing:.2em`, mayúsculas, `#fff`; hover `#9a9a9a`.

Enlaces:
- Marketplace / Explora → cambian de vista en el shell (mismo switch del topbar).
- Ofertas → Marketplace con el filtro de ofertas activado.
- Sugerir marca → scroll suave hasta la sección "Sugerir marca".
- Sobre EMER, Contacto, Privacidad, Términos, Cookies → `href="#"` + `TODO` (se harán en otra fase).
- Instagram / TikTok → `#` + `TODO` con la URL real.

---

## 3. Supabase

```sql
create table public.brand_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 40),
  instagram text not null check (instagram ~ '^[A-Za-z0-9._]{2,30}$'),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now()
);
alter table public.brand_suggestions enable row level security;
create policy "anon puede sugerir" on public.brand_suggestions
  for insert to anon with check (status = 'pending');
-- sin políticas de select/update/delete para anon
```

Guardar `instagram` sin `@`, en minúsculas.

---

## 4. Archivos

- `assets/footer-car.png` — coche del footer (copiar a los assets del proyecto).
- `referencia/Explora.dc.html` — prototipo de referencia (no copiar tal cual; usa Helvetica y estilos inline).
