import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { OWNER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de privacidad · Emer",
  description: "Cómo trata Emer los datos personales.",
};

export default function PrivacidadPage() {
  return (
    <LegalPage current="/privacidad" title="Privacidad">
      <h2>1. Responsable del tratamiento</h2>
      <ul>
        <li>Responsable: {OWNER.name}</li>
        <li>NIF: {OWNER.nif}</li>
        <li>Domicilio: {OWNER.address}</li>
        <li>
          Contacto: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
        </li>
      </ul>

      <h2>2. Qué datos se tratan y para qué</h2>
      <p>
        Emer no tiene registro de usuarios, no muestra publicidad y no vende datos. Solo se tratan
        los datos necesarios en estos casos:
      </p>
      <ul>
        <li>
          <strong>Formulario «Sugerir marca».</strong> Se recogen el nombre de la marca y su usuario
          de Instagram para valorar si se incorpora a Emer. Base legal: tu consentimiento al enviar
          el formulario (art. 6.1.a RGPD), que puedes retirar en cualquier momento. Plazo: hasta que
          se resuelve la sugerencia y, como máximo, 12 meses.
        </li>
        <li>
          <strong>Correos que envíes a Emer.</strong> Tu dirección y el contenido del mensaje, para
          responderte y atender tu solicitud. Base legal: tu consentimiento y, en el caso del
          ejercicio de derechos, el cumplimiento de una obligación legal (art. 6.1.a y 6.1.c RGPD).
          Plazo: el necesario para atenderte y, después, el de prescripción de posibles
          responsabilidades.
        </li>
        <li>
          <strong>Estadísticas de uso.</strong> Solo si aceptas las cookies de analítica, Google
          Analytics registra de forma seudónima las páginas y secciones que visitas y lo que pulsas
          (marcas, piezas, filtros, búsquedas, enlaces a tiendas), junto a un identificador
          aleatorio guardado en una cookie, el tipo de dispositivo, el navegador y la ubicación
          aproximada (país y ciudad) deducida de la IP, para saber qué funciona y mejorar Emer.
          También se registran los errores de la web. No se usan con fines publicitarios. Base
          legal: tu consentimiento (art. 6.1.a RGPD), que puedes retirar en cualquier momento desde
          «Configurar cookies». Plazo: 14 meses.
        </li>
        <li>
          <strong>Datos técnicos de navegación.</strong> Los servidores registran de forma
          automática la dirección IP, el navegador y las páginas solicitadas para que el sitio
          funcione y para protegerlo frente a abusos. Base legal: interés legítimo en la seguridad
          del servicio (art. 6.1.f RGPD). Plazo: el periodo limitado que fijan los proveedores de
          alojamiento en sus registros.
        </li>
      </ul>
      <p>No se toman decisiones automatizadas ni se elaboran perfiles con estos datos.</p>

      <h2>3. Destinatarios</h2>
      <p>
        No se ceden datos a terceros salvo obligación legal. Para prestar el servicio, Emer utiliza
        proveedores que actúan como encargados del tratamiento:
      </p>
      <ul>
        <li>Render Services, Inc.: alojamiento del servidor (backend).</li>
        <li>Supabase, Inc.: base de datos.</li>
        <li>El proveedor de alojamiento de la web.</li>
        <li>
          Google Ireland Limited / Google LLC: estadísticas de uso (Google Analytics), solo si las
          aceptas.
        </li>
      </ul>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo. En ese
        caso, las transferencias se amparan en las garantías previstas en el RGPD, como el Marco de
        Privacidad de Datos UE-EE. UU. o las cláusulas contractuales tipo de la Comisión Europea.
      </p>
      <p>
        Al pulsar «Ir a la tienda» o los enlaces a redes sociales, sales de Emer: el tratamiento que
        hagan esos sitios se rige por sus propias políticas.
      </p>

      <h2>4. Tus derechos</h2>
      <p>
        Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del
        tratamiento y portabilidad, y retirar tu consentimiento, escribiendo a{" "}
        <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a> e indicando qué derecho quieres ejercer.
        Recibirás respuesta en el plazo máximo de un mes.
      </p>
      <p>
        Si consideras que no se han atendido correctamente tus derechos, puedes presentar una
        reclamación ante la Agencia Española de Protección de Datos (
        <a href="https://www.aepd.es" rel="noopener noreferrer" target="_blank">
          www.aepd.es
        </a>
        ).
      </p>

      <h2>5. Seguridad</h2>
      <p>
        Se aplican medidas técnicas y organizativas adecuadas para proteger los datos: las
        comunicaciones van cifradas, el navegador nunca accede directamente a la base de datos y el
        acceso a la información está limitado al titular.
      </p>

      <h2>6. Cookies</h2>
      <p>
        El uso de cookies y almacenamiento local se explica en la{" "}
        <Link href="/cookies">política de cookies</Link>.
      </p>

      <h2>7. Cambios en esta política</h2>
      <p>
        Esta política puede actualizarse para adaptarla a cambios legales o del servicio. La fecha
        de la última actualización figura al principio de la página.
      </p>
    </LegalPage>
  );
}
