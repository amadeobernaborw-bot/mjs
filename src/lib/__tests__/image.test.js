import { describe, expect, test } from 'vitest';
import { centeredArea, matchesAspect } from '../image';

describe('matchesAspect', () => {
  test('accepts an area with the same proportion, allowing pixel rounding', () => {
    expect(matchesAspect({ x: 0, y: 0, width: 1000, height: 1000 }, 1)).toBe(true);
    expect(matchesAspect({ x: 0, y: 0, width: 1201, height: 900 }, 4 / 3)).toBe(true);
  });

  test('rejects crops saved with the previous 16:9 / 9:16 formats', () => {
    expect(matchesAspect({ x: 0, y: 0, width: 1600, height: 900 }, 1)).toBe(false);
    expect(matchesAspect({ x: 0, y: 0, width: 900, height: 1600 }, 4 / 3)).toBe(false);
  });

  test('rejects missing or degenerate areas', () => {
    expect(matchesAspect(null, 1)).toBe(false);
    expect(matchesAspect({ x: 0, y: 0, width: 0, height: 100 }, 1)).toBe(false);
  });

  test('centeredArea always matches its own aspect', () => {
    expect(matchesAspect(centeredArea(4000, 3000, 1), 1)).toBe(true);
    expect(matchesAspect(centeredArea(3000, 4000, 4 / 3), 4 / 3)).toBe(true);
  });
});
