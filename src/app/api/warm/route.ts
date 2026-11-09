import { connection, NextResponse } from "next/server";
import { getBrands } from "@/lib/data";
import { EMPTY_FILTERS } from "@/lib/marketplace";
import { getMarketplacePage } from "@/lib/marketplace-data";

/** Lo que espera la Landing: si ya está todo y cuántas marcas hay. */
export type WarmResponse = { ok: boolean; total: number | null };

/** Un intento a la vez: quienes esperan al backend comparten el rate limit de 60/min. */
let running: Promise<WarmResponse> | null = null;

async function warm(): Promise<WarmResponse> {
  const [brands, page] = await Promise.all([getBrands(), getMarketplacePage(EMPTY_FILTERS)]);
  const ok = brands.ok && page.ok;
  if (!ok)
    console.error("[api/warm]", brands.ok ? null : brands.error, page.ok ? null : page.error);
  return { ok, total: brands.ok ? brands.data.length : null };
}

/**
 * Lo pide la Landing nada más abrir: lee las marcas y la primera página del Marketplace con las
 * mismas consultas que `/web` ("use cache"), así que al navegar ya están en caché. Responde cuando
 * acaba; si el backend falla (`ok: false`, 502), `wakeFetch` lo repite hasta que despierte.
 */
export async function GET() {
  // Siempre en tiempo de petición: nunca se prerenderiza en el build.
  await connection();
  running ??= warm().finally(() => {
    running = null;
  });
  const body = await running;
  const ok = body.ok;
  return NextResponse.json(body, {
    status: ok ? 200 : 502,
    headers: { "cache-control": "no-store" },
  });
}
