import { describe, expect, test } from 'vitest';
import { createRegistry, visualOf } from '../registry';
import { KPI, SERIE } from '../constants';

const Dummy = () => null;

function widget(id, extra = {}) {
  return {
    id,
    title: id,
    description: '',
    group: 'Ventas',
    Component: Dummy,
    defaults: { x: 0, y: 0, w: 2, h: 2 },
    isDefault: true,
    ...KPI,
    ...extra,
  };
}

const catalog = [
  widget('a', { defaults: { x: 0, y: 0, w: 2, h: 2 } }),
  widget('b', { defaults: { x: 2, y: 0, w: 2, h: 2 } }),
  widget('chart', { ...SERIE, defaults: { x: 0, y: 2, w: 4, h: 3 }, visuals: ['line', 'bars'] }),
  widget('extra', { isDefault: false, defaults: { x: 0, y: 0, w: 3, h: 2 } }),
];

describe('createRegistry', () => {
  test('throws on duplicated or invalid ids', () => {
    expect(() => createRegistry([widget('a'), widget('a')])).toThrow(/repetido/);
    expect(() => createRegistry([widget('Bad-Id')])).toThrow(/inválido/);
  });

  test('default layout contains every widget, hidden ones disabled', () => {
    const reg = createRegistry(catalog);
    expect(reg.defaultLayout.map((it) => it.widget_id)).toEqual(['a', 'b', 'chart', 'extra']);
    expect(reg.defaultLayout.find((it) => it.widget_id === 'extra').enabled).toBe(false);
    expect(reg.groups).toEqual(['Ventas']);
  });
});

describe('mergeLayout', () => {
  const reg = createRegistry(catalog);

  test('returns the default layout when nothing was saved', () => {
    expect(reg.mergeLayout(null)).toBe(reg.defaultLayout);
  });

  test('an empty or fully unknown saved array falls back to the factory layout', () => {
    expect(reg.mergeLayout([])).toBe(reg.defaultLayout);
    expect(reg.mergeLayout([{ widget_id: 'old_one', x: 0, y: 0, w: 2, h: 2, enabled: true }])).toBe(reg.defaultLayout);
  });

  test('adds a new default widget at the bottom without touching saved positions', () => {
    const saved = [
      { widget_id: 'b', x: 0, y: 0, w: 2, h: 2, enabled: true, config: {} },
      { widget_id: 'a', x: 2, y: 0, w: 2, h: 2, enabled: true, config: {} },
      { widget_id: 'extra', x: 0, y: 0, w: 3, h: 2, enabled: false, config: {} },
    ];
    const merged = reg.mergeLayout(saved);
    const byId = Object.fromEntries(merged.map((it) => [it.widget_id, it]));
    expect(byId.b).toMatchObject({ x: 0, y: 0 });
    expect(byId.a).toMatchObject({ x: 2, y: 0 });
    expect(byId.chart).toMatchObject({ enabled: true, y: 2, w: 4, h: 3 });
  });

  test('a new non-default widget enters hidden', () => {
    const saved = [{ widget_id: 'a', x: 0, y: 0, w: 2, h: 2, enabled: true, config: {} }];
    const merged = reg.mergeLayout(saved);
    expect(merged.find((it) => it.widget_id === 'extra').enabled).toBe(false);
  });

  test('drops unknown ids and duplicates', () => {
    const saved = [
      { widget_id: 'ghost', x: 0, y: 0, w: 2, h: 2, enabled: true, config: {} },
      { widget_id: 'a', x: 0, y: 0, w: 2, h: 2, enabled: true, config: {} },
      { widget_id: 'a', x: 4, y: 4, w: 2, h: 2, enabled: true, config: {} },
    ];
    const merged = reg.mergeLayout(saved);
    expect(merged.some((it) => it.widget_id === 'ghost')).toBe(false);
    expect(merged.filter((it) => it.widget_id === 'a')).toHaveLength(1);
    expect(merged.find((it) => it.widget_id === 'a')).toMatchObject({ x: 0, y: 0 });
  });

  test('applies limits from the catalog, not from the saved row', () => {
    const saved = [
      { widget_id: 'a', x: 7, y: 0, w: 9, h: 40, enabled: true, config: {}, maxW: 99 },
    ];
    const a = reg.mergeLayout(saved).find((it) => it.widget_id === 'a');
    expect(a.w).toBe(KPI.maxW);
    expect(a.h).toBe(KPI.maxH);
    expect(a.x + a.w).toBeLessThanOrEqual(8);
    expect(a).not.toHaveProperty('maxW');
  });

  test('resolves overlaps coming from tampered data', () => {
    const saved = [
      { widget_id: 'a', x: 0, y: 0, w: 2, h: 2, enabled: true, config: {} },
      { widget_id: 'b', x: 1, y: 1, w: 2, h: 2, enabled: true, config: {} },
    ];
    const merged = reg.mergeLayout(saved);
    const a = merged.find((it) => it.widget_id === 'a');
    const b = merged.find((it) => it.widget_id === 'b');
    expect(b.y).toBeGreaterThanOrEqual(a.y + a.h);
  });

  test('a hidden widget keeps its position, size and config', () => {
    const saved = [
      { widget_id: 'chart', x: 4, y: 6, w: 4, h: 4, enabled: false, config: { visual: 'bars' } },
    ];
    const chart = reg.mergeLayout(saved).find((it) => it.widget_id === 'chart');
    expect(chart).toMatchObject({ x: 4, y: 6, w: 4, h: 4, enabled: false, config: { visual: 'bars' } });
  });

  test('drops a visual that the widget no longer supports', () => {
    const saved = [{ widget_id: 'chart', x: 0, y: 0, w: 4, h: 3, enabled: true, config: { visual: 'pie' } }];
    const chart = reg.mergeLayout(saved).find((it) => it.widget_id === 'chart');
    expect(chart.config).toEqual({});
    expect(visualOf(chart.config, reg.widgetById.get('chart'))).toBe('line');
  });
});

describe('layoutFromPreset', () => {
  const reg = createRegistry(catalog);

  test('only the listed widgets are visible, default ones are not added', () => {
    const layout = reg.layoutFromPreset([{ widget_id: 'extra', x: 0, y: 0, w: 3, h: 2 }]);
    expect(layout.filter((it) => it.enabled).map((it) => it.widget_id)).toEqual(['extra']);
    expect(layout).toHaveLength(catalog.length);
  });

  test('ignores unknown ids, clamps to catalog limits and keeps config', () => {
    const layout = reg.layoutFromPreset([
      { widget_id: 'ghost', x: 0, y: 0, w: 2, h: 2 },
      { widget_id: 'chart', x: 0, y: 0, w: 1, h: 30, config: { visual: 'bars' } },
    ]);
    const chart = layout.find((it) => it.widget_id === 'chart');
    expect(layout.some((it) => it.widget_id === 'ghost')).toBe(false);
    expect(chart).toMatchObject({ enabled: true, w: SERIE.minW, h: SERIE.maxH, config: { visual: 'bars' } });
  });
});

describe('group order', () => {
  test('follows options.groups and appends unlisted groups at the end', () => {
    const reg = createRegistry([widget('a', { group: 'B' }), widget('b', { group: 'A' }), widget('c', { group: 'Z' })], {
      groups: ['A', 'B', 'Missing'],
    });
    expect(reg.groups).toEqual(['A', 'B', 'Z']);
  });
});

describe('show / hide / positionForNew', () => {
  const reg = createRegistry(catalog);

  test('positionForNew places the widget below everything visible', () => {
    const pos = reg.positionForNew(reg.defaultLayout, reg.widgetById.get('extra'));
    expect(pos).toEqual({ x: 0, y: 5, w: 3, h: 2 });
  });

  test('showWidget keeps the size the hidden item had', () => {
    const layout = reg.defaultLayout.map((it) => (it.widget_id === 'extra' ? { ...it, w: 4, h: 3 } : it));
    const shown = reg.showWidget(layout, 'extra').find((it) => it.widget_id === 'extra');
    expect(shown).toMatchObject({ enabled: true, w: 4, h: 3 });
  });

  test('hideWidget compacts the rest upwards', () => {
    const hidden = reg.hideWidget(reg.defaultLayout, 'a');
    const chart = hidden.find((it) => it.widget_id === 'chart');
    expect(hidden.find((it) => it.widget_id === 'a').enabled).toBe(false);
    expect(chart.y).toBe(2); // 'b' still occupies rows 0-1 on columns 2-3, chart spans 0-3
  });

  test('updateConfig merges without mutating', () => {
    const before = reg.defaultLayout;
    const after = reg.updateConfig(before, 'chart', { visual: 'bars' });
    expect(after.find((it) => it.widget_id === 'chart').config).toEqual({ visual: 'bars' });
    expect(before.find((it) => it.widget_id === 'chart').config).toEqual({});
  });
});
