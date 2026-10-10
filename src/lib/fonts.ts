import localFont from "next/font/local";

export const anton = localFont({
  src: "../fonts/anton-400.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-anton",
  fallback: ["Impact", "Arial Narrow", "sans-serif"],
  adjustFontFallback: "Arial",
});

export const fraunces = localFont({
  src: [
    { path: "../fonts/fraunces-normal.woff2", style: "normal", weight: "300 600" },
    { path: "../fonts/fraunces-italic.woff2", style: "italic", weight: "300 600" },
  ],
  display: "swap",
  variable: "--font-fraunces",
  fallback: ["Georgia", "serif"],
  adjustFontFallback: "Times New Roman",
});
