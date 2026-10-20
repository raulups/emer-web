import { NextResponse } from "next/server";
import { getProductPeek } from "@/lib/data";
import { isUuid } from "@/lib/marketplace";

/** Ficha corta de un producto (detalle en hover de Explora). */
export async function GET(_request: Request, { params }: RouteContext<"/api/products/[id]">) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { success: false, data: null, error: "id no válido" },
      { status: 400 },
    );
  }

  const result = await getProductPeek(id);
  if (!result.ok) {
    console.error("[api/product]", result.error);
    return NextResponse.json(
      { success: false, data: null, error: "No se pudo cargar el producto" },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true, data: result.data, error: null });
}
