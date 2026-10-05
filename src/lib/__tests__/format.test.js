import { describe, expect, test } from 'vitest';
import { formatDate, parseLocalDate, todayLocalISO } from '../format';

describe('fechas locales', () => {
  test('a date-only string is the same local day (not UTC midnight)', () => {
    const d = parseLocalDate('2026-10-04');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 9, 4, 0]);
    expect(formatDate('2026-10-04')).toBe('04/10/2026');
  });

  test('timestamps keep the normal Date parsing', () => {
    const iso = '2026-10-04T15:30:00.000Z';
    expect(parseLocalDate(iso).getTime()).toBe(new Date(iso).getTime());
  });

  test('todayLocalISO uses local components', () => {
    const now = new Date();
    const [y, m, d] = todayLocalISO().split('-').map(Number);
    expect([y, m, d]).toEqual([now.getFullYear(), now.getMonth() + 1, now.getDate()]);
  });
});
