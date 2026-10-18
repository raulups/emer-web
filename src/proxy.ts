import { type NextRequest, NextResponse, userAgent } from "next/server";

/** Ruta interna de la web de móvil (solo Marketplace). En la barra de direcciones sigue `/` o `/web`. */
const MOBILE_ROUTE = "/m";

/**
 * Web de móvil: en un teléfono no hay Landing ni Explora. `/` y `/web` se sirven desde `/m`
 * (Marketplace + aviso de la app) sin redirigir, que en móvil cuesta un viaje más. Tablets y
 * ordenadores siguen con la web completa, y `/m` fuera del móvil vuelve a `/web`.
 */
export function proxy(request: NextRequest) {
  const mobile = userAgent(request).device.type === "mobile";
  const url = request.nextUrl.clone();
  const { pathname } = url;

  let response: NextResponse;
  if (mobile && (pathname === "/" || pathname === "/web")) {
    url.pathname = MOBILE_ROUTE;
    response = NextResponse.rewrite(url);
  } else if (!mobile && pathname === MOBILE_ROUTE) {
    url.pathname = "/web";
    response = NextResponse.redirect(url);
  } else {
    response = NextResponse.next();
  }
  // La misma URL cambia según el dispositivo: ninguna caché intermedia debe mezclarlas.
  response.headers.append("Vary", "User-Agent");
  return response;
}

export const config = {
  matcher: ["/", "/web", "/m"],
};
