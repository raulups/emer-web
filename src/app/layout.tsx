import type { Metadata, Viewport } from "next";
import { Cursor } from "@/components/cursor";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "EMER — Marcas emergentes, antes que nadie", template: "%s · EMER" },
  description: "Agregador de marcas de moda emergentes: descubre y compra en sus tiendas.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // suppressHydrationWarning: el cursor añade `has-cursor` a <html> después de hidratar.
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        {children}
        <Cursor />
      </body>
    </html>
  );
}
