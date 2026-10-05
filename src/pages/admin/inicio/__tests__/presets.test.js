import { describe, expect, test } from 'vitest';
import { CATALOG, GROUPS } from '../catalog';
import { INICIO_PRESETS } from '../presets';
import { createRegistry } from '../../../../lib/widgets/registry';
import { overlaps } from '../../../../lib/widgets/layoutMath';
import { COLUMNS, FRAME_ROWS } from '../../../../lib/widgets/constants';

const registry = createRegistry(CATALOG.map((w) => ({ ...w, Component: () => null })), { groups: GROUPS });

describe.each(INICIO_PRESETS.map((p) => [p.label, p]))('vista fija "%s"', (_label, preset) => {
  test('uses only catalog widgets, without repeating', () => {
    const ids = preset.items.map((it) => it.widget_id);
    ids.forEach((id) => expect(registry.widgetById.has(id), id).toBe(true));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('respects the size limits of every widget', () => {
    preset.items.forEach((it) => {
      const w = registry.widgetById.get(it.widget_id);
      expect(it.w, it.widget_id).toBeGreaterThanOrEqual(w.minW);
      expect(it.w, it.widget_id).toBeLessThanOrEqual(w.maxW);
      expect(it.h, it.widget_id).toBeGreaterThanOrEqual(w.minH);
      expect(it.h, it.widget_id).toBeLessThanOrEqual(w.maxH);
      expect(it.x + it.w, it.widget_id).toBeLessThanOrEqual(COLUMNS);
    });
  });

  test('the registry keeps the positions as written (no compaction surprises)', () => {
    const visible = registry.layoutFromPreset(preset.items).filter((it) => it.enabled);
    expect(visible).toHaveLength(preset.items.length);
    preset.items.forEach((it) => {
      const placed = visible.find((v) => v.widget_id === it.widget_id);
      expect({ x: placed.x, y: placed.y, w: placed.w, h: placed.h }).toEqual({ x: it.x, y: it.y, w: it.w, h: it.h });
    });
  });

  test('fills the 8×8 frame with no gaps, no overlaps and nothing crossing row 8', () => {
    const covered = new Set();
    preset.items.forEach((it) => {
      for (let y = it.y; y < Math.min(it.y + it.h, FRAME_ROWS); y += 1) {
        for (let x = it.x; x < it.x + it.w; x += 1) covered.add(`${x},${y}`);
      }
      const crosses = it.y < FRAME_ROWS && it.y + it.h > FRAME_ROWS;
      expect(crosses, it.widget_id).toBe(false);
    });
    expect(covered.size).toBe(COLUMNS * FRAME_ROWS);
    const clash = preset.items.some((a, i) => preset.items.some((b, j) => i < j && overlaps(a, b)));
    expect(clash).toBe(false);
  });
});

describe('catálogo y categorías', () => {
  test('the catalog follows the declared group order', () => {
    expect(registry.groups).toEqual(GROUPS);
  });

  test('preset ids are unique and none is the reserved "custom"', () => {
    const ids = INICIO_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain('custom');
  });
});
