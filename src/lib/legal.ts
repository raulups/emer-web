/** Datos del titular para las páginas legales (LSSI art. 10 y RGPD art. 13). */
export const OWNER = {
  name: "Raúl Arribas Canalejo",
  nif: "02798518Q",
  address: "28017 Madrid (España)",
  email: "emerappcontact@gmail.com",
} as const;

export const LEGAL_UPDATED = "13 de noviembre de 2026";

export const LEGAL_PAGES = [
  { href: "/legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
] as const;
