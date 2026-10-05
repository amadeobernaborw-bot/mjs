import { useEffect } from 'react';

/**
 * Temas disponibles. Los colores viven en design-system.css bajo
 * :root[data-theme="dark" | "light"]; acá solo se elige cuál aplicar.
 */
export const THEMES = {
  dark: {
    id: 'dark',
    label: 'Oscuro Bordó',
    description: 'Fondo negro, bordó como color principal y tarjetas de vidrio con brillo.',
  },
  light: {
    id: 'light',
    label: 'Claro Acero',
    description: 'Fondo gris muy claro, azul grisáceo como color principal y vidrio esmerilado.',
  },
};

export const DEFAULT_THEME = 'dark';

/** Zonas con tema propio: la tienda pública y el panel admin (login incluido). */
export const THEME_SCOPES = {
  storefront: 'storefront',
  admin: 'admin',
};

// Debe coincidir con el script inline de index.html
const storageKey = (scope) => `mj-theme-${scope}`;

export function isValidTheme(theme) {
  return Object.prototype.hasOwnProperty.call(THEMES, theme);
}

/** Último tema usado en esa zona (para pintar sin esperar a Supabase). */
export function getCachedTheme(scope) {
  try {
    const cached = window.localStorage.getItem(storageKey(scope));
    return isValidTheme(cached) ? cached : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function syncThemeColorMeta() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const pageColor = getComputedStyle(document.documentElement).getPropertyValue('--surface-page').trim();
  if (pageColor) meta.setAttribute('content', pageColor);
}

/**
 * Aplica el tema en <html data-theme> y lo recuerda para la próxima visita.
 * Si `theme` no es válido (p. ej. el perfil todavía no cargó), reaplica el último conocido.
 */
export function applyTheme(scope, theme) {
  const next = isValidTheme(theme) ? theme : getCachedTheme(scope);
  document.documentElement.dataset.theme = next;
  syncThemeColorMeta();
  if (!isValidTheme(theme)) return next;
  try {
    window.localStorage.setItem(storageKey(scope), next);
  } catch {
    // Almacenamiento bloqueado (modo privado): el tema igual queda aplicado en esta visita
  }
  return next;
}

/** Mantiene el documento con el tema de la zona mientras el componente está montado. */
export function useDocumentTheme(scope, theme) {
  useEffect(() => {
    applyTheme(scope, theme);
  }, [scope, theme]);
}
