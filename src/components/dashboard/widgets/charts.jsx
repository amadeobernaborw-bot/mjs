import { useMemo } from 'react';
import { formatARS } from '../../../lib/format';
import {
  buildDays, cashSeries, categorySeries, invoiceSeries, topClients, topProducts,
} from '../../../lib/dashboard/metrics';
import { useCashMovements, useClients, useInvoices, useInvoicesInRange } from '../../../hooks/dashboard/queries';
import {
  QueryState, WidgetError, WidgetLoading, hasFailed, isWaiting,
} from '@/components/widgets/WidgetStates';
import { BarChart, HBarChart, Legend, LineChart, PieChart } from '../charts/Charts';
import { ChartPanel } from '../surfaces';
import { usePeriod } from '../PeriodContext';

const CASH_LEGEND = [{ color: 'var(--success)', label: 'Entradas' }, { color: 'var(--danger)', label: 'Salidas' }];

/** Serie diaria de caja para el período global. */
function useCashSeries() {
  const { period } = usePeriod();
  const query = useCashMovements(period.days);
  const series = useMemo(
    () => (query.data ? cashSeries(buildDays(period.days), query.data) : []),
    [query.data, period.days],
  );
  return { query, series, period };
}

export function GraficoCajaDiaria({ config }) {
  const { query, series, period } = useCashSeries();
  const visual = config.visual;
  return (
    <ChartPanel
      title="Caja diaria"
      subtitle={`Entradas vs salidas — ${period.label.toLowerCase()}`}
      legend={visual === 'bars' ? <Legend items={CASH_LEGEND} /> : <Legend items={[{ color: 'var(--chart-1)', label: 'Balance' }]} />}
    >
      <QueryState query={query}>
        {() => (visual === 'bars'
          ? <BarChart series={series} compact={period.days > 30} labelEvery={period.labelEvery} />
          : <LineChart series={series.map((d) => ({ ...d, value: d.balance }))} color="var(--chart-1)" labelEvery={period.labelEvery} />)}
      </QueryState>
    </ChartPanel>
  );
}

export function GraficoBalanceCaja({ config }) {
  const { query, series, period } = useCashSeries();
  return (
    <ChartPanel title="Balance de caja" subtitle="Diario (entradas − salidas)">
      <QueryState query={query}>
        {() => (config.visual === 'bars'
          ? <BarChart series={series} compact={period.days > 30} labelEvery={period.labelEvery} />
          : <LineChart series={series.map((d) => ({ ...d, value: d.balance }))} color="var(--success)" labelEvery={period.labelEvery} />)}
      </QueryState>
    </ChartPanel>
  );
}

export function GraficoFacturacion({ config }) {
  const { period } = usePeriod();
  const query = useInvoicesInRange(period.days);
  const series = useMemo(
    () => (query.data ? invoiceSeries(buildDays(period.days), query.data) : []),
    [query.data, period.days],
  );
  return (
    <ChartPanel
      title="Facturación aprobada"
      subtitle={`Total ARS por día — ${period.label.toLowerCase()}`}
      legend={<Legend items={[{ color: config.visual === 'bars' ? 'var(--success)' : 'var(--chart-1)', label: 'ARS' }]} />}
    >
      <QueryState query={query}>
        {() => (config.visual === 'bars'
          ? <BarChart series={series} compact={period.days > 30} labelEvery={period.labelEvery} />
          : <LineChart series={series} color="var(--chart-1)" labelEvery={period.labelEvery} />)}
      </QueryState>
    </ChartPanel>
  );
}

export function GraficoCategorias({ config }) {
  const query = useInvoices();
  const data = useMemo(() => (query.data ? categorySeries(query.data) : []), [query.data]);
  return (
    <ChartPanel title="Ventas por categoría" subtitle="Total ARS aprobado por categoría">
      <QueryState query={query} isEmpty={() => data.length === 0} empty="Sin ventas registradas todavía">
        {() => (config.visual === 'bars'
          ? <HBarChart data={data} formatValue={formatARS} />
          : <PieChart data={data} formatValue={formatARS} />)}
      </QueryState>
    </ChartPanel>
  );
}

export function TopProductos() {
  const query = useInvoices();
  const data = useMemo(() => (query.data ? topProducts(query.data) : []), [query.data]);
  return (
    <ChartPanel title="Top productos vendidos" subtitle="Unidades vendidas (top 5 histórico)">
      <QueryState query={query} isEmpty={() => data.length === 0} empty="Aún no hay productos vendidos">
        {() => <HBarChart data={data} formatValue={(v) => `${v} u.`} />}
      </QueryState>
    </ChartPanel>
  );
}

export function TopClientes() {
  const invoices = useInvoices();
  const clients = useClients();
  const data = useMemo(
    () => (invoices.data && clients.data ? topClients(invoices.data, clients.map) : []),
    [invoices.data, clients.data, clients.map],
  );
  let body;
  if (hasFailed(invoices) || hasFailed(clients)) {
    body = <WidgetError onRetry={() => { invoices.refetch(); clients.refetch(); }} />;
  } else if (isWaiting(invoices) || isWaiting(clients)) {
    body = <WidgetLoading />;
  } else {
    body = (
      <QueryState query={invoices} isEmpty={() => data.length === 0} empty="Aún no hay clientes con compras aprobadas">
        {() => <HBarChart data={data} formatValue={formatARS} />}
      </QueryState>
    );
  }
  return (
    <ChartPanel title="Top clientes por gasto" subtitle="Total ARS aprobado (top 5 histórico)">
      {body}
    </ChartPanel>
  );
}
