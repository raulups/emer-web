# 08-footer — Handoff

Fondo negro, texto blanco. Estático: el diseño no tiene animaciones en el footer.

## 1. Estructura y textos
```html
<footer class="footer">
  <div class="footer__top">
    <img src="/brand/emer-logo-white.webp" alt="Emer" width="110" height="40" />
    <nav class="footer__cols" aria-label="Pie">
      <div>
        <p class="footer__head">EXPLORAR</p>
        <a href="#marcas">MARCAS</a>
        <a href="[PENDIENTE]">MARKETPLACE</a>
        <a href="[PENDIENTE]">TIENDAS</a>
      </div>
      <div>
        <p class="footer__head">EMER</p>
        <a href="[PENDIENTE]">PARA MARCAS</a>
        <a href="[PENDIENTE]">PRIVACIDAD</a>
        <a href="[PENDIENTE]">TÉRMINOS</a>
      </div>
    </nav>
    <div class="footer__apps">
      <p class="footer__head">TAMBIÉN EN EL MÓVIL</p>
      <div>
        <a href="[PENDIENTE]" target="_blank" rel="noopener">APP STORE ↗</a>
        <a href="[PENDIENTE]" target="_blank" rel="noopener">GOOGLE PLAY ↗</a>
      </div>
    </div>
  </div>
  <div class="footer__bottom">
    <span>MARCAS PEQUEÑAS, UN SOLO SITIO</span>
    <span>© 2026 EMER</span>
  </div>
</footer>
```

**Textos fijos:** todos los anteriores. El año se calcula con `new Date().getFullYear()`.

**Layout:**
- Padding `clamp(36px, 4vw, 56px) clamp(16px, 3vw, 40px) 24px`; gap vertical de 36px.
- Fila superior: flex con wrap y `space-between`, gaps de 28px / 40px. Logo de 40px de alto.
- Columnas: Fraunces 9px, tracking .24em, gap 48px entre columnas y 10px entre líneas. Las cabeceras en `#6f6f6f`.
- Botones de app: 34px de alto, padding de 12px, borde de 1px `#3a3a3a`, gap 8px.
- Fila inferior: `border-top` de 1px `#262626`, padding-top de 14px, 8px con tracking .22em, en `#6f6f6f`.

## 2. Coreografía
| Elemento | Propiedad | Duración | Easing | Disparador |
|---|---|---|---|---|
| Enlaces | color `#fff` → `#d6d6d6` | .3s | standard | hover (**propuesta**: el diseño no define hover; se usan los colores de enlace de fondo oscuro) |
| Botones de app | borde `#3a3a3a` → `#fff` | .3s | standard | hover (**propuesta**) |

Sin animaciones de entrada.

## 3. Movimiento reducido
Sin cambios (no hay movimiento).

## 4. Assets
| Asset | Tamaño |
|---|---|
| `brand/emer-logo-white.webp` | 333×121; se muestra a 110×40 |

## 5. Datos
**No consume backend.** Todo es contenido fijo.

**Destinos pendientes:**
- MARKETPLACE y TIENDAS (no hay página; `storeLocations` existe en `Brand`, pero no hay pantalla de tiendas en la web)
- PARA MARCAS, PRIVACIDAD y TÉRMINOS
- URLs de App Store y Google Play

## 6. Estados
- **Carga, vacío y error:** no aplica.
- **Enlace sin destino:** se renderiza como `<span>` sin estilo de enlace hasta que tenga URL. Así no hay enlaces muertos.

## Prompt para Claude Code
> Implementa `components/Footer.tsx` según `handoff/08-footer.md`. Es un Server Component estático con los textos exactos. Los destinos pendientes viven en `lib/config/links.ts`, con valores `null`; si un destino es `null`, se renderiza `<span>`. El año es dinámico. Hover con transición de color .3s.
