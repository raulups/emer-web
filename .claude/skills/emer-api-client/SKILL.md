---
name: emer-api-client
description: Cómo consumir el backend KMP de Emer (Render) desde la web con caché de Next.js. Úsala al añadir endpoints, tipos o datos remotos.
---

# Cliente API de Emer

La web **no** accede a la BDD. Todo pasa por el backend KMP.

## Ubicación

- `src/lib/api/client.ts`: `apiFetch` (base URL, timeout, errores tipados).
- `src/lib/api/<recurso>.ts`: una función por endpoint de lectura, con `"use cache"`.
- Tipos en `src/lib/api/types.ts`, validados en el borde (no confiar en el JSON).

## Patrón de lectura

```ts
import { cacheLife, cacheTag } from "next/cache";
import { apiFetch } from "./client";
import type { Brand } from "./types";

export async function getBrands(): Promise<Brand[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("brands");
  return apiFetch<Brand[]>("/brands");
}
```

## Reglas

- Solo servidor. Nada de secretos en el cliente; `EMER_API_URL` sin prefijo `NEXT_PUBLIC_`.
- Render en plan gratuito tiene cold starts: timeout generoso (≥ 15 s) con reintento, y caché larga para que los visitantes rara vez lo sufran.
- Invalidación bajo demanda: `revalidateTag("brands")` desde un Route Handler protegido, que el backend puede llamar tras escrituras.
- Antes de usar APIs de caché o `params`, leer la guía de la versión en `node_modules/next/dist/docs/`.
- Si el backend no expone el endpoint público necesario (o CORS), documentarlo y pedirlo en el proyecto KMP; no saltarse el backend.
