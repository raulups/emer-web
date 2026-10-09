"use client";

import { useEffect } from "react";

/** Fallo en el propio layout raíz: se renderiza sin fuentes ni estilos globales. */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 16,
          padding: "0 clamp(16px, 3vw, 40px)",
          background: "#fff",
          color: "#000",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>Error · Emer</title>
        <h1 style={{ margin: 0, fontSize: 36, textTransform: "uppercase" }}>Algo se ha roto</h1>
        <p style={{ margin: 0 }}>Vuelve a intentarlo en un momento.</p>
        <button
          type="button"
          onClick={() => retry()}
          style={{
            border: "1px solid #000",
            background: "#fff",
            padding: "8px 16px",
            fontSize: 12,
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
