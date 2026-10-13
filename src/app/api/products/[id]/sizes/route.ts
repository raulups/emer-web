import { NextResponse } from "next/server";
import { getProductSizes } from "@/lib/data";
import { isUuid } from "@/lib/marketplace";

/** Tallas de un producto (las listas del backend no las traen). */
export async function GET(_request: Request, { params }: RouteContext<"/api/products/[id]/sizes">) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json(
      { success: false, data: null, error: "id no válido" },
      { status: 400 },
    );
  }

  const result = await getProductSizes(id);
  if (!result.ok) {
    console.error("[api/sizes]", result.error);
    return NextResponse.json(
      { success: false, data: null, error: "No se pudieron cargar las tallas" },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true, data: result.data, error: null });
}
