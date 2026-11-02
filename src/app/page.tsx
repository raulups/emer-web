import { Landing } from "@/components/landing/landing";

/**
 * Landing: túnel de fotos con el contador de marcas mientras `/api/warm` deja en caché los datos
 * del Marketplace; después, `/web`. Estática: no espera al backend.
 */
export default function LandingPage() {
  return <Landing />;
}
