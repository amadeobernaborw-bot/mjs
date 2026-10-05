import { useMemo } from 'react';
import { Banknote, Warehouse } from 'lucide-react';
import {
  QueryState, WidgetError, WidgetLoading, hasFailed, isWaiting,
} from '@/components/widgets/WidgetStates';
import { formatARS, formatUSD } from '../../../lib/format';
import { stockByCategory, stockCoverage, stockSummary, topStock } from '../../../lib/dashboard/metrics';
import { useInvoicesInRange, useProductsStock } from '../../../hooks/dashboard/queries';
import { HBarChart, PieChart } from '../charts/Charts';
import { ChartPanel, ListPanel } from '../surfaces';
import { usePeriod } from '../PeriodContext';
import { Kpi } from './kpis';

const units = (v) => `${v} u.`;

/** Umbrales de cobertura (días) para el color del badge. */
const COVERAGE_URGENT_DAYS = 7;
const COVERAGE_WARNING_DAYS = 30;

export function KpiUnidadesStock() {
  const products = useProductsStock();
  return (
    <Kpi
      queries={[products]} to="/admin/inventory" icon={Warehouse} label="Unidades en stock" tone="accent"
      build={() => {
        const s = stockSummary(products.data);
        const plural = s.products !== 1 ? 's' : '';
        return { value: s.units, delta: `en ${s.products} producto${plural} activo${plural}` };
      }}
    />
  );
}

export function KpiValorStock() {
  const products = useProductsStock();
  return (
    <Kpi
      queries={[products]} to="/admin/inventory" icon={Banknote} label="Valor del stock" tone="success"
      build={() => {
        const s = stockSummary(products.data);
        return { value: formatARS(s.valueArs), delta: `${formatUSD(s.valueUsd)} · a precio de venta` };
      }}
    />
  );
}

export function RankingMasStock() {
  const products = useProductsStock();
  const data = useMemo(() => (products.data ? topStock(products.data, 8) : []), [products.data]);
  return (
    <ChartPanel title="Lo que más tengo" subtitle="Productos activos con más unidades">
      <QueryState query={products} isEmpty={() => data.length === 0} empty="No hay productos con stock">
        {() => <HBarChart data={data} formatValue={units} />}
      </QueryState>
    </ChartPanel>
  );
}

export function GraficoStockCategoria({ config }) {
  const products = useProductsStock();
  const data = useMemo(() => (products.data ? stockByCategory(products.data) : []), [products.data]);
  return (
    <ChartPanel title="Stock por categoría" subtitle="Unidades de productos activos">
      <QueryState query={products} isEmpty={() => data.length === 0} empty="No hay productos con stock">
        {() => (config.visual === 'bars'
          ? <HBarChart data={data} formatValue={units} />
          : <PieChart data={data} formatValue={units} />)}
      </QueryState>
    </ChartPanel>
  );
}

function coverageBadge(days) {
  if (days == null) return { className: 'badge--gray', text: 'Sin ventas' };
  const rounded = Math.round(days);
  const text = rounded < 1 ? '< 1 día' : `${rounded} día${rounded !== 1 ? 's' : ''}`;
  if (days < COVERAGE_URGENT_DAYS) return { className: 'badge--red', text };
  if (days < COVERAGE_WARNING_DAYS) return { className: 'badge--yellow', text };
  return { className: 'badge--green', text };
}

export function CoberturaStock() {
  const { period } = usePeriod();
  const products = useProductsStock();
  const invoices = useInvoicesInRange(period.days);
  const rows = useMemo(
    () => (products.data && invoices.data ? stockCoverage(products.data, invoices.data, period.days) : []),
    [products.data, invoices.data, period.days],
  );

  let body;
  if (hasFailed(products) || hasFailed(invoices)) {
    body = <WidgetError onRetry={() => { products.refetch(); invoices.refetch(); }} />;
  } else if (isWaiting(products) || isWaiting(invoices)) {
    body = <WidgetLoading />;
  } else {
    body = (
      <QueryState query={products} isEmpty={() => rows.length === 0} empty="No hay productos activos.">
        {() => (
          <ul className="mini-list">
            {rows.map((r) => {
              const badge = coverageBadge(r.coverageDays);
              return (
                <li key={r.id} className="mini-list__row">
                  <div className="mini-list__main">
                    <span className="mini-list__title">{r.name}</span>
                    <span className="mini-list__meta">{r.stock} en stock · {r.sold} vendida{r.sold !== 1 ? 's' : ''}</span>
                  </div>
                  <span className={`badge ${badge.className}`}>{badge.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    );
  }

  return (
    <ListPanel
      title="Cobertura de stock"
      subtitle={`Días que dura al ritmo de venta de ${period.label.toLowerCase()} · cruza ventas por nombre: productos con el mismo nombre comparten ventas`}
    >
      {body}
    </ListPanel>
  );
}
