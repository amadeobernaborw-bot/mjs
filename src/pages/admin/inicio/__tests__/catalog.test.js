import { describe, expect, test } from 'vitest';
import { CATALOG, GROUPS } from '../catalog';
import { createRegistry } from '../../../../lib/widgets/registry';
import { overlaps } from '../../../../lib/widgets/layoutMath';
import { COLUMNS, FRAME_ROWS } from '../../../../lib/widgets/constants';

const registry = createRegistry(CATALOG.map((w) => ({ ...w, Component: () => null })));
const visible = registry.defaultLayout.filter((it) => it.enabled);

describe('catálogo de Inicio', () => {
  test('every widget belongs to a known group and has a description', () => {
    CATALOG.forEach((w) => {
      expect(GROUPS).toContain(w.group);
      expect(w.description.length).toBeGreaterThan(10);
    });
  });

  test('factory layout is not altered by the registry', () => {
    visible.forEach((it) => {
      const { defaults } = CATALOG.find((w) => w.id === it.widget_id);
      expect({ x: it.x, y: it.y, w: it.w, h: it.h }).toEqual(defaults);
    });
  });

  test('factory widgets fill the 8×8 frame with no gaps and no overlaps', () => {
    const covered = new Set();
    visible.forEach((it) => {
      for (let y = it.y; y < it.y + it.h; y += 1) {
        for (let x = it.x; x < it.x + it.w; x += 1) {
          if (y < FRAME_ROWS) covered.add(`${x},${y}`);
        }
      }
    });
    expect(covered.size).toBe(COLUMNS * FRAME_ROWS);
    const clash = visible.some((a, i) => visible.some((b, j) => i < j && overlaps(a, b)));
    expect(clash).toBe(false);
  });

  test('no widget crosses the bottom edge of the frame', () => {
    visible.forEach((it) => {
      const crosses = it.y < FRAME_ROWS && it.y + it.h > FRAME_ROWS;
      expect(crosses, it.widget_id).toBe(false);
    });
  });
});
