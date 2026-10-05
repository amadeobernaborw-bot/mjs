import { describe, expect, test } from 'vitest';
import { allRows } from '../pagination';

function fakeTable(total, failAt = null) {
  const calls = [];
  const build = () => ({
    range: async (from, to) => {
      calls.push([from, to]);
      if (failAt === from) return { data: null, error: new Error('boom') };
      const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => ({ id: from + i }));
      return { data, error: null };
    },
  });
  return { build, calls };
}

describe('allRows', () => {
  test('reads every page until a short one', async () => {
    const { build, calls } = fakeTable(25);
    const result = await allRows(build, 10);
    expect(result).toHaveLength(25);
    expect(result.at(-1).id).toBe(24);
    expect(calls).toEqual([[0, 9], [10, 19], [20, 29]]);
  });

  test('an exact multiple needs one extra empty page', async () => {
    const { build, calls } = fakeTable(20);
    expect(await allRows(build, 10)).toHaveLength(20);
    expect(calls).toHaveLength(3);
  });

  test('propagates errors instead of returning partial data', async () => {
    const { build } = fakeTable(25, 10);
    await expect(allRows(build, 10)).rejects.toThrow('boom');
  });
});
