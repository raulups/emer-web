# 04-emergentes — Handoff (variante «Recorrido»)

Sección fijada (pinned) con recorrido horizontal ligado al scroll vertical. Paneles de marca de 3 tamaños, decorados detrás con parallax y un popup que se abre en 4 tiempos: punto → línea → barra → tarjeta que se despliega como una persiana. Las variantes «Índice» y «Tablón» están descartadas (siguen en `referencia/`).

## 1. Estructura y textos
```html
<section id="emergentes" data-section="EMERGENTES" aria-labelledby="em-title">
  <div class="em__pin">                                   <!-- sticky de 100vh -->
    <div class="em__deco" aria-hidden="true">             <!-- z-index -1: siempre debajo -->
      <!-- ×13 -->
      <figure class="deco" data-i="0" data-r="0" style="--l:3vw;--t:8vh;--w:clamp(60px,6vw,96px)">
        <img class="deco__ghost" src="/deco/estrellas.webp" alt="" />
        <img class="deco__img"   src="/deco/estrellas.webp" alt="" />
      </figure>
    </div>

    <div class="em__bar">
      <span>EMERGENTES</span>
      <div class="em__progress"><span></span></div>
      <span class="em__count">01 / 08</span>
    </div>

    <div class="em__track">
      <header class="em__intro">
        <p class="eyebrow">MARCAS</p>
        <h2 id="em-title">EMER<br />GENTES</h2>
        <p class="em__hint">Baja para recorrerlas ↓</p>
      </header>

      <!-- ×n (máx. 8) -->
      <article class="em__panel" data-size="a|b|c" tabindex="0">
        <div class="panel__clip">
          <div class="panel__par"><img alt="" /></div>
          <span class="panel__veil"></span>
          <span class="panel__num" aria-hidden="true">01</span>
        </div>
        <div class="panel__foot">
          <h3>SATENIER</h3>
          <time datetime="2026-06-07">07.06.26</time>   <!-- FALTA EN BACKEND -->
        </div>
      </article>

      <footer class="em__outro">
        <p>Y LAS QUE<br />VENDRÁN.</p>
        <a href="#catalogo">VER TODAS LAS MARCAS →</a>
      </footer>
    </div>

    <svg class="em__line" aria-hidden="true"><line /></svg>
    <span class="em__dot" aria-hidden="true"></span>

    <aside class="em__pop" role="dialog" aria-label="SATENIER">
      <div class="pop__bar"></div>
      <div class="pop__body">
        <h4>SATENIER</h4>
        <ol class="pop__prods">                 <!-- ×3 -->
          <li>
            <small>01</small>
            <img alt="" />
            <p class="name">{name}</p>          <!-- FALTA EN BACKEND -->
            <p class="price">34 €</p>
          </li>
        </ol>
        <p class="pop__empty">Su catálogo llega pronto. Mientras, está en su web.</p>
        <a class="pop__cta" href="{brand.url}" target="_blank" rel="noopener">IR A LA TIENDA <span class="loop-line"></span></a>
      </div>
    </aside>
  </div>
</section>
```

**Textos fijos:**
- MARCAS · EMER / GENTES · Baja para recorrerlas ↓
- EMERGENTES (barra) · Y LAS QUE / VENDRÁN. · VER TODAS LAS MARCAS →
- IR A LA TIENDA · Su catálogo llega pronto. Mientras, está en su web.

**Barra superior:**
- Margen lateral `clamp(20px, 4vw, 56px)`, a 40px del borde superior, 9px con tracking .3em.
- Progreso: máximo 360px de ancho, 1px `#e4e4e4`, relleno negro.

**Track:**
- Flex con gap `clamp(28px, 4vw, 72px)` y padding lateral igual al margen.
- Intro:
  - Eyebrow: 300 9px `#666`.
  - Título: Anton `clamp(72px, 10vw, 160px) / .86`.
  - Pista: 300 italic 15px `#3f3f3f`.

**Paneles**, cíclicos en el orden `i % 3`:
| Tipo | Ancho | Alto | margin-top |
|---|---|---|---|
| a | `clamp(260px, 26vw, 400px)` | 64vh | -4vh |
| b | `clamp(320px, 36vw, 560px)` | 46vh | 10vh |
| c | `clamp(240px, 22vw, 340px)` | 56vh | -10vh |

- Imagen: el contenedor de parallax sobresale un 14 % por cada lado.
- Número: Anton `clamp(70px, 8vw, 130px) / .8` con trazo de 1.2px blanco, sin relleno, abajo a la izquierda a 14 / 8px.
- Pie: nombre Anton `clamp(26px, 2.4vw, 36px)`, fecha en 8px con tracking .22em `#8a8a8a`, fondo blanco.

**Outro:**
- Ancho `clamp(260px, 26vw, 380px)`.
- «Y LAS QUE VENDRÁN.»: Anton `clamp(48px, 5vw, 80px) / .9`.
- CTA: 10px, tracking .3em, subrayado de 1px.

**Popup:**
- Ancho `clamp(380px, 32vw, 480px)`.
- Barra superior de 1px negro.
- Cuerpo: fondo blanco, borde de 1px sin borde superior, padding de 18px, gap de 18px, sombra dura `8px 8px 0 #000`.
- Nombre: Anton `clamp(46px, 4vw, 62px) / .9`.
- Productos: grid de 3 columnas con gap de 10px.
  - Índice en 8px `#8a8a8a`.
  - Imagen 3/4 sobre `#ededed`.
  - Nombre en 300 12px; precio en 10.5px.
- CTA: 64px de alto, borde superior, 11px con tracking .32em + línea en bucle de 56px. En hover pasa a fondo negro con texto blanco (.35s).

**Punto:** 14px negro con anillo blanco de 2px (`box-shadow: 0 0 0 2px #fff`) y un aro exterior de 1px negro al 50 %, separado 11px.

**Decorados** (13 en `deco/`). Todos son `position: absolute` dentro de `.em__deco`:
| i | Archivo | left | top | Ancho | Rotación |
|---|---|---|---|---|---|
| 0 | estrellas | 3vw | 8vh | clamp(60px,6vw,96px) | 0° |
| 1 | coche | 11vw | 56vh | clamp(300px,30vw,480px) | -4° |
| 2 | ojos | 40vw | -4vh | clamp(200px,19vw,300px) | 4° |
| 3 | dolar | 64vw | 54vh | clamp(80px,8vw,130px) | 12° |
| 4 | golondrinas | 82vw | 4vh | clamp(110px,10vw,160px) | 8° |
| 5 | edificios | 98vw | 44vh | clamp(400px,40vw,640px) | 0° |
| 6 | mano | 138vw | 6vh | clamp(140px,13vw,210px) | -12° |
| 7 | nino-rojo | 158vw | 50vh | clamp(180px,17vw,280px) | -6° |
| 8 | bomba | 184vw | -6vh | clamp(220px,22vw,350px) | 10° |
| 9 | cara-agua | 212vw | 36vh | clamp(260px,26vw,420px) | 0° |
| 10 | caballo | 242vw | -2vh | clamp(200px,20vw,320px) | 0° |
| 11 | ojo | 266vw | 54vh | clamp(110px,11vw,170px) | 6° |
| 12 | nino | 288vw | 6vh | clamp(150px,14vw,230px) | 4° |

Los recortes que en el diseño iban con `clip-path` (ojos, cara-agua, caballo, ojo) **ya vienen aplicados en los WebP**.

## 2. Coreografía
Todo lo mueve un único subscriber del ticker con `{ el: section }`.

**Recorrido:**
- `over = track.scrollWidth - vw`. Alto de la sección = `vh + over`; se recalcula en resize.
- `p = clamp(-section.top / (section.height - vh), 0, 1)`, suavizado con `cp += (p - cp) * .12`.
- Alternativa: `ScrollTrigger` con `pin: true`, `scrub: true` y `end: '+=' + over`, ajustado al mismo suavizado con `scrub: 0.6`. Se recomienda ScrollTrigger porque se coordina con Lenis sin trabajo extra.

| Elemento | Propiedad | Valor | Disparador |
|---|---|---|---|
| Track | translate3d(-cp · over, 0, 0) | continuo | scroll |
| Progreso | scaleX(cp), origen izquierda | continuo | scroll |
| Contador | texto `pad2(i + 1) / pad2(n)`, donde i es el último panel con left < 50 % del viewport | sin animar | scroll |
| Revelado del panel | `e = clamp((vw - panel.left) / (vw · .45), 0, 1)`, `ee = 1 - (1 - e)³`; la imagen sube de abajo arriba según ee | continuo (scrub) | scroll |
| Parallax interior | translateX((centroPanel - vw/2) · -0.1) scale(1.15 - .15 · ee) | continuo | scroll |
| Capa de decorados | translate3d(-cp · over · .78, 0, 0) (más lenta que el track) | continuo | scroll |
| Cada decorado | rotate(r·(1 - k) + cp·(i impar ? 6 : -6)·(1 - k) + jitter) translateY(-10k) scale(1 + .08k) | continuo | scroll y hover |
| Copia (ghost) del decorado | opacity .4k, translate(12k, 9k) | | hover |

**Detalles de los decorados:**
- `k` es el progreso del hover: `k += (hover ? 1 : 0 - k) · .12`.
- Jitter: `sin(t/38 + i) · .7 · k` grados, solo si k > .02.
- El hover se detecta en el ticker comparando el puntero con los rects cacheados, porque la capa tiene `pointer-events: none` para no tapar los paneles.

**Revelado del panel (*reveal*):** en el diseño es un `clip-path` scrubbed. En producción se usa el patrón de doble translateY de 05-catalogo: el contenedor va a `translateY((1 - ee) · 100%)` y el hijo a `translateY(-(1 - ee) · 100%)`.

**Hover y tap de un panel:**
| Elemento | Propiedad | Duración | Easing |
|---|---|---|---|
| Velo | opacity 0 → .28 (capa negra) | .6s | standard |
| Número en trazo | opacity 1 → 0 | .4s | standard |

**Popup:**
- Progreso propio `po`: sube de 0 a 1 en 950ms al entrar y baja de 1 a 0 en 380ms al salir. Lo integra el ticker con dt.
- Si se cambia de panel con el popup abierto, `po` vuelve a 0 y la posición se reubica sin interpolar.

| Tramo de po | Elemento | Propiedad | Curva |
|---|---|---|---|
| 0 → .20 | Punto | scale 0 → 1, más un latido `1 + sin(t/420) · .06` | cubic out |
| .12 → .42 | Línea SVG | se dibuja desde el ancla hasta la esquina del popup (x2/y2 interpolados) | cubic out |
| .36 → .60 | Barra superior | scaleX 0 → 1, con origen en el lado del ancla | quart out |
| .45 → 1 | Cuerpo (persiana) | se despliega de arriba abajo; sombra 0 → 8px 8px | cubic out |

**Popup — geometría:**
- Ancla: dentro de la imagen del panel, al 68 % de x y al 30 % de y.
- Lado: a la derecha (ancla + 90px) si cabe; si no, a la izquierda (ancla − 90px − ancho).
- Encaje en pantalla:
  - x se limita a [16px, W − ancho − 16px].
  - y = ancla − alto · .22, limitado a [80px, H − alto − 28px].
  - Si no cabe en alto: `scale = min(1, (H - 96) / alto)`, con origen arriba a la izquierda.
- La posición se interpola con un lerp de .25 por frame, para seguir al panel mientras el track se mueve.
- `pointer-events` del popup: activos solo cuando el cuerpo pasa de .4.

**Popup — persiana y excepciones:**
- Persiana: el diseño usa `clip-path: inset(0 0 X% 0)`. Alternativa con transform: el cuerpo en `scaleY(e4)` con origen arriba y el contenido interior en `scaleY(1/e4)`. Con e4 cerca de 0 aparecen artefactos, así que se recomienda mantener `clip-path` como **EXCEPCIÓN**: un único elemento, 550ms y sin bucle.
- La línea SVG (atributos x2/y2) y la sombra son **EXCEPCIÓN** por el mismo motivo.

**Popup — tiempos de cierre:**
- Al salir del panel, el cierre espera 260ms (para dar tiempo a llegar al popup).
- Al salir del popup, el cierre espera 160ms.
- Entrar en el popup cancela el cierre.

## 3. Movimiento reducido
- Sin pin ni recorrido horizontal: el track pasa a ser una **fila con scroll horizontal nativo** (`overflow-x: auto`, `scroll-snap-type: x mandatory`). Paneles revelados, sin parallax.
- Decorados estáticos, sin rotación por scroll ni hover.
- Popup: aparece entero con opacity 200ms. Sin punto, línea ni persiana.

## 4. Assets
| Asset | Tamaño |
|---|---|
| `deco/*.webp` (13 de la tabla) | 474–1152px de ancho (ver README); el mayor se muestra a 640px |
| `brand.img` | panel de hasta 560px × 64vh más un 28 % de margen de parallax; pedir a 1200px |
| `previewProducts[].imageUrl` | se muestra a ~140×187; pedir a 300×400 |

## 5. Datos
```jsonc
// emergentes = brands.filter(b => b.isEmergent && b.img).slice(0, 8)
// orden: por createdAt desc → FALTA EN BACKEND; mientras tanto, el orden de la API
{
  "id": "0208bdca-…",            // string — datos
  "name": "Satenier",            // string — datos → upper()
  "url": "https://satenier.com", // string — datos → IR A LA TIENDA
  "img": "https://…",            // string — datos → panel
  "isEmergent": true,            // boolean — datos → filtro
  "createdAt": "2026-06-07",     // FALTA EN BACKEND → fecha dd.mm.aa (si falta, se oculta)
  "previewProducts": [           // máx. 3 — datos
    { "id": "p1", "imageUrl": "https://…", "price": 34, "currency": "EUR",
      "name": "STR Ascii Green Tee" }   // name → FALTA EN BACKEND (resolver por id contra Product)
  ]
}
```
- **Fijo:** los textos de la intro, el outro, la barra y el popup; la tabla de decorados.
- El número del panel se calcula como `pad2(i + 1)`.

## 6. Estados
| Estado | Comportamiento |
|---|---|
| Carga | Paneles en `#ededed`; la imagen hace fade-in de .4s dentro del revelado. Decorados con `loading="lazy"` y `decoding="async"`. |
| Marca sin previewProducts | El popup muestra «Su catálogo llega pronto. Mientras, está en su web.» en lugar del grid. |
| Vacío (0 emergentes) | La sección no se monta; 02-topbar quita el enlace y el contador. |
| Menos de 3 emergentes | Sin pin: track estático centrado (si `over <= 0`, el alto es 100vh y no hay recorrido). |
| Error de imagen | Se descarta ese panel. |
| Error de datos | La sección no se monta (no tiene sentido sin marcas). |
| Táctil | El tap abre el popup del panel y un segundo tap fuera lo cierra. Sin hover en los decorados. El scroll vertical sigue moviendo el recorrido. |

## Prompt para Claude Code
> Implementa `components/sections/Emergentes.tsx` según `handoff/04-emergentes.md`. El recorrido horizontal va con ScrollTrigger (`pin`, `scrub: 0.6`, `end: +=over`). El track, el progreso y la capa de decorados se mueven solo con translate3d y scaleX. El revelado de cada panel va scrubbed con el patrón de doble translateY, y el parallax interior con translateX + scale. Decorados: los 13 de la tabla, en una capa con z-index -1 y `pointer-events: none`; el hover se detecta en el ticker contra los rects cacheados (elevación de 10px, scale 1.08, copia desplazada 12/9px al 40 % y jitter). Popup: progreso `po` de 950ms al abrir y 380ms al cerrar, en los 4 tramos de la tabla. Geometría exacta: ancla al 68/30 %, separación de 90px, clamps, escala para encajar en alto y lerp de .25. La persiana del cuerpo con `clip-path` (excepción documentada), y retrasos de cierre de 260 y 160ms. Usa `isEmergent` como filtro, máximo 8. `createdAt` y el nombre del producto no existen en el backend: oculta la fecha y resuelve el nombre por id si hay productos cargados. Implementa también movimiento reducido (scroll horizontal nativo con snap) y los estados.
