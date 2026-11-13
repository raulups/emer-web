import type { Metadata } from "next";
import { ConsentButton } from "@/components/analytics/consent-button";
import { LegalPage } from "@/components/legal/legal-page";
import { OWNER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de cookies · Emer",
  description: "Cookies y almacenamiento local que usa Emer.",
};

const ITEMS = [
  {
    name: "emer-grid-desktop / emer-grid-mobile",
    type: "Cookie propia",
    purpose: "Recordar cuántos productos por fila has elegido en el Marketplace.",
    duration: "1 año",
  },
  {
    name: "emer:app-prompt",
    type: "Almacenamiento de sesión",
    purpose: "No volver a enseñar el aviso de la app en la misma visita.",
    duration: "Hasta cerrar la pestaña",
  },
  {
    name: "emer:destacados-deal",
    type: "Almacenamiento de sesión",
    purpose: "Reproducir la animación de entrada de Destacados solo una vez por visita.",
    duration: "Hasta cerrar la pestaña",
  },
  {
    name: "emer:wake-game-best",
    type: "Almacenamiento local",
    purpose: "Guardar tu mejor puntuación en el minijuego de la pantalla de espera.",
    duration: "Hasta que lo borres",
  },
  {
    name: "emer:analytics-consent",
    type: "Almacenamiento local",
    purpose: "Recordar si has aceptado o rechazado las cookies de analítica.",
    duration: "Hasta que lo borres",
  },
] as const;

const ANALYTICS = [
  {
    name: "_ga",
    type: "Cookie de terceros (Google Analytics)",
    purpose: "Distinguir visitantes de forma seudónima para las estadísticas de uso.",
    duration: "13 meses",
  },
  {
    name: "_ga_<ID>",
    type: "Cookie de terceros (Google Analytics)",
    purpose: "Mantener el estado de la sesión para las estadísticas de uso.",
    duration: "13 meses",
  },
] as const;

export default function CookiesPage() {
  return (
    <LegalPage current="/cookies" title="Cookies">
      <h2>1. Qué son</h2>
      <p>
        Las cookies y el almacenamiento local son pequeños datos que un sitio web guarda en tu
        navegador para recordar información entre páginas o visitas.
      </p>

      <h2>2. Qué usa Emer</h2>
      <p>
        Emer usa elementos propios, técnicos y de personalización de la interfaz que tú mismo
        eliges. Conforme al artículo 22.2 de la LSSI-CE, estos no necesitan tu consentimiento:
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Tipo</th>
            <th scope="col">Finalidad</th>
            <th scope="col">Duración</th>
          </tr>
        </thead>
        <tbody>
          {ITEMS.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.type}</td>
              <td>{item.purpose}</td>
              <td>{item.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        Además, solo si las aceptas en el aviso de cookies, Emer usa cookies de analítica de Google
        Analytics para saber qué secciones y marcas se visitan. No se usan para publicidad ni para
        seguimiento en otros sitios. Mientras no las aceptes, no se instalan ni se envía nada a
        Google.
      </p>
      <table>
        <thead>
          <tr>
            <th scope="col">Nombre</th>
            <th scope="col">Tipo</th>
            <th scope="col">Finalidad</th>
            <th scope="col">Duración</th>
          </tr>
        </thead>
        <tbody>
          {ANALYTICS.map((item) => (
            <tr key={item.name}>
              <td>{item.name}</td>
              <td>{item.type}</td>
              <td>{item.purpose}</td>
              <td>{item.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Puedes cambiar tu elección cuando quieras; al retirarla se borran estas cookies.</p>
      <p>
        <ConsentButton />
      </p>

      <h2>3. Enlaces a terceros</h2>
      <p>
        Al pulsar «Ir a la tienda» o los enlaces a redes sociales, sales de Emer. Esos sitios pueden
        usar sus propias cookies, que se rigen por sus políticas.
      </p>

      <h2>4. Cómo eliminarlas</h2>
      <p>
        Puedes borrar o bloquear las cookies y el almacenamiento local desde la configuración de tu
        navegador. Si lo haces, Emer seguirá funcionando, pero no recordará tus preferencias.
      </p>

      <h2>5. Cambios</h2>
      <p>
        Si Emer incorpora otras cookies que requieran consentimiento, se te pedirá antes de
        instalarlas y se actualizará esta política. Para cualquier duda, escribe a{" "}
        <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>.
      </p>
    </LegalPage>
  );
}
