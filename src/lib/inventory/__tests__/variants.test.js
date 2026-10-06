import { describe, expect, test } from 'vitest';
import {
  availableOptions,
  buildVariantName,
  capacitySize,
  deriveLine,
  groupInventory,
  matchVariants,
  selectOption,
  sortStoreModels,
  storefrontModels,
  variantMatrix,
} from '../variants';

const model = (over) => ({ id: 'm1', type_name: 'iPhone', name: 'iPhone 15 Pro', line: 'iPhone 15', is_active: true, sort_order: 100, ...over });
const variant = (over) => ({ id: 'v1', model_id: 'm1', capacity: '128GB', color: null, condition: 'Nuevo sellado', stock: 1, price_ars: 1000, price_usd: 1, is_active: true, ...over });

describe('deriveLine', () => {
  test('groups iPhone Pro / Pro Max / Plus / mini under the number', () => {
    expect(deriveLine('iPhone 15 Pro Max', 'iPhone')).toBe('iPhone 15');
    expect(deriveLine('iPhone 15 Pro', 'iPhone')).toBe('iPhone 15');
    expect(deriveLine('iPhone 14 Plus', 'iPhone')).toBe('iPhone 14');
    expect(deriveLine('iPhone 13 mini', 'iPhone')).toBe('iPhone 13');
    expect(deriveLine('iPhone 15', 'iPhone')).toBe('iPhone 15');
  });

  test('keeps the full name for other types', () => {
    expect(deriveLine('MacBook Pro 14 M1 Pro', 'Mac')).toBe('MacBook Pro 14 M1 Pro');
  });
});

describe('buildVariantName', () => {
  test('joins model, capacity, color and condition', () => {
    const name = buildVariantName('iPhone 15 Pro Max', { capacity: '256GB', color: 'Titanio natural', condition: 'Usado — Excelente' });
    expect(name).toBe('iPhone 15 Pro Max 256GB Titanio natural (Usado — Excelente)');
  });

  test('skips empty attributes', () => {
    expect(buildVariantName('AirPods Pro 2', { capacity: '', color: null, condition: '' })).toBe('AirPods Pro 2');
  });
});

describe('capacitySize', () => {
  test('orders TB above GB and unknown values last', () => {
    expect(capacitySize('1TB')).toBeGreaterThan(capacitySize('512GB'));
    expect(capacitySize('64GB')).toBeLessThan(capacitySize('128GB'));
    expect(capacitySize(null)).toBe(Infinity);
  });
});

describe('groupInventory', () => {
  const models = [
    model({ id: 'm1', name: 'iPhone 15 Pro', line: 'iPhone 15' }),
    model({ id: 'm2', name: 'iPhone 15', line: 'iPhone 15', sort_order: 10 }),
    model({ id: 'm3', name: 'iPhone 13', line: 'iPhone 13' }),
    model({ id: 'm4', type_name: 'Mac', name: 'MacBook Air M2', line: 'MacBook Air M2' }),
  ];
  const variants = [
    variant({ id: 'a', model_id: 'm1', capacity: '256GB', stock: 2, price_ars: 2000 }),
    variant({ id: 'b', model_id: 'm1', capacity: '128GB', stock: 3, price_ars: 1500 }),
    variant({ id: 'c', model_id: 'm2', stock: 0, is_active: false }),
    variant({ id: 'd', model_id: 'm4', capacity: null, stock: 1 }),
  ];

  test('groups by category and line, newest line first, with totals', () => {
    const lines = groupInventory(models, variants);
    expect(lines.map((l) => l.line)).toEqual(['iPhone 15', 'iPhone 13', 'MacBook Air M2']);
    const [i15] = lines;
    expect(i15.models.map((m) => m.id)).toEqual(['m2', 'm1']);
    expect(i15.stockTotal).toBe(5);
    const pro = i15.models[1];
    expect(pro.variants.map((v) => v.id)).toEqual(['b', 'a']);
    expect(pro.stockTotal).toBe(5);
    expect(pro.priceFromArs).toBe(1500);
  });

  test('keeps models without variants so a new model is visible', () => {
    const lines = groupInventory(models, variants);
    const i13 = lines.find((l) => l.line === 'iPhone 13');
    expect(i13.models[0].variants).toEqual([]);
  });

  test('stockOnly drops empty models and variants without stock', () => {
    const lines = groupInventory(models, variants, { stockOnly: true });
    expect(lines.map((l) => l.line)).toEqual(['iPhone 15', 'MacBook Air M2']);
    expect(lines[0].models.map((m) => m.id)).toEqual(['m1']);
  });

  test('visibility filter treats a hidden model as hiding its variants', () => {
    const hidden = models.map((m) => (m.id === 'm4' ? { ...m, is_active: false } : m));
    const lines = groupInventory(hidden, variants, { visibility: 'Ocultos' });
    expect(lines.flatMap((l) => l.models.flatMap((m) => m.variants.map((v) => v.id)))).toEqual(['c', 'd']);
  });

  test('search matches the model name and returns all its variants', () => {
    const lines = groupInventory(models, variants, { search: '15 pro' });
    expect(lines).toHaveLength(1);
    expect(lines[0].models[0].variants).toHaveLength(2);
  });

  test('search on a variant attribute returns only matching variants', () => {
    const lines = groupInventory(models, variants, { search: '256' });
    expect(lines).toHaveLength(1);
    expect(lines[0].models[0].variants.map((v) => v.id)).toEqual(['a']);
  });

  test('category filter keeps only that type', () => {
    const lines = groupInventory(models, variants, { category: 'Mac' });
    expect(lines.map((l) => l.line)).toEqual(['MacBook Air M2']);
  });
});

describe('variantMatrix', () => {
  test('crosses capacities and colors with one condition', () => {
    const combos = variantMatrix({ capacities: ['128GB', '256GB'], colors: ['Negro', 'Blanco'], condition: 'Nuevo sellado' });
    expect(combos).toHaveLength(4);
    expect(combos[0]).toEqual({ capacity: '128GB', color: 'Negro', condition: 'Nuevo sellado' });
  });

  test('an empty list does not cancel the other one', () => {
    expect(variantMatrix({ capacities: ['128GB'], colors: [], condition: '' })).toEqual([
      { capacity: '128GB', color: null, condition: null },
    ]);
  });
});

describe('storefront', () => {
  const models = [
    model({ id: 'm1', image_url: 'pro.png' }),
    model({ id: 'm2', name: 'iPhone 15', is_active: false }),
    model({ id: 'm3', name: 'iPhone 14' }),
  ];
  const variants = [
    variant({ id: 'a', model_id: 'm1', capacity: '256GB', color: 'Negro', price_ars: 2000 }),
    variant({ id: 'b', model_id: 'm1', capacity: '128GB', color: 'Blanco', price_ars: 1500 }),
    variant({ id: 'c', model_id: 'm1', capacity: '128GB', color: 'Negro', price_ars: 1600, image_url: 'real.png' }),
    variant({ id: 'd', model_id: 'm2' }),
    variant({ id: 'e', model_id: 'm3', is_active: false }),
  ];

  test('only active models with at least one active variant', () => {
    const list = storefrontModels(models, variants);
    expect(list.map((m) => m.id)).toEqual(['m1']);
    expect(list[0].priceFromArs).toBe(1500);
    expect(list[0].options.capacity).toEqual(['128GB', '256GB']);
    expect(list[0].options.color).toEqual(['Blanco', 'Negro']);
    expect(list[0].options.condition).toEqual(['Nuevo sellado']);
  });

  test('availableOptions disables combinations that do not exist', () => {
    const [m] = storefrontModels(models, variants);
    const opts = availableOptions(m.variants, { capacity: '256GB', color: 'Negro', condition: 'Nuevo sellado' });
    expect(opts.color).toEqual(['Negro']);
    expect(opts.capacity).toEqual(['128GB', '256GB']);
  });

  test('selectOption jumps to an existing variant when the combo is invalid', () => {
    const [m] = storefrontModels(models, variants);
    const next = selectOption(m.variants, { capacity: '128GB', color: 'Blanco', condition: 'Nuevo sellado' }, 'capacity', '256GB');
    expect(next).toEqual({ capacity: '256GB', color: 'Negro', condition: 'Nuevo sellado' });
    expect(matchVariants(m.variants, next).map((v) => v.id)).toEqual(['a']);
  });

  test('matchVariants returns the cheapest first', () => {
    const [m] = storefrontModels(models, variants);
    const found = matchVariants(m.variants, { capacity: '128GB' });
    expect(found.map((v) => v.id)).toEqual(['b', 'c']);
  });

  test('matchVariants puts in-stock units before a cheaper one without stock', () => {
    const twins = [
      variant({ id: 'cheap', battery_health: 85, price_ars: 900, stock: 0 }),
      variant({ id: 'stocked', battery_health: 95, price_ars: 1100, stock: 1 }),
    ];
    expect(matchVariants(twins, { capacity: '128GB' }).map((v) => v.id)).toEqual(['stocked', 'cheap']);
  });
});

describe('sortStoreModels', () => {
  const m = (id, priceFromArs, priceFromUsd = null) => ({ id, priceFromArs, priceFromUsd });
  const ids = (list) => list.map((x) => x.id);
  const list = [m('b', 2000), m('none', null), m('a', 1000), m('c', 3000)];

  test('featured keeps the incoming order', () => {
    expect(sortStoreModels(list, 'featured', 1000)).toBe(list);
  });

  test('sorts ascending and descending, models without price last', () => {
    expect(ids(sortStoreModels(list, 'priceAsc', 1000))).toEqual(['a', 'b', 'c', 'none']);
    expect(ids(sortStoreModels(list, 'priceDesc', 1000))).toEqual(['c', 'b', 'a', 'none']);
  });

  test('converts USD-only models with the exchange rate', () => {
    const mixed = [m('ars', 1500), m('usd', null, 2)];
    expect(ids(sortStoreModels(mixed, 'priceAsc', 1000))).toEqual(['ars', 'usd']);
    expect(ids(sortStoreModels(mixed, 'priceAsc', 500))).toEqual(['usd', 'ars']);
  });

  test('USD-only models without a rate count as without price', () => {
    expect(ids(sortStoreModels([m('usd', null, 2), m('ars', 1500)], 'priceAsc', 0))).toEqual(['ars', 'usd']);
  });

  test('ties keep the featured order and the input is not mutated', () => {
    const tied = [m('x', 1000), m('y', 1000), m('z', 500)];
    expect(ids(sortStoreModels(tied, 'priceAsc', 1000))).toEqual(['z', 'x', 'y']);
    expect(ids(tied)).toEqual(['x', 'y', 'z']);
  });
});
