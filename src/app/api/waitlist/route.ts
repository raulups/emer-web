import { type NextRequest, NextResponse } from "next/server";
import { ApiError, postWaitlist } from "@/lib/api";
import { parseWaitlist } from "@/lib/waitlist";

/** Lista de espera de la app. El cliente nunca llama al backend directamente (ni a la BDD). */
export async function POST(request: NextRequest) {
  const parsed = parseWaitlist(await request.json().catch(() => null));
  if (!parsed.ok) {
    return NextResponse.json({ success: false, data: null, error: parsed.error }, { status: 400 });
  }

  try {
    const data = await postWaitlist(parsed.data.email);
    return NextResponse.json({ success: true, data, error: null });
  } catch (error) {
    console.error("[api/waitlist]", error);
    if (error instanceof ApiError && error.status === 429) {
      return NextResponse.json(
        { success: false, data: null, error: "Demasiados intentos. Prueba en un minuto." },
        { status: 429 },
      );
    }
    if (error instanceof ApiError && error.status === 400) {
      return NextResponse.json(
        { success: false, data: null, error: "Email no válido" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, data: null, error: "No se pudo guardar el email" },
      { status: 502 },
    );
  }
}
