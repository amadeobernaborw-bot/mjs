/**
 * Matemática pura de la grilla. Un item de layout es
 * { widget_id, x, y, w, h, enabled, config } y nunca se muta: todas las
 * funciones devuelven arrays nuevos. Los items ocultos (enabled: false)
 * conservan sus coordenadas y no participan de colisiones ni compactación.
 */
import { COLUMNS, FRAME_ROWS, MARGIN, MAX_ROW_HEIGHT, MIN_ROW_HEIGHT } from './constants';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Alto de fila para que las primeras `rows` filas (más sus márgenes) llenen
 * el alto disponible entre el borde superior de la grilla y el de la pantalla.
 */
export function computeRowHeight({
  viewportHeight,
  frameTop,
  bottomPadding = 0,
  rows = FRAME_ROWS,
  margin = MARGIN,
  min = MIN_ROW_HEIGHT,
  max = MAX_ROW_HEIGHT,
}) {
  const available = viewportHeight - frameTop - bottomPadding;
  const raw = (available - margin * (rows - 1)) / rows;
  if (!Number.isFinite(raw)) return min;
  return clamp(Math.floor(raw), min, max);
}

export function overlaps(a, b) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function byPosition(a, b) {
  return a.y - b.y || a.x - b.x;
}

/** Fila siguiente a la última ocupada por un item visible. */
export function bottomOf(items) {
  return items.reduce((max, it) => (it.enabled ? Math.max(max, it.y + it.h) : max), 0);
}

/** Reemplaza items por widget_id manteniendo el orden original del array. */
function replaceById(items, updated) {
  const map = new Map(updated.map((it) => [it.widget_id, it]));
  return items.map((it) => map.get(it.widget_id) || it);
}

/** Compactación vertical: cada item visible sube hasta chocar con otro o con el borde. */
export function compact(items) {
  const settled = [];
  items.filter((it) => it.enabled).sort(byPosition).forEach((it) => {
    let y = it.y;
    while (y > 0 && !settled.some((s) => overlaps(s, { ...it, y: y - 1 }))) y -= 1;
    settled.push({ ...it, y });
  });
  return replaceById(items, settled);
}

/**
 * Empuja hacia abajo los items que se superponen. `priorityId` (el item que se
 * acaba de mover o agrandar) queda fijo y el resto se acomoda debajo.
 */
export function resolveCollisions(items, priorityId = null) {
  const visible = items.filter((it) => it.enabled);
  const fixed = visible.find((it) => it.widget_id === priorityId);
  const settled = fixed ? [fixed] : [];
  visible
    .filter((it) => it !== fixed)
    .sort(byPosition)
    .forEach((it) => {
      let cur = it;
      let hits = settled.filter((s) => overlaps(s, cur));
      while (hits.length) {
        cur = { ...cur, y: Math.max(...hits.map((s) => s.y + s.h)) };
        hits = settled.filter((s) => overlaps(s, cur));
      }
      settled.push(cur);
    });
  return replaceById(items, settled);
}

/** Mismo layout aunque el array venga en otro orden (compara por widget_id). */
export function layoutsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const map = new Map(b.map((it) => [it.widget_id, it]));
  return a.every((it) => {
    const other = map.get(it.widget_id);
    return other
      && other.x === it.x && other.y === it.y && other.w === it.w && other.h === it.h
      && other.enabled === it.enabled
      && JSON.stringify(other.config || {}) === JSON.stringify(it.config || {});
  });
}

function updateItem(items, id, fn) {
  return items.map((it) => (it.widget_id === id ? fn(it) : it));
}

/** Vecino visible más cercano arriba (dir = -1) o abajo (dir = 1) que comparte columnas. */
function verticalNeighbour(items, item, dir) {
  const sameColumns = items.filter((o) => o.enabled && o.widget_id !== item.widget_id
    && o.x < item.x + item.w && item.x < o.x + o.w);
  const candidates = dir > 0
    ? sameColumns.filter((o) => o.y > item.y).sort((a, b) => a.y - b.y)
    : sameColumns.filter((o) => o.y < item.y).sort((a, b) => b.y - a.y);
  return candidates[0] || null;
}

/**
 * Mueve un item una celda (alternativa de teclado al arrastre). En horizontal
 * corre la columna; en vertical intercambia lugar con el vecino, porque en una
 * grilla compactada bajar una fila sin pasar al otro lado se deshace solo.
 */
export function moveItem(items, id, dx, dy, cols = COLUMNS) {
  const item = items.find((it) => it.widget_id === id);
  if (!item || !item.enabled) return items;

  if (dx) {
    const x = clamp(item.x + dx, 0, cols - item.w);
    if (x === item.x) return items;
    return compact(resolveCollisions(updateItem(items, id, (it) => ({ ...it, x })), id));
  }

  if (dy) {
    const neighbour = verticalNeighbour(items, item, dy);
    if (!neighbour) return items;
    const moved = dy > 0
      ? updateItem(updateItem(items, neighbour.widget_id, (n) => ({ ...n, y: item.y })), id,
        (it) => ({ ...it, y: item.y + neighbour.h }))
      : updateItem(updateItem(items, id, (it) => ({ ...it, y: neighbour.y })), neighbour.widget_id,
        (n) => ({ ...n, y: neighbour.y + item.h }));
    return compact(resolveCollisions(moved, id));
  }

  return items;
}

/** Cambia ancho/alto en ±1 respetando los límites del widget y el borde derecho. */
export function resizeItem(items, id, dw, dh, limits, cols = COLUMNS) {
  const item = items.find((it) => it.widget_id === id);
  if (!item || !item.enabled) return items;
  const w = clamp(item.w + dw, limits.minW, Math.min(limits.maxW, cols - item.x));
  const h = clamp(item.h + dh, limits.minH, limits.maxH);
  if (w === item.w && h === item.h) return items;
  return compact(resolveCollisions(updateItem(items, id, (it) => ({ ...it, w, h })), id));
}

/**
 * Layout de solo lectura para anchos chicos. Recorre los items visibles en el
 * orden de lectura del escritorio y los acomoda en `cols` columnas con
 * primer-hueco-libre. Las alturas se mantienen; el ancho se reescala.
 */
export function deriveLayout(items, cols) {
  if (cols >= COLUMNS) return items.filter((it) => it.enabled);
  const placed = [];
  items.filter((it) => it.enabled).sort(byPosition).forEach((it) => {
    const w = cols === 1 ? 1 : clamp(Math.ceil((it.w * cols) / COLUMNS), 1, cols);
    for (let y = 0; ; y += 1) {
      let spot = null;
      for (let x = 0; x <= cols - w && !spot; x += 1) {
        const candidate = { ...it, x, y, w };
        if (!placed.some((p) => overlaps(p, candidate))) spot = candidate;
      }
      if (spot) { placed.push(spot); break; }
    }
  });
  return placed;
}

/**
 * Items visibles → formato de react-grid-layout. Los límites del catálogo solo
 * viajan cuando se puede editar; en un layout estático (derivado a 4 o 1
 * columnas) un minW mayor que las columnas haría que la grilla lo corrija.
 */
export function toGridLayout(items, widgetById, isStatic = false) {
  return items.filter((it) => it.enabled && widgetById.has(it.widget_id)).map((it) => {
    const base = { i: it.widget_id, x: it.x, y: it.y, w: it.w, h: it.h, static: isStatic };
    if (isStatic) return base;
    const widget = widgetById.get(it.widget_id);
    return { ...base, minW: widget.minW, maxW: widget.maxW, minH: widget.minH, maxH: widget.maxH };
  });
}

/** Posiciones devueltas por la grilla → layout completo (los ocultos quedan igual). */
export function fromGridLayout(gridLayout, items) {
  const byId = new Map(gridLayout.map((g) => [g.i, g]));
  return items.map((it) => {
    const g = byId.get(it.widget_id);
    if (!g || !it.enabled) return it;
    if (g.x === it.x && g.y === it.y && g.w === it.w && g.h === it.h) return it;
    return { ...it, x: g.x, y: g.y, w: g.w, h: g.h };
  });
}
