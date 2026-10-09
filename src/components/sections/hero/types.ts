/** Datos mínimos que necesita el carrusel (se preparan en servidor para aligerar el payload). */
export type HeroProduct = {
  id: string;
  imageUrl: string;
  price: string | null;
  /** FALTA EN BACKEND en PreviewProduct: se resuelve por id contra /products si es posible. */
  name: string | null;
  /** Destino del producto; si no se conoce, la web de la marca. */
  href: string | null;
  /** true si `href` es la web de la marca (no la ficha del producto). */
  hrefIsBrand: boolean;
};

export type HeroBrand = {
  id: string;
  /** Nombre tal cual llega de la API; se muestra en mayúsculas por CSS. */
  name: string;
  url: string | null;
  img: string;
  color: string;
  products: HeroProduct[];
};
