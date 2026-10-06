// Inventario por modelos: un modelo (catalog_models) con variantes (products).
// Lógica pura, sin Supabase: agrupado, filtros, nombres y selector de la tienda.

export const VARIANT_KEYS = ['capacity', 'color', 'condition'];

export const CATEGORY_ORDER = ['iPhone', 'Mac', 'iPad', 'Watch', 'AirPods', 'Accesorios'];

// Misma regla que el backfill de la migración 011
const IPHONE_SUFFIX = /\s+(Pro Max|Pro|Plus|mini)$/i;

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });

/** Línea a la que pertenece un modelo: "iPhone 15 Pro Max" → "iPhone 15". */
export function deriveLine(name, type) {
  const clean = (name || '').trim();
  if (type !== 'iPhone') return clean;
  return clean.replace(IPHONE_SUFFIX, '').trim() || clean;
}

/** "iPhone 15 Pro Max 256GB Titanio natural (Usado — Excelente)" */
export function buildVariantName(modelName, { capacity, color, condition } = {}) {
  const base = [modelName, capacity, color].filter(Boolean).join(' ').trim();
  return condition ? `${base} (${condition})` : base;
}

/** Tamaño en GB para ordenar capacidades ("1TB" > "512GB"); lo desconocido va al final. */
export function capacitySize(capacity) {
  const match = /([\d.]+)\s*(TB|GB)/i.exec(capacity || '');
  if (!match) return Infinity;
  return Number(match[1]) * (match[2].toUpperCase() === 'TB' ? 1024 : 1);
}

const categoryRank = (type) => {
  const i = CATEGORY_ORDER.indexOf(type);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

const rankIn = (list, value) => {
  const i = (list || []).indexOf(value);
  return i < 0 ? Infinity : i;
};

const compareRank = (a, b) => (a === b ? 0 : a < b ? -1 : 1);

/**
 * Orden de variantes: capacidad (por tamaño), estado y color (por el orden del
 * catálogo si se pasa, si no alfabético).
 * @param {{ conditions?: string[], colors?: string[] }} order
 */
export function compareVariants(order = {}) {
  return (a, b) => compareRank(capacitySize(a.capacity), capacitySize(b.capacity))
    || compareRank(rankIn(order.conditions, a.condition), rankIn(order.conditions, b.condition))
    || collator.compare(a.condition || '', b.condition || '')
    || compareRank(rankIn(order.colors, a.color), rankIn(order.colors, b.color))
    || collator.compare(a.color || '', b.color || '')
    || compareRank(a.battery_health ?? -1, b.battery_health ?? -1) * -1;
}

const compareModels = (a, b) => compareRank(a.sort_order ?? 100, b.sort_order ?? 100)
  || collator.compare(a.name || '', b.name || '');

const priceOrInfinity = (v, key) => (Number(v[key]) > 0 ? Number(v[key]) : Infinity);

function minPrice(variants, key) {
  const min = Math.min(...variants.map((v) => priceOrInfinity(v, key)));
  return Number.isFinite(min) ? min : null;
}

const sumStock = (variants) => variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);

const tokenize = (text) => (text || '').toLowerCase().split(/\s+/).filter(Boolean);
const matchesAll = (haystack, tokens) => tokens.every((t) => haystack.includes(t));

const modelHaystack = (m) => `${m.line || ''} ${m.name || ''}`.toLowerCase();
const variantHaystack = (v) => [v.name, v.capacity, v.color, v.condition, v.battery_health != null ? `${v.battery_health}%` : '']
  .filter(Boolean).join(' ').toLowerCase();

/** Una variante se ve en la tienda si ella y su modelo están activos. */
export const isVariantVisible = (variant, model) => model?.is_active !== false && !!variant.is_active;

function passesVisibility(visibility, visible) {
  if (visibility === 'Activos') return visible;
  if (visibility === 'Ocultos') return !visible;
  return true;
}

/**
 * Árbol del inventario: categoría → línea → modelo → variantes, con totales.
 * Los modelos sin variantes se muestran (salvo con stockOnly o una búsqueda que
 * no los nombre), así un modelo recién creado aparece enseguida.
 * @param {object[]} models filas de catalog_models
 * @param {object[]} variants filas de products
 * @param {{ search?: string, category?: string, visibility?: 'Todos'|'Activos'|'Ocultos', stockOnly?: boolean }} filters
 * @param {{ conditions?: string[], colors?: string[] }} order
 */
export function groupInventory(models, variants, filters = {}, order = {}) {
  const { search = '', category = 'Todas', visibility = 'Todos', stockOnly = false } = filters;
  const tokens = tokenize(search);
  const byModel = groupBy(variants, (v) => v.model_id);
  const sortVariants = compareVariants(order);

  const lines = new Map();
  models.forEach((model) => {
    if (category !== 'Todas' && model.type_name !== category) return;
    const own = byModel.get(model.id) || [];
    const modelHit = matchesAll(modelHaystack(model), tokens);
    const kept = own.filter((v) => passesVisibility(visibility, isVariantVisible(v, model))
      && (!stockOnly || Number(v.stock) > 0)
      && (modelHit || matchesAll(`${modelHaystack(model)} ${variantHaystack(v)}`, tokens)));

    const showEmpty = own.length === 0 && modelHit && !stockOnly
      && passesVisibility(visibility, model.is_active !== false);
    if (kept.length === 0 && !showEmpty) return;

    const line = model.line || deriveLine(model.name, model.type_name);
    const key = `${model.type_name}::${line}`;
    if (!lines.has(key)) lines.set(key, { key, category: model.type_name, line, models: [] });
    const sorted = [...kept].sort(sortVariants);
    lines.get(key).models.push({
      ...model,
      variants: sorted,
      variantCount: sorted.length,
      stockTotal: sumStock(sorted),
      priceFromArs: minPrice(sorted, 'price_ars'),
      priceFromUsd: minPrice(sorted, 'price_usd'),
    });
  });

  return [...lines.values()]
    .map((l) => ({
      ...l,
      models: [...l.models].sort(compareModels),
      stockTotal: l.models.reduce((acc, m) => acc + m.stockTotal, 0),
    }))
    .sort((a, b) => compareRank(categoryRank(a.category), categoryRank(b.category))
      || collator.compare(b.line, a.line));
}

function groupBy(list, keyOf) {
  const map = new Map();
  list.forEach((item) => {
    const key = keyOf(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return map;
}

/** Combinaciones para "Agregar varias": capacidades × colores con un estado. */
export function variantMatrix({ capacities = [], colors = [], condition = '' }) {
  const caps = capacities.length ? capacities : [null];
  const cols = colors.length ? colors : [null];
  return caps.flatMap((capacity) => cols.map((color) => ({ capacity, color, condition: condition || null })));
}

const uniqueValues = (variants, key, sortFn) => [...new Set(variants.map((v) => v[key]).filter(Boolean))].sort(sortFn);

const OPTION_SORT = {
  capacity: (a, b) => compareRank(capacitySize(a), capacitySize(b)) || collator.compare(a, b),
  color: (a, b) => collator.compare(a, b),
  condition: (a, b) => collator.compare(a, b),
};

/** Valores de cada atributo presentes en estas variantes, ordenados. */
export function optionsOf(variants) {
  return Object.fromEntries(VARIANT_KEYS.map((k) => [k, uniqueValues(variants, k, OPTION_SORT[k])]));
}

/**
 * Modelos para la tienda: activos y con al menos una variante activa.
 * Cada uno trae sus variantes ordenadas, precio "desde" y opciones por atributo.
 */
export function storefrontModels(models, variants, order = {}) {
  const byModel = groupBy(variants.filter((v) => v.is_active), (v) => v.model_id);
  return models
    .filter((m) => m.is_active !== false && byModel.has(m.id))
    .map((m) => {
      const own = [...byModel.get(m.id)].sort(compareVariants(order));
      return {
        ...m,
        line: m.line || deriveLine(m.name, m.type_name),
        variants: own,
        image_url: m.image_url || own.find((v) => v.image_url)?.image_url || null,
        priceFromArs: minPrice(own, 'price_ars'),
        priceFromUsd: minPrice(own, 'price_usd'),
        stockTotal: sumStock(own),
        options: optionsOf(own),
      };
    })
    .sort((a, b) => compareRank(categoryRank(a.type_name), categoryRank(b.type_name))
      || collator.compare(b.line, a.line)
      || compareModels(a, b));
}

/** Órdenes del catálogo de la tienda; "featured" es el de storefrontModels. */
export const STORE_SORTS = {
  featured: 'Destacados',
  priceAsc: 'Menor precio',
  priceDesc: 'Mayor precio',
};

// Precio "desde" en ARS; si el modelo solo tiene USD, convertido con la cotización
const storePrice = (m, rate) => {
  if (m.priceFromArs) return m.priceFromArs;
  if (m.priceFromUsd && rate > 0) return m.priceFromUsd * rate;
  return null;
};

/** Ordena modelos de la tienda por precio. Sin precio van al final; los empates conservan el orden recibido. */
export function sortStoreModels(models, sort, rate) {
  if (sort !== 'priceAsc' && sort !== 'priceDesc') return models;
  const dir = sort === 'priceAsc' ? 1 : -1;
  return [...models].sort((a, b) => {
    const pa = storePrice(a, rate);
    const pb = storePrice(b, rate);
    if (pa == null || pb == null) return compareRank(pa == null, pb == null);
    return compareRank(pa, pb) * dir;
  });
}

/** Foto de una variante: la propia si tiene, si no la del modelo. */
export const variantImage = (variant, model) => variant?.image_url || model?.image_url || null;

// undefined = cualquier valor; null = la variante no tiene ese atributo
const matchesKey = (v, key, value) => value === undefined || (v[key] || null) === (value || null);

const hasStock = (v) => Number(v.stock) > 0;

/** Variantes que coinciden con la selección: primero las que tienen stock, después la más barata. */
export function matchVariants(variants, selection) {
  return variants
    .filter((v) => VARIANT_KEYS.every((k) => matchesKey(v, k, selection[k])))
    .sort((a, b) => compareRank(hasStock(b), hasStock(a))
      || compareRank(priceOrInfinity(a, 'price_ars'), priceOrInfinity(b, 'price_ars'))
      || compareRank(priceOrInfinity(a, 'price_usd'), priceOrInfinity(b, 'price_usd')));
}

/** Para cada atributo, los valores que existen combinados con el resto de la selección. */
export function availableOptions(variants, selection) {
  return Object.fromEntries(VARIANT_KEYS.map((key) => {
    const others = Object.fromEntries(VARIANT_KEYS.filter((k) => k !== key).map((k) => [k, selection[k]]));
    return [key, uniqueValues(matchVariants(variants, others), key, OPTION_SORT[key])];
  }));
}

export const selectionOf = (variant) => Object.fromEntries(VARIANT_KEYS.map((k) => [k, variant?.[k] || null]));

/**
 * Elegir un valor: si la combinación no existe, salta a la variante con ese
 * valor que más atributos comparte con la selección actual (la más barata si empatan).
 */
export function selectOption(variants, selection, key, value) {
  const wanted = { ...selection, [key]: value };
  if (matchVariants(variants, wanted).length) return wanted;
  const score = (v) => VARIANT_KEYS.filter((k) => k !== key && (v[k] || null) === (selection[k] || null)).length;
  const candidates = matchVariants(variants, { [key]: value });
  if (!candidates.length) return selection;
  const best = candidates.reduce((top, v) => (score(v) > score(top) ? v : top), candidates[0]);
  return selectionOf(best);
}
