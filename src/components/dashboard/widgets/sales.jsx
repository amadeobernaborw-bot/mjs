import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Boxes, ShoppingBag, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  QueryState, WidgetError, WidgetLoading, hasFailed, isWaiting,
} from '@/components/widgets/WidgetStates';
import { formatARS, formatDate } from '../../../lib/format';
import {
  approvedTotal, buildDays, purchases, salesVsPurchasesSeries, topProducts, unitsSold,
} from '../../../lib/dashboard/metrics';
import { useCashMovements, useInvoicesInRange, useRecentPurchases } from '../../../hooks/dashboard/queries';
import { BarChart, HBarChart, Legend, LineChart } from '../charts/Charts';
import { ChartPanel, ListPanel } from '../surfaces';
import { usePeriod } from '../PeriodContext';
import { Kpi } from './kpis';

const periodText = (period) => period.label.toLowerCase();

export function KpiVentasPeriodo() {
  const { period } = usePeriod();
  const invoices = useInvoicesInRange(period.days);
  return (
    <Kpi
      queries={[invoices]} to="/admin/invoices" icon={ShoppingBag} label="Ventas del período" tone="success"
      build={() => {
        const approved = invoices.data.filter((i) => i.status === 'aprobado');
        return {
          value: formatARS(approvedTotal(approved)),
          delta: `${approved.length} factura${approved.length !== 1 ? 's' : ''} · ${periodText(period)}`,
        };
      }}
    />
  );
}

export function KpiUnidadesVendidas() {
  const { period } = usePeriod();
  const invoices = useInvoicesInRange(period.days);
  return (
    <Kpi
      queries={[invoices]} to="/admin/invoices" icon={Boxes} label="Unidades vendidas" tone="accent"
      build={() => ({ value: unitsSold(invoices.data), delta: `unidades · ${periodText(period)}` })}
    />
  );
}

export function KpiComprasPeriodo() {
  const { period } = usePeriod();
  const movements = useCashMovements(period.days);
  return (
    <Kpi
      queries={[movements]} to="/admin/cash" icon={ShoppingCart} label="Compras del período" tone="primary"
      build={() => {
        const rows = purchases(movements.data);
        return {
          value: formatARS(rows.reduce((s, m) => s + Number(m.amount || 0), 0)),
          delta: `${rows.length} compra${rows.length !== 1 ? 's' : ''} de stock · ${periodText(period)}`,
        };
      }}
    />
  );
}

export function MasVendidosPeriodo() {
  const { period } = usePeriod();
  const invoices = useInvoicesInRange(period.days);
  const data = useMemo(() => (invoices.data ? topProducts(invoices.data, 6) : []), [invoices.data]);
  return (
    <ChartPanel title="Más vendidos" subtitle={`Unidades — ${periodText(period)}`}>
      <QueryState query={invoices} isEmpty={() => data.length === 0} empty="Sin ventas en el período">
        {() => <HBarChart data={data} formatValue={(v) => `${v} u.`} />}
      </QueryState>
    </ChartPanel>
  );
}

export function GraficoVentasVsCompras({ config }) {
  const { period } = usePeriod();
  const invoices = useInvoicesInRange(period.days);
  const movements = useCashMovements(period.days);
  const series = useMemo(
    () => (invoices.data && movements.data
      ? salesVsPurchasesSeries(buildDays(period.days), invoices.data, movements.data)
      : []),
    [invoices.data, movements.data, period.days],
  );
  const isBars = config.visual === 'bars';

  let body;
  if (hasFailed(invoices) || hasFailed(movements)) {
    body = <WidgetError onRetry={() => { invoices.refetch(); movements.refetch(); }} />;
  } else if (isWaiting(invoices) || isWaiting(movements)) {
    body = <WidgetLoading />;
  } else if (isBars) {
    body = <BarChart series={series} compact={period.days > 30} labelEvery={period.labelEvery} />;
  } else {
    body = <LineChart series={series} color="var(--chart-1)" labelEvery={period.labelEvery} />;
  }

  return (
    <ChartPanel
      title="Ventas vs compras"
      subtitle={isBars ? `Por día — ${periodText(period)}` : `Ventas − compras por día — ${periodText(period)}`}
      legend={isBars
        ? <Legend items={[{ color: 'var(--success)', label: 'Ventas' }, { color: 'var(--danger)', label: 'Compras' }]} />
        : <Legend items={[{ color: 'var(--chart-1)', label: 'Diferencia' }]} />}
    >
      {body}
    </ChartPanel>
  );
}

export function UltimasCompras() {
  const recent = useRecentPurchases(8);
  return (
    <ListPanel
      title="Últimas compras"
      subtitle="Movimientos de “Compra stock”"
      actions={(
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/cash">Caja <ArrowUpRight data-icon="inline-end" /></Link>
        </Button>
      )}
    >
      <QueryState query={recent} isEmpty={(d) => d.length === 0} empty="No hay compras de stock registradas.">
        {(rows) => (
          <ul className="mini-list">
            {rows.map((m) => (
              <li key={m.id} className="mini-list__row">
                <div className="mini-list__main">
                  <span className="mini-list__title">{m.detail || 'Compra de stock'}</span>
                  <span className="mini-list__meta">{formatDate(m.occurred_at)} · {m.payment_method || 'Sin medio de pago'}</span>
                </div>
                <span className="mini-list__amount">{formatARS(m.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ListPanel>
  );
}

