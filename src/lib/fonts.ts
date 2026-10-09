import localFont from "next/font/local";

export const anton = localFont({
  src: "../fonts/anton-400.woff2",
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-anton",
});

export const fraunces = localFont({
  src: [
    { path: "../fonts/fraunces-normal.woff2", style: "normal", weight: "300 400" },
    { path: "../fonts/fraunces-italic.woff2", style: "italic", weight: "300 400" },
  ],
  display: "swap",
  variable: "--font-fraunces",
});
