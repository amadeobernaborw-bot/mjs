import { describe, expect, test } from 'vitest';
import {
  compact, computeRowHeight, deriveLayout, fromGridLayout, layoutsEqual, moveItem, overlaps, resizeItem,
} from '../layoutMath';
import { COLUMNS, FRAME_ROWS, KPI, MARGIN, MAX_ROW_HEIGHT, MIN_ROW_HEIGHT } from '../constants';

const item = (widget_id, x, y, w, h, enabled = true) => ({ widget_id, x, y, w, h, enabled, config: {} });

function hasOverlaps(items) {
  const visible = items.filter((it) => it.enabled);
  return visible.some((a, i) => visible.some((b, j) => i < j && overlaps(a, b)));
}

describe('computeRowHeight', () => {
  test('8 rows plus 7 margins fill the available height', () => {
    const rowHeight = computeRowHeight({ viewportHeight: 1000, frameTop: 200, bottomPadding: 24 });
    const used = rowHeight * FRAME_ROWS + MARGIN * (FRAME_ROWS - 1);
    expect(used).toBeLessThanOrEqual(1000 - 200 - 24);
    expect(1000 - 200 - 24 - used).toBeLessThan(FRAME_ROWS);
  });

  test('clamps to the minimum on short screens and to the maximum on tall ones', () => {
    expect(computeRowHeight({ viewportHeight: 500, frameTop: 300 })).toBe(MIN_ROW_HEIGHT);
    expect(computeRowHeight({ viewportHeight: 3000, frameTop: 100 })).toBe(MAX_ROW_HEIGHT);
  });
});

describe('compact', () => {
  test('moves visible items up and ignores hidden ones', () => {
    const out = compact([item('a', 0, 3, 2, 2), item('h', 0, 0, 8, 8, false)]);
    expect(out[0].y).toBe(0);
    expect(out[1]).toMatchObject({ y: 0, h: 8, enabled: false });
  });
});

describe('layoutsEqual', () => {
  test('does not depend on array order', () => {
    const a = [item('a', 0, 0, 2, 2), item('b', 2, 0, 2, 2)];
    expect(layoutsEqual(a, [...a].reverse())).toBe(true);
  });

  test('detects changes in position, visibility and config', () => {
    const a = [item('a', 0, 0, 2, 2)];
    expect(layoutsEqual(a, [item('a', 1, 0, 2, 2)])).toBe(false);
    expect(layoutsEqual(a, [item('a', 0, 0, 2, 2, false)])).toBe(false);
    expect(layoutsEqual(a, [{ ...a[0], config: { visual: 'bars' } }])).toBe(false);
  });
});

describe('moveItem', () => {
  const layout = [item('a', 0, 0, 2, 2), item('b', 0, 2, 2, 2), item('c', 6, 0, 2, 2)];

  test('clamps horizontal moves at the edges', () => {
    expect(moveItem(layout, 'a', -1, 0)).toBe(layout);
    expect(moveItem(layout, 'c', 1, 0)).toBe(layout);
  });

  test('moves right one column', () => {
    expect(moveItem(layout, 'a', 1, 0).find((it) => it.widget_id === 'a').x).toBe(1);
  });

  test('moving down swaps with the neighbour below', () => {
    const out = moveItem(layout, 'a', 0, 1);
    expect(out.find((it) => it.widget_id === 'b').y).toBe(0);
    expect(out.find((it) => it.widget_id === 'a').y).toBe(2);
    expect(hasOverlaps(out)).toBe(false);
  });

  test('moving up swaps with the neighbour above', () => {
    const out = moveItem(layout, 'b', 0, -1);
    expect(out.find((it) => it.widget_id === 'b').y).toBe(0);
    expect(out.find((it) => it.widget_id === 'a').y).toBe(2);
  });

  test('without a neighbour nothing changes', () => {
    expect(moveItem(layout, 'c', 0, 1)).toBe(layout);
  });
});

describe('resizeItem', () => {
  test('respects widget limits and the right border', () => {
    const layout = [item('a', 6, 0, 2, 3)];
    expect(resizeItem(layout, 'a', 1, 0, KPI)).toBe(layout);
    expect(resizeItem(layout, 'a', 0, 1, KPI)).toBe(layout);
    expect(resizeItem(layout, 'a', 0, -1, KPI)[0].h).toBe(2);
  });

  test('pushes neighbours down instead of overlapping', () => {
    const layout = [item('a', 0, 0, 2, 2), item('b', 2, 0, 2, 2)];
    const out = resizeItem(layout, 'a', 1, 0, KPI);
    expect(out[0].w).toBe(3);
    expect(hasOverlaps(out)).toBe(false);
  });
});

describe('deriveLayout', () => {
  const desktop = [
    item('a', 0, 0, 4, 3), item('b', 4, 0, 4, 3),
    item('c', 0, 3, 2, 2), item('d', 2, 3, 2, 2), item('e', 4, 3, 2, 2), item('f', 6, 3, 2, 2),
    item('hidden', 0, 0, 8, 2, false),
  ];

  test('4 columns: halves widths, keeps reading order and has no overlaps', () => {
    const out = deriveLayout(desktop, 4);
    expect(out.map((it) => it.widget_id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    expect(out.every((it) => it.x + it.w <= 4)).toBe(true);
    expect(hasOverlaps(out)).toBe(false);
  });

  test('1 column stacks everything', () => {
    const out = deriveLayout(desktop, 1);
    expect(out.every((it) => it.x === 0 && it.w === 1)).toBe(true);
    expect(hasOverlaps(out)).toBe(false);
  });

  test('desktop width returns only visible items untouched', () => {
    expect(deriveLayout(desktop, COLUMNS)).toHaveLength(6);
  });
});

describe('fromGridLayout', () => {
  test('updates visible items and keeps hidden ones as they were', () => {
    const items = [item('a', 0, 0, 2, 2), item('h', 3, 9, 2, 2, false)];
    const out = fromGridLayout([{ i: 'a', x: 4, y: 0, w: 3, h: 2 }], items);
    expect(out[0]).toMatchObject({ x: 4, w: 3 });
    expect(out[1]).toBe(items[1]);
  });
});
