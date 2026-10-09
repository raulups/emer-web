# 07-sugiere — Handoff

Formulario mínimo («¿FALTA ALGUNA?») con dos campos, el envío con un sello «RECIBIDA», y contacto. Detrás, decorados tipo estarcido repartidos y de tamaños muy variados.

## 1. Estructura y textos
```html
<section id="sugiere" data-section="SUGIERE" aria-labelledby="sg-title">
  <div class="sg__deco" aria-hidden="true">                  <!-- z-index -1 -->
    <figure class="deco"><img class="deco__ghost" alt="" /><img class="deco__img" alt="" /></figure>   <!-- ×9 -->
  </div>

  <div class="sg__box">
    <header>
      <p class="eyebrow">SUGIERE UNA MARCA</p>
      <h2 id="sg-title">¿FALTA<br />ALGUNA?</h2>
    </header>

    <!-- estado: edición -->
    <form class="sg__form" novalidate>
      <div class="sg__fields">
        <label>
          <span>NOMBRE DE LA MARCA</span>
          <input name="name" maxlength="32" autocomplete="off" />
        </label>
        <label>
          <span>INSTAGRAM</span>
          <input name="instagram" maxlength="40" autocomplete="off" inputmode="url" />
        </label>
      </div>
      <div class="sg__actions">
        <p>Con uno de los dos nos basta.</p>
        <button type="submit" aria-disabled="true">ENVIAR <span class="loop-line"></span></button>
      </div>
    </form>

    <!-- estado: enviada -->
    <div class="sg__sent" role="status">
      <p class="sg__word">SATENIER</p>
      <span class="sg__stamp">RECIBIDA</span>
      <button type="button">SUGERIR OTRA <span class="loop-line"></span></button>
    </div>

    <footer class="sg__contact">
      <div>
        <p>O CONTÁCTANOS</p>
        <p>Para cualquier otra cosa.</p>
      </div>
      <nav aria-label="Contacto">
        <a href="mailto:hola@emer.app" aria-label="Mail">{svg}</a>
        <a href="[PENDIENTE]" aria-label="Instagram" target="_blank" rel="noopener">{svg}</a>
        <a href="[PENDIENTE]" aria-label="X" target="_blank" rel="noopener">{svg}</a>
      </nav>
    </footer>
  </div>
</section>
```

**Textos fijos:**
- SUGIERE UNA MARCA · ¿FALTA / ALGUNA?
- NOMBRE DE LA MARCA · INSTAGRAM · Con uno de los dos nos basta. · ENVIAR
- RECIBIDA · SUGERIR OTRA
- O CONTÁCTANOS · Para cualquier otra cosa.
- Correo: hola@emer.app

**Sección:**
- Mínimo 100vh, padding `clamp(120px, 12vw, 180px) clamp(16px, 3vw, 40px) clamp(160px, 15vw, 240px)`, centrado en vertical.
- Caja: máximo 820px, gap `clamp(32px, 4vw, 56px)`.
- Título: Anton `clamp(60px, 9vw, 150px) / .86`.

**Formulario:**
- Campos en grid `repeat(auto-fit, minmax(min(100%, 260px), 1fr))` con gap de 22px.
- Etiqueta: 8.5px, tracking .26em, `#666`.
- Input: Anton `clamp(28px, 3vw, 42px)`, `border-bottom` de 2px negro. El nombre se escribe en mayúsculas (`text-transform: uppercase`). Placeholder `#b5b4ae`, sin texto.
- Botón: 58px de alto, padding de 32px, 10px con tracking .32em, texto blanco. Fondo `#9a9a9a` si no hay datos y `#000` si los hay. Al pulsar, scale .97.

**Sello:**
- Borde de 3px negro, padding 8/16, Anton `clamp(24px, 2.4vw, 34px)`, tracking .04em, rotate -7°.

**Contacto:**
- `border-top` de 1px.
- Iconos en círculos de 56px con borde de 1px. En hover se invierten (.3s).
- Son 3 SVG de línea de 1.5px; están en el `.dc.html` de referencia.

**Decorados** (9 en `deco/`; posiciones base + jitter aleatorio por montaje):
| Archivo | Anclaje | Ancho base | Rotación base | Proporción |
|---|---|---|---|---|
| coche-lateral | right -6vw, bottom -4 % | 40vw | 0° | 2.4 |
| caballos | left 2vw, top 3 | 22vw | -3° | 2.6 (recortado) |
| grupo | right 3vw, top 2 | 16vw | 0° | 1.4 (recortado) |
| monos | right 30vw, top 5 | 9vw | -6° | 1.6 (recortado) |
| tabaco | left 4vw, bottom 6 % | 13vw | -10° | 1 |
| mecheros | left 46vw, bottom 3 % | 6vw | 8° | .85 (recortado) |
| moto | right 6vw, top 38 % | 12vw | 0° | .9 (recortado) |
| estrellas | left 38vw, top 2 | 4vw | 0° | .55 |
| mano | left -2vw, top 34 % | 12vw | -14° | 1 |

**Jitter por montaje** (4 valores aleatorios por decorado):
- `j0, j1, j2 ∈ [-.5, .5]` y `s ∈ [.88, 1.18]`.
- ancho = base · s.
- left/right = base + j0 · 2vw.
- top: si la base es < 6, `12 + |j1| · 16` px; si no, base + j1 · 3 %.
- rotación = base + j2 · 6°.

Para evitar un salto en la hidratación, la semilla se genera en el servidor y viaja como prop.

## 2. Coreografía
| Elemento | Propiedad | Duración | Easing | Delay | Disparador |
|---|---|---|---|---|---|
| Decorado en hover | translateY 0 → -10px, rotate base → 0, scale 1 → 1.06 | .9s | out-expo | 0 | hover |
| Ghost del decorado | opacity 0 → .35, translate(0, 0) → (12px, 9px) | .6s / .9s | standard / out-expo | 0 | hover |
| Botón ENVIAR | fondo `#9a9a9a` ↔ `#000` | .35s | — | 0 | hay datos (**EXCEPCIÓN**: color) |
| Botón al pulsar | scale 1 → .97 | .2s | — | 0 | `:active` |
| Cambio a «enviada» | el formulario se sustituye sin transición | — | — | — | envío correcto |
| Sello RECIBIDA | scale 2.4 → 1 + opacity 0 → 1 | .45s / .2s | back `(.34,1.56,.64,1)` / lineal | 200ms (ambos) | tras enviar |
| SUGERIR OTRA | resetea los campos, vuelve a edición y enfoca el nombre a los 50ms | — | — | — | clic |
| Iconos de contacto | fondo y color invertidos | .3s | — | 0 | hover |
| Líneas en bucle | `emLine` 1.8s | | | | siempre |

**Hover de los decorados:**
- La capa tiene `pointer-events: none`. Se detecta con el puntero contra los rects cacheados en un subscriber `{ el: section }`, igual que en Emergentes.
- En el diseño este hover estaba desactivado (`on = false`). Se activa por la regla del proyecto: **propuesta**, confirmar.

**Validación y envío:**
- Hace falta `name.trim()` o `instagram.trim()`. Si están vacíos al enviar, se enfoca el nombre sin mostrar error.
- Enter en cualquiera de los dos campos envía.
- En el diseño el instagram se mostraba sin la «@» inicial (`replace(/^@/, '')`). Aquí se normaliza **antes de enviar**.

## 3. Movimiento reducido
- Decorados estáticos, sin hover.
- Sello: aparece con opacity 200ms, sin escala ni rebote.
- Líneas en bucle paradas.

## 4. Assets
| Asset | Tamaño |
|---|---|
| `deco/{coche-lateral, caballos, grupo, monos, tabaco, mecheros, moto, estrellas, mano}.webp` | ver README; el mayor (coche-lateral) se muestra a 40vw, así que se sirve el original de 800px; `sizes="40vw"` |
| SVG de mail, Instagram y X | 20×20 y 18×18, inline (en la referencia) |

## 5. Datos
**Lectura:** ninguna.

**Escritura** (**FALTA EN BACKEND**):
```jsonc
// POST /suggestions
{ "name": "SATENIER",      // string|null, ≤32 — datos (entrada del usuario)
  "instagram": "satenier"  // string|null, ≤40, sin @ — datos
}
// 201 → { "id": "…" }   |   4xx/5xx → error
```
- **Fijo:** todos los textos y los enlaces de contacto (Instagram y X pendientes).
- **Propuesta:** honeypot oculto y límite de 1 envío cada 10s en cliente.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Inicial (vacío) | Botón `#9a9a9a` con `aria-disabled`; al pulsar, se enfoca el nombre. |
| Enviando | Botón con el texto «ENVIANDO…» (**propuesta**), sin interacción. La línea en bucle sigue. |
| Enviada | Se muestra la palabra (nombre o instagram en mayúsculas) + el sello RECIBIDA + SUGERIR OTRA. |
| Error | El formulario se mantiene con los datos y, bajo los campos, aparece «No se ha podido enviar. Inténtalo otra vez.» en 300 italic 14px `#3f3f3f` (**propuesta**). El botón vuelve a estar activo. |
| Mientras no exista el endpoint | Se trata como error. **No** se simula un éxito. |
| Prellenado desde 09-buscar | Si llega `?sugiere=Nombre` o el evento `emer:suggest` con el nombre, el campo nombre se rellena y se enfoca. |

## Prompt para Claude Code
> Implementa `components/sections/Sugiere.tsx` según `handoff/07-sugiere.md`. Es un formulario controlado con dos campos (32 / 40 caracteres) que exige al menos uno; Enter envía. Los envíos van por una server action que llama a `POST /suggestions`. Ese endpoint aún no existe: implementa el cliente y el estado de error, sin simular el éxito. El sello RECIBIDA va con GSAP: scale 2.4 → 1 en .45s con back-ease + opacity, ambos con 200ms de delay. Decorados: los 9 de la tabla, con el jitter calculado a partir de una semilla generada en servidor, en z-index -1; hover en el ticker contra los rects (elevación de 10px, rotación a 0, scale 1.06, ghost 12/9px al 35 %). Escucha `emer:suggest` para prellenar el nombre. Implementa también movimiento reducido y los estados.
