import { type NextRequest, NextResponse } from "next/server";
import { postSuggestion } from "@/lib/api";
import { parseSuggestion } from "@/lib/suggest";

/** Sugerir marca. El cliente nunca llama al backend directamente (ni a la BDD). */
export async function POST(request: NextRequest) {
  const parsed = parseSuggestion(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ success: false, data: null, error: parsed.error }, { status: 400 });
  }

  try {
    await postSuggestion(parsed.data);
  } catch (error) {
    console.error("[api/suggestions]", error);
    return NextResponse.json(
      { success: false, data: null, error: "No se pudo enviar la sugerencia" },
      { status: 502 },
    );
  }
  return NextResponse.json({ success: true, data: null, error: null });
}
