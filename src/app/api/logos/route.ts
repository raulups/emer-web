import { connection, NextResponse } from "next/server";
import { getBrands } from "@/lib/data";

/** Lo que espera el túnel de la Landing: los logos de las marcas (puede venir vacío). */
export type LogosResponse = { logos: string[] };

/** Logos como mucho: el túnel no necesita más. */
const MAX_LOGOS = 40;
/** Si el backend no responde antes (dormido y sin caché), el túnel sale sin logos. */
const LOGOS_GRACE_MS = 1_500;

/**
 * Logos para el túnel de la Landing. Lee las marcas con la misma consulta en caché ("use cache")
 * que el resto de la web, así que con la caché llena responde al instante. No espera al backend
 * dormido: pasado `LOGOS_GRACE_MS` responde vacío y la lectura sigue en segundo plano (como en
 * `/api/warm`, que es quien avisa y reintenta).
 */
export async function GET() {
  await connection();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), LOGOS_GRACE_MS);
  });
  const result = await Promise.race([getBrands(), timeout]).finally(() => clearTimeout(timer));
  const logos =
    result?.ok === true
      ? [
          ...new Set(
            result.data.map((brand) => brand.logo).filter((logo): logo is string => !!logo),
          ),
        ]
      : [];
  return NextResponse.json({ logos: logos.slice(0, MAX_LOGOS) } satisfies LogosResponse, {
    headers: { "cache-control": "no-store" },
  });
}
