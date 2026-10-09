import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers/providers";
import { anton, fraunces } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Emer — Marcas pequeñas, un solo sitio", template: "%s · Emer" },
  description: "Descubre marcas pequeñas de moda y compra en sus tiendas desde un solo sitio.",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // suppressHydrationWarning: extensiones del navegador que añaden clases a <html>.
  // Nuestras mutaciones (is-loading, has-cursor, lenis) ocurren después de hidratar.
  return (
    <html
      lang="es"
      className={`${anton.variable} ${fraunces.variable} is-loading`}
      suppressHydrationWarning
    >
      <body>
        <noscript>
          <style>
            {
              "html.is-loading{overflow:auto;animation:none}html.is-loading [data-hero-name],html.is-loading [data-hero-item]{transform:none;opacity:1;animation:none}.topbar{position:sticky!important;transform:none!important}[data-js-only]{display:none!important}"
            }
          </style>
        </noscript>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        <Providers>{children}</Providers>
        <div id="announcer" className="sr-only" aria-live="polite" />
      </body>
    </html>
  );
}
