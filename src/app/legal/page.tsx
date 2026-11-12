import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { OWNER } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Aviso legal · Emer",
  description: "Aviso legal y condiciones de uso de Emer.",
};

export default function AvisoLegalPage() {
  return (
    <LegalPage current="/legal" title="Aviso legal">
      <h2>1. Titular del sitio web</h2>
      <p>
        En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la
        Información y de Comercio Electrónico (LSSI-CE), se informa de los datos del titular de este
        sitio web (en adelante, «Emer»):
      </p>
      <ul>
        <li>Titular: {OWNER.name}</li>
        <li>NIF: {OWNER.nif}</li>
        <li>Domicilio: {OWNER.address}</li>
        <li>
          Correo electrónico: <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a>
        </li>
      </ul>

      <h2>2. Qué es Emer</h2>
      <p>
        Emer es un proyecto personal, sin ánimo de lucro, que reúne en un mismo lugar el catálogo de
        marcas de moda emergentes para facilitar que se descubran. Emer no vende productos, no
        gestiona pedidos ni pagos y no cobra comisiones a las marcas ni a los usuarios.
      </p>
      <p>
        Al pulsar «Ir a la tienda» se abandona Emer y se accede a la tienda online de cada marca. La
        compra, el precio final, el stock, los envíos, las devoluciones y la atención al cliente son
        responsabilidad exclusiva de la marca correspondiente y se rigen por sus propias
        condiciones.
      </p>

      <h2>3. Condiciones de uso</h2>
      <p>
        El acceso a Emer es gratuito y no requiere registro. Al usarlo, aceptas estas condiciones y
        te comprometes a hacer un uso lícito del sitio, sin dañar su funcionamiento, sin extraer su
        contenido de forma automatizada y sin enviar a través de sus formularios información falsa,
        ofensiva o que vulnere derechos de terceros.
      </p>

      <h2>4. Información de los productos</h2>
      <p>
        Los nombres, descripciones, precios, tallas e imágenes de los productos proceden de las
        tiendas de cada marca y se actualizan de forma periódica. Emer procura que sean correctos,
        pero pueden existir diferencias o retrasos respecto a la tienda original. En caso de
        discrepancia, prevalece siempre la información de la tienda de la marca.
      </p>

      <h2>5. Propiedad intelectual e industrial</h2>
      <p>
        El diseño, el código y los textos propios de Emer pertenecen a su titular. Los nombres,
        logotipos, marcas e imágenes de cada marca y de sus productos pertenecen a sus respectivos
        titulares y se muestran con su autorización y con el único fin de dar a conocer su catálogo.
        No se permite su reproducción ni su uso fuera de Emer sin el permiso de sus titulares.
      </p>
      <p>
        Si eres titular de una marca o de un contenido mostrado en Emer y quieres que se modifique o
        se retire, escribe a <a href={`mailto:${OWNER.email}`}>{OWNER.email}</a> y se atenderá tu
        solicitud en el menor plazo posible.
      </p>

      <h2>6. Enlaces a terceros</h2>
      <p>
        Emer contiene enlaces a tiendas y redes sociales de terceros. Emer no controla esos sitios
        ni se responsabiliza de su contenido, de su disponibilidad ni de sus políticas de
        privacidad.
      </p>

      <h2>7. Responsabilidad</h2>
      <p>
        Emer no garantiza la disponibilidad continua del sitio y no responde de los daños derivados
        de interrupciones, errores en la información procedente de las tiendas o de las compras
        realizadas en sitios de terceros, salvo en los casos en que la ley no permita excluir esta
        responsabilidad.
      </p>

      <h2>8. Protección de datos y cookies</h2>
      <p>
        El tratamiento de datos personales se explica en la{" "}
        <Link href="/privacidad">política de privacidad</Link> y el uso de cookies y almacenamiento
        local en la <Link href="/cookies">política de cookies</Link>.
      </p>

      <h2>9. Legislación aplicable</h2>
      <p>
        Estas condiciones se rigen por la legislación española. Para cualquier controversia, las
        partes se someten a los juzgados y tribunales que correspondan conforme a la ley; si actúas
        como consumidor, serán los de tu domicilio.
      </p>
    </LegalPage>
  );
}
