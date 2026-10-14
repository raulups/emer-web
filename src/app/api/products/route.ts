import { type NextRequest, NextResponse } from "next/server";
import { parseSearchParams } from "@/lib/marketplace";
import { getMarketplacePage } from "@/lib/marketplace-data";

/** Productos del Marketplace con filtros. El cliente nunca llama al backend directamente. */
export async function GET(request: NextRequest) {
  const parsed = parseSearchParams(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, data: null, error: parsed.error }, { status: 400 });
  }

  const result = await getMarketplacePage(parsed.filters, parsed.page, parsed.cursor);
  if (!result.ok) {
    console.error("[api/products]", result.error);
    return NextResponse.json(
      { success: false, data: null, error: "No se pudieron cargar los productos" },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true, data: result.data, error: null });
}
