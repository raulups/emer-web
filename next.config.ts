import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Con datos de ejemplo se compila en otra carpeta: así nunca pueden acabar en el build real.
  distDir: process.env.EMER_API_FIXTURES === "1" ? ".next-fixtures" : ".next",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "aidisezaeymiesrdfnza.supabase.co" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
