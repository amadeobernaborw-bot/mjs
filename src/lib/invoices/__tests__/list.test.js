import { describe, expect, test } from 'vitest';
import { DEFAULT_SORT, formatDocNumber, selectRows, withClientNames } from '../list';

const doc = (over) => ({ id: over.invoice_number, type: 'factura', status: 'pendiente', total_ars: 100, client_name: 'Ana', ...over });

const rows = [
  doc({ invoice_number: 2, total_ars: 300 }),
  doc({ invoice_number: 5, total_ars: 100, status: 'aprobado', client_name: 'José Pérez' }),
  doc({ invoice_number: 1, total_ars: 100 }),
  doc({ invoice_number: 3, type: 'presupuesto', client_name: 'Bruno' }),
  doc({ invoice_number: 4, total_ars: 300, client_name: null }),
];
const numbers = (list) => list.map((r) => r.invoice_number);

describe('formatDocNumber', () => {
  test('pads to six digits', () => {
    expect(formatDocNumber(12)).toBe('#000012');
    expect(formatDocNumber(null)).toBe('#000000');
  });
});

describe('withClientNames', () => {
  test('adds the client name and null when the client is missing', () => {
    const out = withClientNames([{ id: 'a', client_id: 'c1' }, { id: 'b', client_id: 'zz' }], [{ id: 'c1', name: 'Ana' }]);
    expect(out.map((r) => r.client_name)).toEqual(['Ana', null]);
  });
});

describe('selectRows', () => {
  test('keeps only the requested type, newest number first', () => {
    expect(numbers(selectRows(rows, { type: 'factura', sort: DEFAULT_SORT }))).toEqual([5, 4, 2, 1]);
    expect(numbers(selectRows(rows, { type: 'presupuesto', sort: DEFAULT_SORT }))).toEqual([3]);
  });

  test('without a chosen sort falls back to number descending', () => {
    expect(numbers(selectRows(rows, { type: 'factura', sort: null }))).toEqual([5, 4, 2, 1]);
  });

  test('sorting by number ascending', () => {
    expect(numbers(selectRows(rows, { type: 'factura', sort: { key: 'invoice_number', dir: 'asc' } }))).toEqual([1, 2, 4, 5]);
  });

  test('ties on another column are broken by number descending', () => {
    const out = selectRows(rows, { type: 'factura', sort: { key: 'total_ars', dir: 'asc' } });
    expect(numbers(out)).toEqual([5, 1, 4, 2]);
  });

  test('filters by status', () => {
    expect(numbers(selectRows(rows, { type: 'factura', status: 'aprobado' }))).toEqual([5]);
    expect(numbers(selectRows(rows, { type: 'factura', status: 'Todos' }))).toHaveLength(4);
  });

  test('searches the client name ignoring case and accents', () => {
    expect(numbers(selectRows(rows, { type: 'factura', query: 'jose' }))).toEqual([5]);
    expect(numbers(selectRows(rows, { type: 'factura', query: '  PÉREZ ' }))).toEqual([5]);
    expect(selectRows(rows, { type: 'factura', query: 'nadie' })).toEqual([]);
  });

  test('does not mutate the input', () => {
    const copy = rows.map((r) => ({ ...r }));
    selectRows(rows, { type: 'factura', sort: DEFAULT_SORT });
    expect(rows).toEqual(copy);
  });
});
