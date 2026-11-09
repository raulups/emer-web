"use client";

import { useState } from "react";
import { sizedImage } from "@/lib/marketplace";

type Props = {
  sources: readonly string[];
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** Ancho que se pide a la CDN (a 2x). */
  request: number;
  /** `lazy` para listas largas (el Catálogo): solo se descarga al acercarse a la pantalla. */
  loading?: "lazy" | "eager";
};

/** Foto de marca o producto: si la primera falla, prueba la siguiente (primer producto). */
export function BrandImage({ sources, alt, width, height, className, request, loading }: Props) {
  const [index, setIndex] = useState(0);
  const src = sources[index];
  if (!src) return null;
  return (
    // biome-ignore lint/performance/noImgElement: imágenes remotas de varios orígenes, tamaño fijo
    <img
      key={src}
      src={sizedImage(src, request)}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      loading={loading}
      className={className}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
