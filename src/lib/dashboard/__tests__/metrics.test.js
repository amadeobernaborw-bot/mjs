import { describe, expect, test } from 'vitest';
import {
  averageTicket, bestClientOfMonth, buildDays, byCategory, byPaymentMethod, cashBalance, cashSeries, cashTotals,
  categoryOf, categorySeries, installmentsDueSummary, installmentsPaidSummary, invoiceSeries, pendingTotals,
  purchases, salesVsPurchasesSeries, stockByCategory, stockCoverage, stockSummary, topClients, topProducts,
  topStock, unitsByProduct, unitsSold,
} from '../metrics';

const NOW = new Date(2026, 9, 4, 15, 0, 0); // 4 de octubre de 2026

const invoices = [
  { id: 1, client_id: 'c1', status: 'aprobado', total_ars: 1000, created_at: new Date(2026, 9, 3, 10).toISOString(),
    items: [{ name: 'iPhone 15', qty: 1, price_ars: 1000 }] },
  { id: 2, client_id: 'c2', status: 'aprobado', total_ars: 3000, created_at: new Date(2026, 9, 4, 9).toISOString(),
    items: [{ name: 'MacBook Air', qty: 1, price_ars: 2500 }, { name: 'Cable USB-C', qty: 2, price_ars: 250 }] },
  { id: 3, client_id: 'c1', status: 'pendiente', total_ars: 500, created_at: new Date(2026, 9, 4, 11).toISOString(),
    items: [{ name: 'iPhone 15', qty: 3, price_ars: 500 }] },
  { id: 4, client_id: 'c3', status: 'cancelado', total_ars: 9000, created_at: new Date(2026, 8, 1).toISOString(),
    items: [{ name: 'iPad Pro', qty: 9, price_ars: 1000 }] },
  { id: 5, client_id: 'c3', status: 'aprobado', total_ars: 8000, created_at: new Date(2026, 8, 20).toISOString(),
    items: [{ name: 'Apple Watch', qty: 1, price_ars: 8000 }] },
];

describe('categories', () => {
  test('classifies products by name', () => {
    expect(categoryOf('iPhone 15 Pro')).toBe('iPhone');
    expect(categoryOf('MacBook Air')).toBe('Mac');
    expect(categoryOf('iPad mini')).toBe('iPad');
    expect(categoryOf('Apple Watch S9')).toBe('Watch');
    expect(categoryOf('AirPods Pro')).toBe('AirPods');
    expect(categoryOf('Funda MagSafe')).toBe('Accesorios');
    expect(categoryOf('Vision Pro')).toBe('Otros');
    expect(categoryOf(undefined)).toBe('Otros');
  });

  test('sums only approved invoices, ordered by total', () => {
    expect(categorySeries(invoices)).toEqual([
      { name: 'Watch', value: 8000 },
      { name: 'Mac', value: 2500 },
      { name: 'iPhone', value: 1000 },
      { name: 'Accesorios', value: 500 },
    ]);
  });
});

describe('daily series', () => {
  const days = buildDays(2, NOW);

  test('buildDays returns midnight dates ending today', () => {
    expect(days).toHaveLength(2);
    expect(days[1].getDate()).toBe(4);
    expect(days[1].getHours()).toBe(0);
  });

  test('invoiceSeries adds approved totals per day and counts every invoice', () => {
    const series = invoiceSeries(days, invoices);
    expect(series.map((d) => d.value)).toEqual([1000, 3000]);
    expect(series[1].count).toBe(2);
  });

  test('cashSeries and cashBalance', () => {
    const movements = [
      { type: 'entrada', amount: 500, occurred_at: new Date(2026, 9, 4, 8).toISOString() },
      { type: 'salida', amount: '200', occurred_at: new Date(2026, 9, 4, 9).toISOString() },
      { type: 'entrada', amount: 100, occurred_at: new Date(2026, 9, 3, 9).toISOString() },
    ];
    const series = cashSeries(days, movements);
    expect(series[1]).toMatchObject({ entrada: 500, salida: 200, balance: 300 });
    expect(series[0].balance).toBe(100);
    expect(cashBalance(movements)).toBe(400);
  });
});

describe('rankings', () => {
  test('topProducts counts units and skips cancelled invoices', () => {
    expect(topProducts(invoices)).toEqual([
      { name: 'iPhone 15', value: 4 },
      { name: 'Cable USB-C', value: 2 },
      { name: 'MacBook Air', value: 1 },
      { name: 'Apple Watch', value: 1 },
    ]);
    expect(topProducts(invoices, 1)).toHaveLength(1);
  });

  test('topClients uses approved totals and the clients map', () => {
    expect(topClients(invoices, { c1: 'Ana', c2: 'Beto' })).toEqual([
      { name: '—', value: 8000 },
      { name: 'Beto', value: 3000 },
      { name: 'Ana', value: 1000 },
    ]);
  });

  test('bestClientOfMonth only looks at the current month', () => {
    expect(bestClientOfMonth(invoices, { c2: 'Beto' }, NOW)).toEqual({ id: 'c2', name: 'Beto', total: 3000 });
    expect(bestClientOfMonth([], {}, NOW)).toBeNull();
  });
});

describe('totals', () => {
  test('pendingTotals', () => {
    expect(pendingTotals(invoices)).toEqual({ count: 1, ars: 500 });
  });

  test('averageTicket is null without approved invoices', () => {
    expect(averageTicket([])).toBeNull();
    expect(averageTicket(invoices)).toEqual({ average: 4000, count: 3 });
  });
});

describe('finanzas', () => {
  const movements = [
    { type: 'entrada', category: 'Venta', amount: 1000, payment_method: 'Efectivo' },
    { type: 'entrada', category: 'Venta', amount: 500, payment_method: 'Transferencia' },
    { type: 'salida', category: 'Compra stock', amount: 700, payment_method: 'Transferencia' },
    { type: 'salida', category: 'Alquiler', amount: 300, payment_method: 'Efectivo' },
    { type: 'salida', category: null, amount: 100, payment_method: null },
  ];

  test('cashTotals gives the result and margin', () => {
    expect(cashTotals(movements)).toEqual({ entradas: 1500, salidas: 1100, resultado: 400, margin: 400 / 1500 });
    expect(cashTotals([{ type: 'salida', amount: 50 }])).toMatchObject({ resultado: -50, margin: null });
  });

  test('byCategory only counts the requested type', () => {
    expect(byCategory(movements, 'salida')).toEqual([
      { name: 'Compra stock', value: 700 },
      { name: 'Alquiler', value: 300 },
      { name: 'Sin categoría', value: 100 },
    ]);
    expect(byCategory(movements, 'entrada')).toEqual([{ name: 'Venta', value: 1500 }]);
  });

  test('byPaymentMethod splits in and out, ordered by volume', () => {
    expect(byPaymentMethod(movements)).toEqual([
      { name: 'Efectivo', entrada: 1000, salida: 300 },
      { name: 'Transferencia', entrada: 500, salida: 700 },
      { name: 'Sin especificar', entrada: 0, salida: 100 },
    ]);
  });

  test('purchases and salesVsPurchasesSeries', () => {
    const days = buildDays(1, NOW);
    const dated = movements.map((m) => ({ ...m, occurred_at: new Date(2026, 9, 4, 12).toISOString() }));
    expect(purchases(dated)).toHaveLength(1);
    const [today] = salesVsPurchasesSeries(days, invoices, dated);
    expect(today).toMatchObject({ entrada: 3000, salida: 700, value: 2300 });
  });
});

describe('unidades vendidas', () => {
  test('unitsSold and unitsByProduct skip cancelled invoices', () => {
    expect(unitsSold(invoices)).toBe(8);
    expect(unitsByProduct(invoices)['iPad Pro']).toBeUndefined();
  });
});

describe('inventario', () => {
  const products = [
    { id: 1, name: 'iPhone 15', category: 'iPhone', stock: 10, price_ars: 100, price_usd: 1 },
    { id: 2, name: 'MacBook Air', category: 'Mac', stock: 2, price_ars: 1000, price_usd: 10 },
    { id: 3, name: 'Funda', category: 'Accesorios', stock: 0, price_ars: 5, price_usd: null },
    { id: 4, name: 'AirPods', category: 'AirPods', stock: -3, price_ars: 50, price_usd: 1 },
  ];

  test('stockSummary ignores negative stock', () => {
    expect(stockSummary(products)).toEqual({ products: 4, units: 12, valueArs: 3000, valueUsd: 30 });
  });

  test('stockByCategory and topStock skip empty products', () => {
    expect(stockByCategory(products)).toEqual([{ name: 'iPhone', value: 10 }, { name: 'Mac', value: 2 }]);
    expect(topStock(products, 1)).toEqual([{ name: 'iPhone 15', value: 10 }]);
  });

  test('stockCoverage matches by name ignoring case and orders by urgency', () => {
    const sales = [
      { status: 'aprobado', items: [{ name: ' iphone 15 ', qty: 5 }, { name: 'MACBOOK AIR', qty: 2 }] },
      { status: 'cancelado', items: [{ name: 'Funda', qty: 9 }] },
    ];
    const rows = stockCoverage(products, sales, 10);
    expect(rows.map((r) => r.name).slice(0, 2)).toEqual(['MacBook Air', 'iPhone 15']);
    expect(rows[0]).toMatchObject({ name: 'MacBook Air', sold: 2, coverageDays: 10 });
    expect(rows[1]).toMatchObject({ name: 'iPhone 15', sold: 5, coverageDays: 20 });
    expect(rows.slice(2).every((r) => r.coverageDays === null)).toBe(true);
  });
});

describe('cuotas', () => {
  const installments = [
    { status: 'pagada', amount: 100, due_date: '2026-09-01' },
    { status: 'pagada', amount: 50, due_date: '2026-09-15' },
    { status: 'pendiente', amount: 200, due_date: '2026-10-04' },
    { status: 'pendiente', amount: 300, due_date: '2026-11-03' },
    { status: 'pendiente', amount: 400, due_date: '2026-11-04' },
    { status: 'pendiente', amount: 70, due_date: '2026-10-01' },
    { status: 'vencida', amount: 80, due_date: '2026-09-20' },
  ];

  test('installmentsPaidSummary', () => {
    expect(installmentsPaidSummary(installments)).toEqual({ count: 2, total: 150 });
  });

  test('installmentsDueSummary uses an inclusive 30-day window and separates overdue', () => {
    expect(installmentsDueSummary(installments, '2026-10-04', 30)).toEqual({
      upcomingCount: 2, upcomingTotal: 500, overdueCount: 2, overdueTotal: 150,
    });
  });
});
