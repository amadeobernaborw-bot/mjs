import { useMemo } from 'react';
import { FileCheck, FileClock, Package, Receipt, RefreshCw, TriangleAlert, Trophy, Users, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import StatCard from '@/components/ui/StatCard';
import { WidgetError } from '@/components/widgets/WidgetStates';
import { formatARS } from '../../../lib/format';
import {
  approvedTotal, averageTicket, bestClientOfMonth, cashBalance, pendingTotals,
} from '../../../lib/dashboard/metrics';
import {
  useCashMonth, useClients, useInvoices, useInvoicesInRange, useLowStock, useProductCounts, useTradeInCount,
} from '../../../hooks/dashboard/queries';
import { usePeriod } from '../PeriodContext';

/**
 * KPI genérico: muestra el StatCard con "…" mientras carga y un error con
 * reintento si alguna consulta falló. `build(data)` arma label/valor/delta.
 */
export function Kpi({ queries, build, ...props }) {
  // Error solo si no hay datos: un refetch fallido deja ver los datos anteriores
  const failed = queries.find((q) => q.isError && q.data === undefined);
  if (failed) {
    return (
      <Card size="sm" className="h-full justify-center">
        <WidgetError message="No se pudo cargar." onRetry={() => queries.forEach((q) => q.isError && q.refetch())} />
      </Card>
    );
  }
  const loading = queries.some((q) => q.data === undefined);
  const content = loading ? { value: '…', delta: 'Cargando…' } : build();
  return <div className="kpi-widget h-full"><StatCard compact {...props} {...content} /></div>;
}

export function KpiFacturasAprobadas() {
  const invoices = useInvoices();
  return (
    <Kpi
      queries={[invoices]} to="/admin/invoices" icon={FileCheck} label="Facturas aprobadas" tone="success"
      build={() => ({
        value: formatARS(approvedTotal(invoices.data)),
        delta: `${pendingTotals(invoices.data).count} pendientes`,
      })}
    />
  );
}

export function KpiFacturasPendientes() {
  const invoices = useInvoices();
  return (
    <Kpi
      queries={[invoices]} to="/admin/invoices" icon={FileClock} label="Facturas pendientes" tone="muted"
      build={() => {
        const pending = pendingTotals(invoices.data);
        return { value: formatARS(pending.ars), delta: `${pending.count} por cobrar` };
      }}
    />
  );
}

export function KpiSaldoMes() {
  const month = useCashMonth();
  const balance = month.data ? cashBalance(month.data) : 0;
  return (
    <Kpi
      queries={[month]} to="/admin/cash" icon={Wallet} label="Saldo del mes"
      tone={balance >= 0 ? 'success' : 'primary'}
      build={() => ({
        value: formatARS(balance),
        delta: balance >= 0 ? 'Balance positivo' : 'Balance negativo',
      })}
    />
  );
}

export function KpiProductosActivos() {
  const counts = useProductCounts();
  return (
    <Kpi
      queries={[counts]} to="/admin/inventory" icon={Package} label="Productos activos" tone="accent"
      build={() => ({ value: counts.data.active, delta: `de ${counts.data.total} totales` })}
    />
  );
}

export function KpiStockBajo() {
  const low = useLowStock();
  return (
    <Kpi
      queries={[low]} to="/admin/inventory" icon={TriangleAlert} label="Stock bajo" tone="accent"
      build={() => ({
        value: low.data.length,
        delta: low.data.slice(0, 2).map((p) => `${p.name} (${p.stock})`).join(' · ') || 'Todo OK',
      })}
    />
  );
}

export function KpiClientesTotal() {
  const clients = useClients();
  return (
    <Kpi
      queries={[clients]} to="/admin/clients" icon={Users} label="Clientes" tone="muted"
      build={() => ({ value: clients.data.length, delta: 'en el CRM' })}
    />
  );
}

export function KpiMejorCliente() {
  const invoices = useInvoices();
  const clients = useClients();
  const best = useMemo(
    () => (invoices.data && clients.data ? bestClientOfMonth(invoices.data, clients.map) : null),
    [invoices.data, clients.data, clients.map],
  );
  return (
    <Kpi
      queries={[invoices, clients]} to="/admin/clients" icon={Trophy} label="Mejor cliente del mes" tone="success"
      build={() => ({
        value: best ? best.name : '—',
        delta: best ? formatARS(best.total) : 'Sin ventas aún',
      })}
    />
  );
}

export function KpiModelosCanje() {
  const tradeIn = useTradeInCount();
  return (
    <Kpi
      queries={[tradeIn]} to="/admin/trade-in" icon={RefreshCw} label="Modelos de canje" tone="primary"
      build={() => ({ value: tradeIn.data, delta: 'activos' })}
    />
  );
}

export function KpiTicketPromedio() {
  const { period } = usePeriod();
  const invoices = useInvoicesInRange(period.days);
  return (
    <Kpi
      queries={[invoices]} to="/admin/invoices" icon={Receipt} label="Ticket promedio" tone="accent"
      build={() => {
        const ticket = averageTicket(invoices.data);
        return ticket
          ? { value: formatARS(ticket.average), delta: `${ticket.count} facturas · ${period.label.toLowerCase()}` }
          : { value: '—', delta: `Sin facturas aprobadas · ${period.label.toLowerCase()}` };
      }}
    />
  );
}
