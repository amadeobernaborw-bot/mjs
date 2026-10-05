/**
 * Consultas del Inicio con TanStack Query. Cada widget llama al hook que
 * necesita; los que comparten clave comparten la misma petición y caché.
 * Los errores de Supabase se propagan (no se tragan) para que el widget
 * pueda distinguir "error" de "sin datos".
 */
import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, TABLES } from '../../lib/supabase';
import { PURCHASE_CATEGORY, daysAgo, startOfMonth } from '../../lib/dashboard/metrics';
import { todayLocalISO } from '../../lib/format';
import { allRows } from '../../lib/pagination';

export const dashKeys = {
  all: ['dash'],
  invoices: ['dash', 'invoices'],
  invoicesRange: (days) => ['dash', 'invoices-range', days],
  latestInvoices: (limit) => ['dash', 'invoices-latest', limit],
  cash: (days) => ['dash', 'cash', days],
  cashMonth: ['dash', 'cash-month'],
  productCounts: ['dash', 'product-counts'],
  lowStock: ['dash', 'low-stock'],
  clients: ['dash', 'clients'],
  tradeIn: ['dash', 'trade-in-count'],
  debts: ['dash', 'debts'],
  agenda: ['dash', 'agenda'],
  agendaNotes: (view) => ['dash', 'agenda', 'notes', view],
  agendaDoneCount: ['dash', 'agenda', 'done-count'],
  leads: ['dash', 'leads-new'],
  productsStock: ['dash', 'products-stock'],
  installmentsPaid: (days) => ['dash', 'installments-paid', days],
  installmentsOpen: ['dash', 'installments-open'],
  recentPurchases: (limit) => ['dash', 'purchases-recent', limit],
};

export const LOW_STOCK_THRESHOLD = 3;

async function rows(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data || [];
}

const sinceISO = (days) => daysAgo(days - 1).toISOString();

/** Todas las facturas (KPIs históricos, rankings y categorías). */
export function useInvoices() {
  return useQuery({
    queryKey: dashKeys.invoices,
    queryFn: () => allRows(() => supabase.from(TABLES.invoices)
      .select('id, client_id, items, total_ars, status, created_at')
      .order('id')),
  });
}

export function useInvoicesInRange(days) {
  return useQuery({
    queryKey: dashKeys.invoicesRange(days),
    queryFn: () => {
      const since = sinceISO(days);
      return allRows(() => supabase.from(TABLES.invoices)
        .select('id, client_id, items, total_ars, status, created_at')
        .gte('created_at', since)
        .order('id'));
    },
  });
}

export function useLatestInvoices(limit = 8) {
  return useQuery({
    queryKey: dashKeys.latestInvoices(limit),
    queryFn: () => rows(
      supabase.from(TABLES.invoices)
        .select('id, invoice_number, client_id, type, total_ars, status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
  });
}

export function useCashMovements(days) {
  return useQuery({
    queryKey: dashKeys.cash(days),
    queryFn: () => {
      const since = sinceISO(days);
      return allRows(() => supabase.from(TABLES.cashMovements)
        .select('id, type, amount, occurred_at, category, payment_method')
        .gte('occurred_at', since)
        .order('id'));
    },
  });
}

export function useCashMonth() {
  return useQuery({
    queryKey: dashKeys.cashMonth,
    queryFn: () => {
      const since = startOfMonth(new Date()).toISOString();
      return allRows(() => supabase.from(TABLES.cashMovements)
        .select('id, type, amount')
        .gte('occurred_at', since)
        .order('id'));
    },
  });
}

export function useProductCounts() {
  return useQuery({
    queryKey: dashKeys.productCounts,
    queryFn: async () => {
      const [total, active] = await Promise.all([
        count(supabase.from(TABLES.products).select('*', { count: 'exact', head: true })),
        count(supabase.from(TABLES.products).select('*', { count: 'exact', head: true }).eq('is_active', true)),
      ]);
      return { total, active };
    },
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: dashKeys.lowStock,
    queryFn: () => allRows(() => supabase.from(TABLES.products)
      .select('id, name, category, stock')
      .lte('stock', LOW_STOCK_THRESHOLD)
      .eq('is_active', true)
      .order('stock', { ascending: true })
      .order('id')),
  });
}

/** Clientes como lista y como mapa id → nombre. */
export function useClients() {
  const query = useQuery({
    queryKey: dashKeys.clients,
    queryFn: () => allRows(() => supabase.from(TABLES.clients).select('id, name').order('name').order('id')),
  });
  const map = useMemo(
    () => Object.fromEntries((query.data || []).map((c) => [c.id, c.name])),
    [query.data],
  );
  return { ...query, map };
}

export function useTradeInCount() {
  return useQuery({
    queryKey: dashKeys.tradeIn,
    queryFn: () => count(supabase.from(TABLES.tradeIn).select('*', { count: 'exact', head: true }).eq('is_active', true)),
  });
}

/** Cuotas pendientes o vencidas agrupadas por cliente, de mayor a menor deuda. */
export function useDebts() {
  return useQuery({
    queryKey: dashKeys.debts,
    queryFn: async () => {
      const installments = await allRows(() => supabase.from(TABLES.invoiceInstallments)
        .select('id, amount, status, due_date, invoice_id, invoices(invoice_number, client_id, clients(name))')
        .in('status', ['pendiente', 'vencida'])
        .order('id'));
      const today = todayLocalISO();
      const byClient = new Map();
      installments.forEach((c) => {
        const inv = c.invoices;
        const cid = inv?.client_id;
        if (!cid) return;
        const cur = byClient.get(cid) || {
          id: cid, name: inv?.clients?.name || '—', invoice_number: inv?.invoice_number,
          total: 0, overdue: 0, pending: 0, nextDue: null,
        };
        const overdue = c.status === 'vencida' || (c.due_date && c.due_date < today);
        const nextDue = c.due_date && (cur.nextDue == null || c.due_date < cur.nextDue) ? c.due_date : cur.nextDue;
        byClient.set(cid, {
          ...cur,
          total: cur.total + Number(c.amount || 0),
          overdue: cur.overdue + (overdue ? 1 : 0),
          pending: cur.pending + (overdue ? 0 : 1),
          nextDue,
        });
      });
      return [...byClient.values()].sort((a, b) => b.total - a.total);
    },
  });
}

export function useAgendaNotes(view) {
  const active = view === 'activas';
  return useQuery({
    queryKey: dashKeys.agendaNotes(view),
    queryFn: () => allRows(() => supabase.from(TABLES.clientNotes)
      .select('*')
      .eq('status', active ? 'pendiente' : 'hecha')
      .order(active ? 'remind_date' : 'updated_at', { ascending: active, nullsFirst: false })
      .order('id')),
  });
}

export function useAgendaDoneCount() {
  return useQuery({
    queryKey: dashKeys.agendaDoneCount,
    queryFn: () => count(supabase.from(TABLES.clientNotes).select('id', { count: 'exact', head: true }).eq('status', 'hecha')),
  });
}

/** Alta, cambio de estado y borrado de notas; refresca toda la agenda al terminar. */
export function useAgendaMutations() {
  const queryClient = useQueryClient();
  const onSettled = () => queryClient.invalidateQueries({ queryKey: dashKeys.agenda });
  const run = async (request) => {
    const { error } = await request;
    if (error) throw error;
  };

  const create = useMutation({
    mutationFn: (note) => run(supabase.from(TABLES.clientNotes).insert({ ...note, status: 'pendiente' })),
    onSettled,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }) => run(
      supabase.from(TABLES.clientNotes).update({ status, updated_at: new Date().toISOString() }).eq('id', id),
    ),
    onSettled,
  });
  const remove = useMutation({
    mutationFn: (id) => run(supabase.from(TABLES.clientNotes).delete().eq('id', id)),
    onSettled,
  });

  return { create, setStatus, remove };
}

export function useNewLeads(limit = 20) {
  return useQuery({
    queryKey: dashKeys.leads,
    queryFn: () => rows(
      supabase.from(TABLES.leads)
        .select('id, customer_name, phone_number, device_interest, created_at')
        .eq('status', 'nuevo')
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
  });
}

/** Productos activos con stock y precios (valor del stock, rankings y cobertura). */
export function useProductsStock() {
  return useQuery({
    queryKey: dashKeys.productsStock,
    queryFn: () => allRows(() => supabase.from(TABLES.products)
      .select('id, name, category, stock, price_ars, price_usd')
      .eq('is_active', true)
      .order('id')),
  });
}

/** Cuotas pagadas dentro del período. */
export function useInstallmentsPaid(days) {
  return useQuery({
    queryKey: dashKeys.installmentsPaid(days),
    queryFn: () => {
      const since = sinceISO(days);
      return allRows(() => supabase.from(TABLES.invoiceInstallments)
        .select('id, amount, status, due_date, paid_at')
        .eq('status', 'pagada')
        .gte('paid_at', since)
        .order('id'));
    },
  });
}

/** Cuotas sin cobrar (pendientes o vencidas). */
export function useOpenInstallments() {
  return useQuery({
    queryKey: dashKeys.installmentsOpen,
    queryFn: () => allRows(() => supabase.from(TABLES.invoiceInstallments)
      .select('id, amount, status, due_date')
      .in('status', ['pendiente', 'vencida'])
      .order('id')),
  });
}

/** Últimos movimientos de caja de compra de mercadería. */
export function useRecentPurchases(limit = 8) {
  return useQuery({
    queryKey: dashKeys.recentPurchases(limit),
    queryFn: () => rows(
      supabase.from(TABLES.cashMovements)
        .select('id, detail, amount, payment_method, occurred_at')
        .eq('type', 'salida')
        .eq('category', PURCHASE_CATEGORY)
        .order('occurred_at', { ascending: false })
        .limit(limit),
    ),
  });
}
