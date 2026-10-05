/**
 * Registro de widgets de una pantalla. El catálogo vive en código; la base
 * solo guarda { widget_id, x, y, w, h, enabled, config }. `mergeLayout`
 * reconcilia lo guardado con el catálogo actual en cada lectura, así se
 * agregan o sacan widgets sin migrar datos.
 *
 * @typedef {{ x: number, y: number, w: number, h: number }} Box
 * @typedef {{
 *   id: string, title: string, description: string, group: string,
 *   Component: import('react').ComponentType<{ config: Record<string, unknown> }>,
 *   defaults: Box, isDefault: boolean,
 *   minW: number, minH: number, maxW: number, maxH: number,
 *   visuals?: string[], visualLabels?: Record<string, string>,
 * }} Widget
 * @typedef {Box & { widget_id: string, enabled: boolean, config: Record<string, unknown> }} LayoutItem
 */
import { COLUMNS, MAX_ITEM_H, MAX_Y } from './constants';
import { bottomOf, clamp, compact, resolveCollisions } from './layoutMath';

const ID_PATTERN = /^[a-z0-9_]{1,64}$/;

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Lee el visual elegido; si no es uno de los permitidos usa el primero (el default del menú). */
export function visualOf(config, widget) {
  const visuals = widget?.visuals || [];
  const chosen = config?.visual;
  return visuals.includes(chosen) ? chosen : visuals[0];
}

/**
 * @param {Widget[]} widgets
 * @param {{ groups?: string[] }} [options] orden de las categorías en el catálogo
 */
export function createRegistry(widgets, options = {}) {
  const widgetById = new Map();
  widgets.forEach((w) => {
    if (!ID_PATTERN.test(w.id)) throw new Error(`[widgets] id inválido: "${w.id}"`);
    if (widgetById.has(w.id)) throw new Error(`[widgets] id repetido: "${w.id}"`);
    widgetById.set(w.id, w);
  });

  const present = [...new Set(widgets.map((w) => w.group))];
  const groups = options.groups
    ? [...options.groups.filter((g) => present.includes(g)), ...present.filter((g) => !options.groups.includes(g))]
    : present;

  /** Aplica los límites del catálogo (no los guardados) y sanea config. */
  function clampItem(item, widget) {
    const w = clamp(toInt(item.w, widget.defaults.w), widget.minW, Math.min(widget.maxW, COLUMNS));
    const h = clamp(toInt(item.h, widget.defaults.h), widget.minH, Math.min(widget.maxH, MAX_ITEM_H));
    const config = isPlainObject(item.config) ? { ...item.config } : {};
    if ('visual' in config && !(widget.visuals || []).includes(config.visual)) delete config.visual;
    return {
      widget_id: widget.id,
      x: clamp(toInt(item.x, 0), 0, COLUMNS - w),
      y: clamp(toInt(item.y, 0), 0, MAX_Y),
      w,
      h,
      enabled: item.enabled === true,
      config,
    };
  }

  function hiddenItem(widget) {
    return clampItem({ ...widget.defaults, x: 0, y: 0, enabled: false, config: {} }, widget);
  }

  /** Ubicación al fondo de la grilla; de `defaults` solo cuentan w/h. */
  function positionForNew(layout, widget, size = widget.defaults) {
    const placed = clampItem({ ...size, x: 0, y: bottomOf(layout), enabled: true }, widget);
    return { x: placed.x, y: placed.y, w: placed.w, h: placed.h };
  }

  const defaultLayout = compact(resolveCollisions(widgets.map((w) => (
    w.isDefault
      ? clampItem({ ...w.defaults, enabled: true, config: {} }, w)
      : hiddenItem(w)
  ))));

  /** Layout guardado (o null) → layout completo y válido para el catálogo actual. */
  function mergeLayout(saved) {
    if (!Array.isArray(saved)) return defaultLayout;
    const savedById = new Map();
    saved.forEach((it) => {
      if (isPlainObject(it) && widgetById.has(it.widget_id) && !savedById.has(it.widget_id)) {
        savedById.set(it.widget_id, it);
      }
    });
    // Nada reconocible (array vacío o solo ids viejos): mejor el diseño de fábrica
    // que apilar todos los widgets en una columna al fondo
    if (savedById.size === 0) return defaultLayout;

    const known = [];
    const added = [];
    widgets.forEach((w) => {
      const s = savedById.get(w.id);
      if (s) known.push(clampItem(s, w));
      else added.push(w);
    });

    // Widgets que aparecieron después de que el usuario guardó
    let layout = resolveCollisions(known);
    added.forEach((w) => {
      const item = w.isDefault
        ? { ...hiddenItem(w), ...positionForNew(layout, w), enabled: true }
        : hiddenItem(w);
      layout = [...layout, item];
    });

    const order = new Map(widgets.map((w, i) => [w.id, i]));
    return compact(layout).sort((a, b) => order.get(a.widget_id) - order.get(b.widget_id));
  }

  /**
   * Layout completo de una vista fija: solo los widgets listados quedan visibles,
   * el resto oculto. A diferencia de mergeLayout no agrega los de fábrica que
   * falten. `items` es [{ widget_id, x, y, w, h, config? }]; los ids
   * desconocidos se ignoran y los límites salen del catálogo.
   */
  function layoutFromPreset(items = []) {
    const byId = new Map();
    items.forEach((it) => {
      if (isPlainObject(it) && widgetById.has(it.widget_id) && !byId.has(it.widget_id)) byId.set(it.widget_id, it);
    });
    const layout = widgets.map((w) => {
      const it = byId.get(w.id);
      return it ? clampItem({ ...it, enabled: true, config: it.config || {} }, w) : hiddenItem(w);
    });
    return compact(resolveCollisions(layout));
  }

  /** Vuelve a mostrar un widget oculto al fondo, con el tamaño y config que conservaba. */
  function showWidget(layout, id) {
    const widget = widgetById.get(id);
    const item = layout.find((it) => it.widget_id === id);
    if (!widget || !item || item.enabled) return layout;
    const pos = positionForNew(layout, widget, item);
    return compact(layout.map((it) => (it.widget_id === id ? { ...it, ...pos, enabled: true } : it)));
  }

  function hideWidget(layout, id) {
    return compact(layout.map((it) => (it.widget_id === id ? { ...it, enabled: false } : it)));
  }

  function updateConfig(layout, id, patch) {
    return layout.map((it) => (it.widget_id === id ? { ...it, config: { ...it.config, ...patch } } : it));
  }

  return {
    widgets,
    widgetById,
    groups,
    defaultLayout,
    mergeLayout,
    layoutFromPreset,
    positionForNew,
    showWidget,
    hideWidget,
    updateConfig,
  };
}
