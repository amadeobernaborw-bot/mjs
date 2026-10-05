/**
 * Cálculos del Inicio, sin React ni Supabase: reciben filas y devuelven series
 * listas para graficar. Mismas reglas que tenía Dashboard.jsx.
 */

export function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function startOfMonth(d) { const x = new Date(d); x.setDate(1); x.setHours(0, 0, 0, 0); return x; }
export function daysAgo(n, now = new Date()) { const d = new Date(now); d.setDate(d.getDate() - n); return startOfDay(d); }

/** Los últimos `count` días (incluido hoy) como fechas a las 00:00, del más viejo al más nuevo. */
export function buildDays(count, now = new Date()) {
  return Array.from({ length: count }, (_, i) => daysAgo(count - 1 - i, now));
}

function nextDay(d) { const n = new Date(d); n.setDate(n.getDate() + 1); return n; }
function amount(v) { return Number(v || 0); }

function inDay(rows, field, day) {
  const end = nextDay(day);
  return rows.filter((r) => { const t = new Date(r[field]); return t >= day && t < end; });
}

export function cashSeries(days, movements = []) {
  return days.map((date) => {
    const rows = inDay(movements, 'occurred_at', date);
    const entrada = rows.filter((m) => m.type === 'entrada').reduce((s, m) => s + amount(m.amount), 0);
    const salida = rows.filter((m) => m.type === 'salida').reduce((s, m) => s + amount(m.amount), 0);
    return { date, entrada, salida, balance: entrada - salida, value: entrada - salida };
  });
}

export function invoiceSeries(days, invoices = []) {
  return days.map((date) => {
    const rows = inDay(invoices, 'created_at', date);
    const aprobadas = rows.filter((i) => i.status === 'aprobado').reduce((s, i) => s + amount(i.total_ars), 0);
    return { date, value: aprobadas, entrada: aprobadas, salida: 0, count: rows.length };
  });
}

export function cashBalance(movements = []) {
  return movements.reduce((s, m) => {
    if (m.type === 'entrada') return s + amount(m.amount);
    if (m.type === 'salida') return s - amount(m.amount);
    return s;
  }, 0);
}

export function approvedTotal(invoices = []) {
  return invoices.filter((i) => i.status === 'aprobado').reduce((s, i) => s + amount(i.total_ars), 0);
}

export function pendingTotals(invoices = []) {
  const pending = invoices.filter((i) => i.status === 'pendiente');
  return { count: pending.length, ars: pending.reduce((s, i) => s + amount(i.total_ars), 0) };
}

/** Promedio facturado por factura aprobada; null si no hay ninguna. */
export function averageTicket(invoices = []) {
  const approved = invoices.filter((i) => i.status === 'aprobado');
  if (approved.length === 0) return null;
  return { average: approvedTotal(approved) / approved.length, count: approved.length };
}

function itemsOf(invoice) {
  return Array.isArray(invoice.items) ? invoice.items : [];
}

/** Unidades vendidas por nombre de producto (facturas no canceladas). */
export function unitsByProduct(invoices = []) {
  const counts = {};
  invoices.forEach((inv) => {
    if (inv.status === 'cancelado') return;
    itemsOf(inv).forEach((it) => {
      if (!it?.name) return;
      counts[it.name] = (counts[it.name] || 0) + (Number(it.qty) || 1);
    });
  });
  return counts;
}

export function unitsSold(invoices = []) {
  return Object.values(unitsByProduct(invoices)).reduce((s, n) => s + n, 0);
}

export function topProducts(invoices = [], limit = 5) {
  return Object.entries(unitsByProduct(invoices))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

function totalsByClient(invoices) {
  const sums = {};
  invoices.forEach((inv) => {
    if (inv.status !== 'aprobado' || !inv.client_id) return;
    sums[inv.client_id] = (sums[inv.client_id] || 0) + amount(inv.total_ars);
  });
  return sums;
}

export function topClients(invoices = [], clientsMap = {}, limit = 5) {
  return Object.entries(totalsByClient(invoices))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, total]) => ({ name: clientsMap[id] || '—', value: total }));
}

export function bestClientOfMonth(invoices = [], clientsMap = {}, now = new Date()) {
  const monthStart = startOfMonth(now);
  const sums = totalsByClient(invoices.filter((i) => new Date(i.created_at) >= monthStart));
  const bestId = Object.keys(sums).sort((a, b) => sums[b] - sums[a])[0];
  return bestId ? { id: bestId, name: clientsMap[bestId] || '—', total: sums[bestId] } : null;
}

const ACCESSORY_WORDS = ['cable', 'cargador', 'magsafe', 'funda', 'pencil'];

export function categoryOf(productName) {
  const name = (productName || '').toLowerCase();
  if (name.includes('iphone')) return 'iPhone';
  if (name.includes('mac')) return 'Mac';
  if (name.includes('ipad')) return 'iPad';
  if (name.includes('watch')) return 'Watch';
  if (name.includes('airpod')) return 'AirPods';
  if (ACCESSORY_WORDS.some((w) => name.includes(w))) return 'Accesorios';
  return 'Otros';
}

export function categorySeries(invoices = []) {
  const totals = {};
  invoices.forEach((inv) => {
    if (inv.status !== 'aprobado') return;
    itemsOf(inv).forEach((it) => {
      const cat = categoryOf(it?.name);
      totals[cat] = (totals[cat] || 0) + (Number(it?.qty) || 1) * (Number(it?.price_ars) || 0);
    });
  });
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ── Compras y finanzas (sobre cash_movements) ────────────────────────

/** Categoría de caja que se usa para las compras de mercadería. */
export const PURCHASE_CATEGORY = 'Compra stock';

/** Entradas, salidas y resultado (ganancia o pérdida). margin es null sin ingresos. */
export function cashTotals(movements = []) {
  const entradas = movements.filter((m) => m.type === 'entrada').reduce((s, m) => s + amount(m.amount), 0);
  const salidas = movements.filter((m) => m.type === 'salida').reduce((s, m) => s + amount(m.amount), 0);
  const resultado = entradas - salidas;
  return { entradas, salidas, resultado, margin: entradas > 0 ? resultado / entradas : null };
}

export function purchases(movements = []) {
  return movements.filter((m) => m.type === 'salida' && m.category === PURCHASE_CATEGORY);
}

/** Total por categoría de un tipo de movimiento, de mayor a menor. */
export function byCategory(movements = [], type = 'salida') {
  const totals = {};
  movements.forEach((m) => {
    if (m.type !== type) return;
    const name = m.category || 'Sin categoría';
    totals[name] = (totals[name] || 0) + amount(m.amount);
  });
  return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Entradas y salidas por medio de pago, ordenado por volumen total. */
export function byPaymentMethod(movements = []) {
  const rows = {};
  movements.forEach((m) => {
    const name = m.payment_method || 'Sin especificar';
    const row = rows[name] || { name, entrada: 0, salida: 0 };
    if (m.type === 'entrada') row.entrada += amount(m.amount);
    if (m.type === 'salida') row.salida += amount(m.amount);
    rows[name] = row;
  });
  return Object.values(rows).sort((a, b) => (b.entrada + b.salida) - (a.entrada + a.salida));
}

/** Serie diaria con ventas aprobadas (entrada) y compras de stock (salida), forma de BarChart. */
export function salesVsPurchasesSeries(days, invoices = [], movements = []) {
  const sales = invoiceSeries(days, invoices);
  const buys = cashSeries(days, purchases(movements));
  return days.map((date, i) => ({
    date,
    entrada: sales[i].value,
    salida: buys[i].salida,
    value: sales[i].value - buys[i].salida,
  }));
}

// ── Inventario (sobre products) ──────────────────────────────────────

const stockOf = (p) => Math.max(0, Number(p.stock) || 0);

export function stockSummary(products = []) {
  return products.reduce((acc, p) => {
    const units = stockOf(p);
    return {
      products: acc.products + 1,
      units: acc.units + units,
      valueArs: acc.valueArs + units * amount(p.price_ars),
      valueUsd: acc.valueUsd + units * amount(p.price_usd),
    };
  }, { products: 0, units: 0, valueArs: 0, valueUsd: 0 });
}

export function stockByCategory(products = []) {
  const totals = {};
  products.forEach((p) => {
    const units = stockOf(p);
    if (units === 0) return;
    const name = p.category || 'Otros';
    totals[name] = (totals[name] || 0) + units;
  });
  return Object.entries(totals).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

export function topStock(products = [], limit = 8) {
  return products
    .filter((p) => stockOf(p) > 0)
    .sort((a, b) => stockOf(b) - stockOf(a))
    .slice(0, limit)
    .map((p) => ({ name: p.name, value: stockOf(p) }));
}

const normalizeName = (name) => String(name || '').trim().toLowerCase();

/**
 * Cuántos días dura el stock de cada producto al ritmo de venta del período.
 * Las facturas guardan el nombre del ítem (no el id), así que se cruza por
 * nombre sin distinguir mayúsculas ni espacios de los bordes.
 * Orden: primero lo que se vende y dura menos; al final lo que no se vendió.
 */
export function stockCoverage(products = [], invoices = [], periodDays = 30) {
  const sold = {};
  Object.entries(unitsByProduct(invoices)).forEach(([name, qty]) => {
    const key = normalizeName(name);
    sold[key] = (sold[key] || 0) + qty;
  });
  const days = Math.max(1, periodDays);
  return products
    .map((p) => {
      const units = stockOf(p);
      const soldUnits = sold[normalizeName(p.name)] || 0;
      const perDay = soldUnits / days;
      return {
        id: p.id,
        name: p.name,
        stock: units,
        sold: soldUnits,
        coverageDays: perDay > 0 ? units / perDay : null,
      };
    })
    .sort((a, b) => {
      if (a.coverageDays == null && b.coverageDays == null) return b.stock - a.stock;
      if (a.coverageDays == null) return 1;
      if (b.coverageDays == null) return -1;
      return a.coverageDays - b.coverageDays;
    });
}

// ── Cuotas (sobre invoice_installments) ──────────────────────────────

export function installmentsPaidSummary(installments = []) {
  const paid = installments.filter((c) => c.status === 'pagada');
  return { count: paid.length, total: paid.reduce((s, c) => s + amount(c.amount), 0) };
}

/**
 * Cuotas abiertas: lo que vence entre hoy y `horizonDays` días, y las ya vencidas.
 * `today` es 'YYYY-MM-DD' local (las columnas due_date son date).
 */
export function installmentsDueSummary(installments = [], today, horizonDays = 30) {
  const [y, m, d] = today.split('-').map(Number);
  const limit = new Date(y, m - 1, d + horizonDays);
  const limitISO = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`;
  const open = installments.filter((c) => c.status === 'pendiente' || c.status === 'vencida');
  const overdue = open.filter((c) => c.status === 'vencida' || (c.due_date && c.due_date < today));
  const upcoming = open.filter((c) => c.status !== 'vencida' && c.due_date && c.due_date >= today && c.due_date <= limitISO);
  return {
    upcomingCount: upcoming.length,
    upcomingTotal: upcoming.reduce((s, c) => s + amount(c.amount), 0),
    overdueCount: overdue.length,
    overdueTotal: overdue.reduce((s, c) => s + amount(c.amount), 0),
  };
}
