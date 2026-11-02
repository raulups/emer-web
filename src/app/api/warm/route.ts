import { connection, NextResponse } from "next/server";
import { getBrands } from "@/lib/data";
import { EMPTY_FILTERS } from "@/lib/marketplace";
import { getMarketplacePage } from "@/lib/marketplace-data";

/** Lo que espera la Landing: si ya está todo y cuántas marcas hay. */
export type WarmResponse = { ok: boolean; total: number | null };

/**
 * Lo pide la Landing nada más abrir: lee las marcas y la primera página del Marketplace con las
 * mismas consultas que `/web` ("use cache"), así que al navegar ya están en caché. Responde cuando
 * acaba, también si el backend falla (`ok: false`): entonces `/web` lo vuelve a intentar.
 */
export async function GET() {
  // Siempre en tiempo de petición: nunca se prerenderiza en el build.
  await connection();
  const [brands, page] = await Promise.all([getBrands(), getMarketplacePage(EMPTY_FILTERS)]);
  const ok = brands.ok && page.ok;
  if (!ok)
    console.error("[api/warm]", brands.ok ? null : brands.error, page.ok ? null : page.error);
  const body: WarmResponse = { ok, total: brands.ok ? brands.data.length : null };
  return NextResponse.json(body, {
    status: ok ? 200 : 502,
    headers: { "cache-control": "no-store" },
  });
}
