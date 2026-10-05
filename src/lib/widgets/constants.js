/**
 * Constantes del motor de widgets. Las coordenadas (x, y, w, h) siempre están
 * en unidades de la grilla de escritorio: 8 columnas y filas sin límite.
 * El encuadre principal son las primeras 8 filas, que ocupan justo el alto
 * visible de la pantalla (ver computeRowHeight en layoutMath.js).
 */

export const COLUMNS = 8;
export const FRAME_ROWS = 8;
export const MARGIN = 18;

export const MIN_ROW_HEIGHT = 56;
export const MAX_ROW_HEIGHT = 140;
/** Alto de fila en tablet y celular, donde el layout se deriva del de escritorio. */
export const FALLBACK_ROW_HEIGHT = 80;

/** Tope de filas aceptado al leer o guardar (mismo valor que valida la migración 010). */
export const MAX_Y = 500;
export const MAX_ITEM_H = 16;

/** Breakpoints por ancho del contenedor (no del viewport): la barra lateral también cuenta. */
export const BREAKPOINTS = {
  lg: { minWidth: 880, cols: COLUMNS },
  md: { minWidth: 520, cols: 4 },
  sm: { minWidth: 0, cols: 1 },
};

/** Presets de límites para una grilla de 8 columnas con filas de 1/8 de pantalla. */
export const KPI = { minW: 1, minH: 1, maxW: 4, maxH: 3 };
export const REPARTO = { minW: 2, minH: 3, maxW: 8, maxH: 8 };
export const SERIE = { minW: 3, minH: 3, maxW: 8, maxH: 8 };
export const GRANDE = { minW: 3, minH: 3, maxW: 8, maxH: 12 };
export const MODULO = { minW: 3, minH: 3, maxW: 8, maxH: MAX_ITEM_H };

export function breakpointFor(width) {
  if (width >= BREAKPOINTS.lg.minWidth) return 'lg';
  if (width >= BREAKPOINTS.md.minWidth) return 'md';
  return 'sm';
}
