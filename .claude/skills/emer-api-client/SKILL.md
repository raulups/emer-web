---
name: emer-api-client
description: Cómo consumir el backend KMP de Emer (Render) desde la web con caché de Next.js. Úsala al añadir endpoints, tipos o datos remotos.
---

# Cliente API de Emer

Fuente de verdad del backend: `docs/API_CONTRACT.md`. La web **no** accede a la BDD; todo pasa por la API.

## Estructura (`src/lib/api/`)

- `client.ts`: `apiGet` (timeout 60 s por el cold start, reintentos en red/429/5xx), `toQuery`, `ApiError`.
- `types.ts`: tipos `Raw*` (JSON snake_case) y de dominio (camelCase), y los tipos de filtros.
- `normalize.ts`: convierte Raw → dominio y rellena los campos que el servidor omite (`encodeDefaults = false`).
- `brands.ts`, `products.ts`, `categories.ts`: una función por endpoint, con `"use cache"` + `cacheTag` y `settle(work, "hours")`.
- **Las funciones cacheadas NO lanzan: devuelven `ApiResult<T>`** (`{ ok: true, data }` o `{ ok: false, error }`). En Next 16 un error dentro de `"use cache"` rompe el prerender aunque el llamador lo capture. `settle` cachea los éxitos con el perfil indicado y los fallos solo segundos (`cacheLife("seconds")`), lo que los saca del prerender: el error nunca queda horneado en el HTML.
- En el componente: `const r = await getBrands(); if (!r.ok) { await connection(); return <Error/> }`, siempre dentro de un `<Suspense>` con un fallback de la misma geometría.
- Durante `next build` se hace un solo intento de 40 s (un "use cache" que tarde más de 50 s rompe el build).
- `fixtures.ts`: datos de ejemplo con la forma exacta de la API, activados con `EMER_API_FIXTURES=1` (los tests e2e los usan siempre). Nunca en producción.
- `index.ts`: único punto de import: `import { getBrands } from "@/lib/api"`.

Los componentes **solo** ven tipos de dominio, nunca `Raw*`.

## Datos del backend que hay que recordar

- Base: `EMER_API_URL` (por defecto `https://emerapp.onrender.com`). Solo servidor.
- Sin auth, solo `GET`. Sin slugs: las URLs usan UUID.
- Parámetros de query en **camelCase** (`isEmergent`, `brandIds`, `categoryId`). En snake_case se ignoran sin error.
- Paginación `limit` (1..100, defecto 20) / `offset`. No hay `has_more`: lo calcula `normalize.paginated`.
- `/products` filtra `available=true` por defecto; `/brands/{id}/products` no filtra.
- **No existe**: búsqueda (`q`), orden de marcas, filtro de marcas por categoría, destacados, slugs, `Cache-Control`. Si la web lo necesita, filtrar en cliente/servidor sobre datos ya cargados o pedir el cambio en el backend (propuesta en la sección 8 del contrato).
- Rate limit: 60 peticiones/60 s, posiblemente compartido por todos los clientes. Evitar bucles de llamadas; `getAllBrands` pagina de 100 en 100.
- Cold start de ~35 s en la primera petición: preferir datos cacheados/ISR y un estado de carga explícito.
- CORS: solo `localhost:3000`. Las llamadas desde servidor no lo necesitan; no llamar a la API desde el navegador hasta ampliar CORS en el backend.
- Imágenes: hosts `cdn.shopify.com` y `aidisezaeymiesrdfnza.supabase.co` (ya en `images.remotePatterns`). `thumbnail_image_url` es igual a la principal.

## Reglas

- Añadir un endpoint = tipo Raw + tipo de dominio + normalizador + función cacheada con tag + export en `index.ts`.
- Un id inexistente o inválido devuelve `{ ok: true, data: null }`; otros errores, `{ ok: false }`.
- Invalidación bajo demanda con `revalidateTag("brands" | "products" | "categories")` desde un Route Handler protegido.
- Antes de usar APIs de caché o `params`, leer la guía de la versión en `node_modules/next/dist/docs/`.
