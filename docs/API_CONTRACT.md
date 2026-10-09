# Emer API: contrato para consumo web (solo lectura)

Documento para quien construya la web externa (Next.js). Se ha generado leyendo el código de `server/` y `shared/`, y comprobando las respuestas reales de producción el 2026-10-09. Lo que no existe se marca como **NO EXISTE**.

Fuentes de verdad en el repo:

| Qué | Dónde |
|---|---|
| Arranque, CORS, rate limit, errores 500 | `server/src/main/kotlin/com/emer/server/Application.kt` |
| Rutas | `server/.../routes/{Brand,Product,Category}Routes.kt` y `plugins/Routing.kt` |
| Validación y paginación | `server/.../service/*.kt` |
| Consultas y filtros | `server/.../repository/*.kt` |
| Modelos de respuesta | `shared/src/**/com/emer/shared/model/*.kt` |
| Vista SQL de previews | `server/src/main/resources/db/migration/V1__align_schema_with_exposed.sql` |

---

## 1. URL base y entorno

| Dato | Valor |
|---|---|
| URL base de producción | `https://emerapp.onrender.com` (es la que usa la app móvil, `composeApp/.../core/data/ApiConfig.kt`) |
| Host alternativo | `https://emer-api-c5et.onrender.com` también responde 200 con los mismos datos (probado). Aparece en el historial de curl de `.claude/settings.local.json`. No está documentado en el repo cuál es el canónico. **Usar `emerapp.onrender.com`**. |
| Plataforma | Render, servicio Docker, plan `free` (`render.yaml`), `healthCheckPath: /health` |
| Protocolo | HTTPS (TLS lo termina Render/Cloudflare). El servidor Ktor escucha HTTP en `0.0.0.0:$PORT`. |
| Versionado | **NO EXISTE** (sin prefijo `/v1`). |
| Documentación OpenAPI/Swagger | **NO EXISTE**. |

### Variables de entorno del servidor (sin secretos)

| Variable | Obligatoria | Uso |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena Postgres (`postgres://` o `postgresql://`, con `user:pass`). En `render.yaml` está como `sync: false` (se configura a mano en Render). Si falta, el servidor no arranca. |
| `PORT` | No | Puerto de escucha. Por defecto `8080`. Render lo inyecta. |

No hay más variables. **No hay variable de entorno para CORS**: los orígenes permitidos están escritos en el código (ver sección 4).

Para la web Next.js solo necesitas una variable propia, por ejemplo `NEXT_PUBLIC_API_URL=https://emerapp.onrender.com` (o sin `NEXT_PUBLIC_` si solo llamas desde servidor).

---

## 2. Autenticación

**No hay autenticación de ningún tipo.** Todos los endpoints son públicos. No hay JWT, API keys, sesiones ni roles. `Authorization` figura como cabecera permitida en CORS, pero ningún endpoint la lee.

Tampoco hay endpoints de escritura: el servidor solo expone `GET` (más `OPTIONS` para CORS). Los datos los escribe un proceso externo (scraping con n8n sobre tiendas Shopify, según la memoria del proyecto) directamente en Postgres/Supabase.

---

## 3. Endpoints

Todos devuelven `application/json`. Las claves van en **snake_case** (`JsonNamingStrategy.SnakeCase`). Los timestamps son ISO-8601 en UTC (p. ej. `2026-06-07T18:17:19.574549Z`). Los IDs son UUID en string.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | `{"status":"ok"}`. Sin rate limit. |
| GET | `/brands` | Lista paginada de marcas |
| GET | `/brands/{id}` | Detalle de marca |
| GET | `/brands/{id}/products` | Productos de una marca (paginado y filtrable) |
| GET | `/products` | Lista paginada de productos (paginado y filtrable) |
| GET | `/products/{id}` | Detalle de producto (con tallas e historial de precios) |
| GET | `/categories` | Árbol de categorías (raíces e hijas directas) |

### 3.1 Envoltorio de respuesta

```jsonc
{
  "data": <objeto o array>,   // ausente si hay error
  "error": "texto",           // ausente si todo fue bien
  "meta": { "total": 31, "limit": 20, "offset": 0 } // solo en listas paginadas
}
```

**Regla crítica de serialización:** el servidor usa `encodeDefaults = false`. Los campos cuyo valor coincide con su valor por defecto en Kotlin **no se envían**. Hay que tratarlos como opcionales en TypeScript. Detalle campo a campo abajo. Los campos nullable *sin* valor por defecto sí se envían como `null`.

### 3.2 Paginación

Solo paginación por `limit` / `offset` (no hay cursor ni `page`).

| Param | Tipo | Defecto | Comportamiento |
|---|---|---|---|
| `limit` | int | `20` | Se recorta a `1..100`. Si no es un entero válido se usa `20` (sin error). |
| `offset` | int | `0` | Mínimo `0`. Si no es válido se usa `0`. |

`meta.total` es el total de filas que cumplen el filtro (COUNT real). No existe `has_more`; se calcula con `offset + data.length < total`. `meta.limit` y `meta.offset` devuelven los valores ya normalizados.

### 3.3 `GET /brands`

| Query param | Tipo | Notas |
|---|---|---|
| `limit`, `offset` | int | Ver 3.2 |
| `isEmergent` | `true`/`false` | Filtra por marca emergente. Otro valor se ignora en silencio. |
| `city` | string | Coincidencia parcial, sin distinguir mayúsculas, sobre `store_locations.city` (`LIKE %city%`). Solo devuelve marcas con tienda física en esa ciudad. |

Los nombres de parámetros van en **camelCase** (`isEmergent`). Un parámetro desconocido (`q`, `search`, `brand_id`...) se ignora sin error (probado: no cambia `meta.total`).

**Orden:** fijo, `created_at` descendente. **No hay parámetro de orden** en marcas.

Ejemplo real (recortado; `category_counts` y `preview_products` abreviados):

```json
{
  "data": [
    {
      "id": "0208bdca-c705-491b-82fa-76123232670b",
      "name": "Satenier",
      "url": "https://satenier.com",
      "img": "https://aidisezaeymiesrdfnza.supabase.co/storage/v1/object/public/brands/satenier_image.png",
      "logo": "https://aidisezaeymiesrdfnza.supabase.co/storage/v1/object/public/brands/satenier_logo.webp",
      "color": "#e1609f",
      "is_emergent": true,
      "created_at": "2026-06-07T18:17:19.574549Z",
      "store_locations": [],
      "preview_products": [
        {
          "id": "217a971a-4ad1-4166-af52-8c8b58dc85cf",
          "main_image_url": "https://cdn.shopify.com/s/files/1/0837/3305/3774/files/2026_ASCII-GREEN-TEE-FRONT.webp?v=1784773406",
          "current_price": 34.0,
          "currency": "EUR"
        }
      ],
      "total_product_count": 84,
      "on_sale_count": 49,
      "category_counts": {
        "1fc55544-2dcb-4f06-97db-ff4665e25f12": 3,
        "bed8d405-f373-4e35-b347-161812407bb5": 42
      }
    }
  ],
  "meta": { "total": 31, "limit": 2, "offset": 0 }
}
```

**Tipo `Brand`:**

| Campo | Tipo | ¿Siempre presente? | Notas |
|---|---|---|---|
| `id` | string (UUID) | Sí | |
| `name` | string | Sí | |
| `url` | string \| null | Sí (puede ser `null`) | Web oficial de la marca |
| `img` | string \| null | Sí (puede ser `null`) | Imagen de portada. Supabase Storage |
| `logo` | string \| null | Sí (puede ser `null`) | Logo. Supabase Storage |
| `color` | string \| null | Sí (puede ser `null`) | Hex tipo `#e1609f` |
| `is_emergent` | boolean | Sí | |
| `created_at` | string (ISO) | Sí | |
| `store_locations` | `StoreLocation[]` | Sí | Vacío si no hay tienda física |
| `preview_products` | `ProductPreview[]` | **Opcional** (se omite si vacío) | Hasta 3 productos: primero los de oferta, luego los más recientes (vista SQL) |
| `total_product_count` | integer | Sí en la práctica | Cuenta TODOS los productos de la marca, incluidos no disponibles |
| `founded_year` | integer | **Opcional** (se omite si es null) | |
| `style` | string | **Opcional** (se omite si es null) | |
| `on_sale_count` | integer | **Opcional** (se omite si es 0) | |
| `category_counts` | `{ [categoryId: string]: number }` | **Opcional** (se omite si está vacío) | Productos por categoría hija; solo categorías con al menos 1 producto |

En `/brands` los campos `founded_year` y `style` no aparecían en ninguna de las marcas probadas (todas `null` en la base de datos); el código los emite cuando tienen valor.

`StoreLocation` (ejemplo real de Scuffers, filtrando `?city=madrid`):

```json
{
  "id": "97aeedb4-678e-4d76-a63c-c770eb94684b",
  "brand_id": "30995220-a71b-416a-8123-63e9b0037919",
  "address": "Calle de la Luna, 1",
  "city": "Madrid",
  "latitude": 40.4225,
  "longitude": -3.7042,
  "place_id": "ChIJ_8_8_8_8_8_8_8_8_8_8_8"
}
```

`place_id: string | null`. Atención: el `place_id` de este ejemplo parece un dato de prueba, no un ID real de Google Places.

`ProductPreview`: `{ id: string, main_image_url: string | null, current_price: number | null, currency: string }`. Aquí `main_image_url` y `current_price` se envían como `null` si faltan.

### 3.4 `GET /brands/{id}`

Devuelve `{ "data": Brand }` con la misma forma que un elemento de la lista.

Errores: `400` `{"error":"Invalid UUID format"}` si el id no es UUID; `404` `{"error":"Brand not found"}`.

**No hay slug**: el detalle solo se resuelve por UUID. Las URLs públicas de la web tendrían que usar el UUID.

### 3.5 `GET /products` y `GET /brands/{id}/products`

Mismos filtros en ambos. La única diferencia es el valor por defecto de `available` y que `/brands/{id}/products` fija la marca desde la ruta.

| Query param | Tipo | Defecto | Notas |
|---|---|---|---|
| `limit`, `offset` | int | 20 / 0 | Ver 3.2 |
| `brandIds` | UUIDs separados por coma, o repetido (`brandIds=a&brandIds=b`) | sin filtro | Solo `/products`. También acepta `brandId` (singular). Un UUID inválido devuelve 400. |
| `categoryId` | UUID | sin filtro | Si es una categoría raíz (p. ej. ROPA), incluye también productos de sus hijas directas. |
| `isOnSale` | `true`/`false` | sin filtro | |
| `available` | `true`/`false` | **`/products`: `true`**. **`/brands/{id}/products`: sin filtro** | Para ver también agotados en `/products` hay que enviar `available=false`; no hay forma de pedir "todos" en `/products` (ver sección 7). |
| `minPrice`, `maxPrice` | número | sin filtro | Comparan con `current_price`. Los productos con precio `null` quedan fuera si se usa alguno. |
| `sort` | `newest` \| `oldest` \| `price_asc` \| `price_desc` | `newest` | Un valor desconocido cae a `newest` en silencio. Orden por `created_at`. Con precio, los `null` van al final en `price_asc` y al principio en `price_desc`. |

Los parámetros en snake_case (`brand_id`, `category_id`) **se ignoran sin error**: en producción `?brand_id=...` devolvió el total completo (11322). Hay que usar camelCase.

Datos en producción (2026-10-09): `/products` total 11322 con el filtro por defecto; 3488 con `isOnSale=true`. Estos números cambian con el scraping.

**Tipo `Product` (elementos de la lista)**, ejemplo real:

```json
{
  "id": "bcf00f21-f9ac-4177-9d15-6cc2d37a36db",
  "brand_id": "d6bc5606-a410-41ec-87a3-d9a5630fbfc3",
  "category_id": "38de51a7-7356-436e-8e0f-4952b5742bf8",
  "external_id": "16074382082428",
  "handle": "f261300-bk",
  "name": "T-shirt manhces courtes Edgy",
  "description": "Coupe courte Col rond Manches courtes ...",
  "product_url": "https://www.projectxparis.com/products/f261300-bk",
  "currency": "EUR",
  "current_price": 29.99,
  "original_price": null,
  "is_on_sale": false,
  "available": true,
  "main_image_url": "https://cdn.shopify.com/s/files/1/0909/6970/2780/files/F261300_BK_00.jpg?v=1788536232",
  "thumbnail_image_url": "https://cdn.shopify.com/s/files/1/0909/6970/2780/files/F261300_BK_00.jpg?v=1788536232",
  "image_urls": [
    "https://cdn.shopify.com/s/files/1/0909/6970/2780/files/F261300_BK_00.jpg?v=1788536232",
    "https://cdn.shopify.com/s/files/1/0909/6970/2780/files/F261300_BK_01.jpg?v=1788536232"
  ],
  "color_name": null,
  "attributes": { "tags": ["EDGY", "F261300"], "product_type": "Tee shirts Femme", "vendor": "Project X Paris - Shop" },
  "created_at": "2026-09-05T17:06:16.226010Z",
  "updated_at": "2026-09-05T17:06:16.226010Z"
}
```

| Campo | Tipo | ¿Presente? | Notas |
|---|---|---|---|
| `id` | string (UUID) | Sí | |
| `brand_id` | string \| null | Sí | |
| `category_id` | string \| null | Sí | Categoría hija (hoja) |
| `external_id` | string | Opcional | ID en la tienda Shopify de origen |
| `handle` | string | Opcional | Slug del producto en la tienda de origen, **no** un slug propio de Emer |
| `name` | string | Sí | |
| `description` | string \| null | Sí | Texto plano en el idioma de la tienda (puede ser francés, etc.) |
| `product_url` | string | Sí | URL del producto en la tienda de la marca (destino de compra) |
| `currency` | string (3 letras) | Sí | `EUR` en los ejemplos |
| `current_price` | number \| null | Sí | Decimal, p. ej. `29.99` |
| `original_price` | number \| null | Sí | Precio antes de oferta |
| `is_on_sale` | boolean | Sí | |
| `available` | boolean | Sí | |
| `main_image_url` | string \| null | Sí | |
| `thumbnail_image_url` | string \| null | Sí | |
| `image_urls` | string[] | Sí | `[]` si no hay |
| `color_name` | string \| null | Sí | |
| `attributes` | `{ tags: string[], product_type?: string, vendor?: string }` | Opcional (se omite si es null o no se puede parsear) | `tags` puede omitirse si está vacío |
| `sizes` | `ProductSize[]` | **Siempre omitido en listas** | En la lista el servidor siempre pone `[]`, que no se serializa. Las tallas solo vienen en el detalle. |
| `created_at`, `updated_at` | string (ISO) | Opcional según el tipo, presentes en la práctica | |
| `published_at` | string | **Nunca se envía** | Existe en el modelo pero el repositorio no lo rellena. No lo uses. |

### 3.6 `GET /products/{id}`

Devuelve `{ "data": ProductDetail }`. Es un `Product` más:

| Campo | Tipo | Notas |
|---|---|---|
| `sizes` | `ProductSize[]` | Siempre presente en el detalle (puede ser `[]`) |
| `price_history` | `PriceHistory[]` | Siempre presente. Orden `scraped_at` descendente (el más reciente primero) |

```json
"sizes": [
  { "size_label": "XS", "sku": "F261300_BK_XS", "stock_status": "in_stock" },
  { "size_label": "S",  "sku": "F261300_BK_S",  "stock_status": "in_stock" }
],
"price_history": [
  { "price": 29.99, "currency": "EUR", "scraped_at": "2026-09-05T17:06:16.226010Z" }
]
```

`ProductSize`:

| Campo | Tipo | ¿Presente? |
|---|---|---|
| `size_label` | string | Sí |
| `sku` | string | Opcional (se omite si es null) |
| `barcode` | string | **Nunca se envía** (el repositorio lo fija a null) |
| `available` | boolean | **Se omite cuando es `true`**; solo se ve cuando es `false`. Tratar ausente como `true`. Es `true` si `stock_status == "in_stock"`. |
| `stock_status` | string | Opcional (los valores aparte de `in_stock` no están enumerados en el código) |
| `stock_quantity` | integer | Opcional (se omite si es null) |

Errores: `400` `{"error":"Invalid UUID format"}`, `404` `{"error":"Product not found"}`.

### 3.7 `GET /brands/{id}/products`: peculiaridades

* Un UUID de marca que no existe devuelve **200 con `data: []` y `total: 0`**, no 404 (no hay comprobación de existencia).
* Si `categoryId` no es UUID: `400` `{"error":"Invalid category UUID format"}`. Si el id de marca no es UUID: `400` `{"error":"Invalid brand UUID format"}`.
* `/brands/{id}/categories` y `/products/categories` aparecen en el historial de curl del repo pero **no existen** en el código. Probado: `/brands/{id}/categories` da 404 con cuerpo vacío, y `/products/categories` se interpreta como `/products/{id}` y da 400 `Invalid UUID format`.

### 3.8 `GET /categories`

Sin parámetros ni paginación. Devuelve una lista plana (sin `meta`) con las raíces **ROPA, CALZADO, ACCESORIOS** (en ese orden) y, tras cada raíz, sus hijas directas ordenadas por nombre. Otras categorías de la base de datos no se devuelven. Las raíces se distinguen por `parent_id == null`.

```json
{
  "data": [
    { "id": "213b160c-c0a0-4dae-8339-a07096381f79", "name": "ROPA", "parent_id": null, "created_at": "2025-12-08T18:20:57.767265Z" },
    { "id": "bcd1de81-5ac7-4abb-a3e6-42e8bfb22864", "name": "Abrigos y chaquetas", "parent_id": "213b160c-c0a0-4dae-8339-a07096381f79", "created_at": "2025-12-08T18:20:57.767265Z" }
  ]
}
```

`Category`: `{ id: string, name: string, parent_id: string | null, created_at: string }`. Los nombres están en español, sin traducción ni slug. No hay `/categories/{id}`.

---

## 4. CORS

Configuración actual (`Application.kt`, bloque `install(CORS)`):

| Aspecto | Valor |
|---|---|
| Orígenes permitidos | **Solo `localhost:3000`** (esquemas `http` y `https`) |
| Métodos | `GET`, `OPTIONS` (más los simples por defecto de Ktor) |
| Cabeceras permitidas | `Content-Type`, `Authorization` |
| Credenciales | No habilitadas |

Comprobado en producción:

* `Origin: http://localhost:3000` devuelve `access-control-allow-origin: http://localhost:3000` y el preflight responde 200 con `access-control-max-age: 86400`.
* `Origin: https://foo.vercel.app` devuelve **403** (no solo falta la cabecera: el servidor rechaza la petición).

Por tanto **`http://localhost:3000` ya funciona** y no hay que cambiar nada para desarrollo local. El dominio de la web **no está permitido**: hay un `TODO` en el código esperando la URL final de Vercel.

Cambio necesario (en `Application.kt`, bloque CORS), siguiendo el `TODO` del propio código:

```kotlin
allowHost("localhost:3000", schemes = listOf("http", "https"))
allowHost("<tu-dominio-final>", schemes = listOf("https"))                 // dominio de producción
allowHostWithAnySubdomain("vercel.app", schemes = listOf("https"))         // previews *.vercel.app (opcional, amplio)
```

Notas:

* `allowHostWithAnySubdomain("vercel.app")` permite cualquier proyecto de Vercel, no solo el tuyo. Si no quieres eso, enumera hosts concretos.
* Hay que redesplegar en Render tras el cambio (no hay config externa).
* CORS solo afecta a llamadas desde el navegador. Si el Next.js llama a la API desde el servidor (Server Components, Route Handlers, `getStaticProps`), CORS no interviene.
* Las apps móviles no se ven afectadas.

---

## 5. Imágenes

El servidor **no sirve imágenes ni las transforma**. Solo devuelve URLs absolutas guardadas en la base de datos; no hay proxy, redimensionado, parámetros de tamaño ni caché propios.

| Origen | Host | Campos | Notas |
|---|---|---|---|
| Marcas | Supabase Storage: `https://aidisezaeymiesrdfnza.supabase.co/storage/v1/object/public/brands/<archivo>` | `Brand.img`, `Brand.logo` | Formatos vistos: `.png`, `.webp`. Respuesta con `access-control-allow-origin: *` y `cache-control: no-cache`. Tamaño sin documentar. |
| Productos | CDN de Shopify: `https://cdn.shopify.com/s/files/1/<id-tienda>/files/<archivo>?v=<versión>` | `main_image_url`, `thumbnail_image_url`, `image_urls[]`, `ProductPreview.main_image_url` | En una muestra de 100 productos, el 100 % usaba `cdn.shopify.com` y todos tenían `main_image_url`. |

Consideraciones para Next.js:

* Hay que registrar ambos hosts en `images.remotePatterns` de `next.config` (`cdn.shopify.com` y `aidisezaeymiesrdfnza.supabase.co`) si usas `next/image`.
* `thumbnail_image_url` es, en el ejemplo mostrado, **idéntica** a `main_image_url`: no es una miniatura redimensionada. No cuentes con tamaños distintos.
* Tamaños: la API no los indica. (El CDN de Shopify admite parámetros de ancho en la URL, pero eso es una característica de Shopify, no de esta API, y no está usada ni verificada en el repo.)
* Las imágenes de producto dependen de las tiendas externas: si la marca borra la imagen, la URL se rompe.

---

## 6. Errores

**Formato:** `{"error": "<mensaje>"}` con `Content-Type: application/json`. Los mensajes están en inglés y son fijos.

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| 200 | OK | `{"data": ..., "meta"?: ...}` |
| 400 | UUID inválido en la ruta o en `brandIds` / `categoryId` | `{"error":"Invalid UUID format"}`, `{"error":"Invalid brand UUID format"}`, `{"error":"Invalid category UUID format"}` |
| 404 | Marca o producto inexistente | `{"error":"Brand not found"}`, `{"error":"Product not found"}` |
| 404 | Ruta que no existe | **Cuerpo vacío** (no JSON). Probado con `/nope`. |
| 403 | Origen no permitido por CORS | Cuerpo vacío |
| 429 | Rate limit superado | Respuesta por defecto de Ktor RateLimit (no personalizada en el código). Trátalo sin asumir cuerpo JSON. |
| 500 | Excepción no controlada | `{"error":"Internal server error"}` (el detalle queda en los logs) |
| 502/503/504 | Servicio dormido o arrancando en Render | Lo genera Render, no la app; no es JSON de la API |

Los parámetros numéricos o booleanos mal formados **no** devuelven 400: se sustituyen por su valor por defecto o se ignoran. Solo los UUID mal formados dan 400. En el cliente, comprueba `res.ok` antes de leer `data`.

Si el esquema de la base de datos no coincide con el código, el servidor falla al arrancar (`SchemaVerifier`) y no llega a responder.

### Rate limit

* 60 peticiones por 60 s en todas las rutas salvo `/health`.
* Cabeceras de ayuda en cada respuesta: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset` (epoch en segundos, comprobado).
* **Riesgo (inferencia, no probada):** el código no instala el plugin de cabeceras `X-Forwarded-For`, así que Ktor probablemente identifica a todos los clientes por la IP del proxy de Render y el límite sería **compartido por todos los usuarios**. Un Next.js con SSR/ISR que haga muchas llamadas, junto con el tráfico de la app móvil, podría agotarlo. Verifícalo antes de depender de él (ver sección 8).

---

## 7. Cold start en Render

Servicio en plan `free` (`render.yaml`): Render lo duerme tras un periodo de inactividad y la siguiente petición lo despierta. El `Dockerfile` arranca una JVM, ejecuta Flyway (`SchemaMigrator`) y comprueba el esquema (`SchemaVerifier`) antes de aceptar tráfico.

Mediciones del 2026-10-09 (desde España, una sola muestra por caso):

| Caso | Tiempo |
|---|---|
| Primera petición `/health` con el servicio dormido | **≈ 34,8 s** (200 OK). El otro host dio ≈ 34,5 s |
| `GET /brands?limit=2` justo después (consulta fría de BD) | ≈ 1,6 s |
| `GET /products?limit=2` | ≈ 1,9 s |
| `GET /categories` | ≈ 0,5 s |
| `GET /brands/{id}`, `GET /products/{id}` | ≈ 0,3 s |
| Errores 400/404 | ≈ 0,1 s |

Los tiempos en caliente salen de una muestra pequeña y no son una garantía. El umbral exacto de inactividad que provoca el sueño no está en el repo; Render documenta ~15 min para el plan gratuito, pero no lo he verificado aquí.

Recomendaciones:

* En el cliente: timeout de al menos 45-60 s en la primera llamada y un estado de carga explícito.
* En Next.js: preferible generar páginas con ISR/SSG para que el usuario final no pague el arranque, y reintentar el build si la API está dormida.
* Un ping periódico a `/health` evita el sueño (no hay ninguno configurado en el repo). Mejor aún: subir el plan de Render.

---

## 8. Lo que falta para una web de descubrimiento de marcas

Resumen de lo existente frente a lo necesario:

| Necesidad | Estado | Detalle |
|---|---|---|
| Listado de marcas | **Existe** | `GET /brands` con `limit`, `offset`, `isEmergent`, `city`. Orden fijo por fecha de alta. |
| Detalle de marca | **Existe, con límites** | `GET /brands/{id}`. Solo por UUID, sin slug. |
| Productos de una marca | **Existe** | `GET /brands/{id}/products` |
| Búsqueda (marcas o productos) | **NO EXISTE** | Ningún parámetro `q`/`search`; se ignoran sin error (probado). |
| Categorías | **Existe, básico** | `GET /categories` (raíces ROPA/CALZADO/ACCESORIOS más hijas). Sin slug ni detalle. Los conteos por marca están en `Brand.category_counts`; los globales no existen. |
| Destacados / home | **NO EXISTE** | No hay campo `featured`, ni endpoint, ni orden por popularidad. Lo más parecido: `isEmergent=true` y `sort=...` en productos. |
| Orden de marcas | **NO EXISTE** | Fijo `created_at DESC`. |
| Filtrar marcas por categoría | **NO EXISTE** | Solo se puede inferir de `category_counts`, filtrando en cliente. |
| Slugs | **NO EXISTE** | Ni marcas ni categorías. `handle` de producto es el de la tienda de origen. |
| Caché HTTP (`Cache-Control`, `ETag`) | **NO EXISTE** | La API no envía cabeceras de caché (probado: solo `content-type`, `vary`, `x-ratelimit-*`). |
| Listar ciudades disponibles | **NO EXISTE** | `city` es un texto libre; no hay endpoint que liste las ciudades. |
| Productos "todos" sin filtro de disponibilidad en `/products` | **NO EXISTE** | `available` tiene defecto `true`; solo se puede pedir `true` o `false`. |

### Propuesta de cómo añadirlo

Todo encaja en el patrón existente `routes → service → repository` y en los modelos de `:shared`. Cada punto es un cambio acotado. Esto es una propuesta de diseño, no está implementado.

1. **Búsqueda**: añadir `q` a `GET /brands` y a `GET /products` (y a `/brands/{id}/products`).
   * Marcas: `name ILIKE %q%`. Productos: sobre `name` y, opcionalmente, `attributes.vendor`.
   * Para una búsqueda de calidad con 11k+ productos, añadir un índice `pg_trgm` (migración Flyway nueva `V2__...sql`) en lugar de `LIKE` sin índice.
   * Escapar `%` y `_` en la entrada: el filtro actual `city` los mete sin escapar en el `LIKE`.
2. **Orden de marcas**: `sort` en `GET /brands` con valores como `newest` (actual), `name`, `most_products`, `most_on_sale`. Las dos últimas ya están disponibles en la vista `brands_with_preview_products`.
3. **Filtro por categoría en marcas**: `categoryId` en `GET /brands`, que filtre marcas con `category_counts[categoryId] > 0` (usando la misma lógica de raíz/hijas que `ProductRepository.buildQuery`).
4. **Destacados**: dos opciones.
   * Mínima, sin migración: `GET /brands?isEmergent=true&sort=most_products&limit=N` y `GET /products?isOnSale=true&sort=newest`.
   * Editorial: añadir columna `is_featured boolean` (y, si se quiere control de orden, `featured_rank int`) a `brands`, y exponer `?isFeatured=true`. Requiere migración y que alguien la mantenga.
5. **Slugs**: añadir columna `slug text unique` a `brands` (y `categories`) con migración de backfill, exponer `slug` en `BrandResponse`/`CategoryResponse`, y permitir `GET /brands/{idOrSlug}`. Es lo que permite URLs de web como `/marcas/scuffers`.
6. **Categorías**: añadir `GET /categories/{id}` si la web necesita páginas de categoría y, opcionalmente, un conteo global de productos por categoría.
7. **Ciudades**: `GET /brands/cities` que devuelva ciudades distintas con número de marcas, para poblar un filtro. Ojo: la ruta `brands/{id}` ya existe; habría que registrar `/brands/cities` **antes** para que no se interprete como `{id}`.
8. **Caché**: añadir `Cache-Control: public, max-age=60, stale-while-revalidate=300` (o similar) en los GET, y plugin `ConditionalHeaders` para `ETag`. Reduce la presión del rate limit y del cold start para una web mayormente estática.
9. **Rate limit tras proxy**: instalar `XForwardedHeaders` (o `ForwardedHeaders`) para que el límite se aplique por cliente real y no por la IP del proxy. Verificar primero con dos IPs distintas si el límite es compartido.
10. **Errores uniformes**: devolver JSON `{"error": ...}` también en 404 de rutas desconocidas y en 429 (`StatusPages` con `status(HttpStatusCode.NotFound)` y configuración del rate limit).
11. **Contrato tipado**: publicar un OpenAPI mínimo o generar tipos TypeScript a partir de los modelos de `:shared`, para evitar mantener a mano los campos opcionales descritos en 3.1.

Prioridad sugerida para una primera versión de la web: (1) CORS con el dominio final, (8) caché, (1) búsqueda, (5) slugs, (2) orden de marcas.

---

## 9. Ejemplo de consumo (Next.js, servidor)

```ts
const API = process.env.API_URL ?? "https://emerapp.onrender.com";

type Envelope<T> = { data?: T; error?: string; meta?: { total: number; limit: number; offset: number } };

export async function api<T>(path: string): Promise<Envelope<T>> {
  const res = await fetch(`${API}${path}`, {
    next: { revalidate: 300 },                 // la API no envía Cache-Control
    signal: AbortSignal.timeout(60_000),       // cold start de ~35 s
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));   // 404 de ruta y 429 pueden venir sin JSON
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// await api<Brand[]>("/brands?limit=20&offset=0&isEmergent=true")
// await api<Product[]>("/products?brandIds=<uuid>&sort=price_asc&available=true")
```

## 10. Cosas que no he podido confirmar

* Cuál de los dos hosts de Render es el canónico (ambos responden).
* El umbral de inactividad exacto del plan free y si hay algún ping externo que mantenga despierto el servicio.
* Si el rate limit es realmente compartido por todos los clientes (ver sección 6).
* Valores posibles de `stock_status` además de `in_stock`, y tamaños reales de las imágenes de marca.
* Cómo y cuándo se ejecuta el scraping (n8n está en la memoria del proyecto, no en este repo).
