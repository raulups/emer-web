/** Enlaces de la app de Emer en las tiendas. `null` mientras no esté publicada (se muestra «Próximamente»). */
export const APP_LINKS: { readonly ios: string | null; readonly android: string | null } = {
  ios: null,
  android: null,
};

/** Clave de `sessionStorage` del aviso de la app: se muestra una vez por sesión del navegador. */
export const APP_PROMPT_KEY = "emer:app-prompt";
