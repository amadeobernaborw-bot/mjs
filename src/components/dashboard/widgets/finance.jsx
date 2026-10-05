import { useMemo } from 'react';
import { CalendarClock, HandCoins, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { QueryState } from '@/components/widgets/WidgetStates';
import { formatARS, todayLocalISO } from '../../../lib/format';
import {
  byCategory, byPaymentMethod, cashTotals, installmentsDueSummary, installmentsPaidSummary,
} from '../../../lib/dashboard/metrics';
import { useCashMovements, useInstallmentsPaid, useOpenInstallments } from '../../../hooks/dashboard/queries';
import { HBarChart, Legend, PairedBars, PieChart } from '../charts/Charts';
import { ChartPanel } from '../surfaces';
import { usePeriod } from '../PeriodContext';
import { Kpi } from './kpis';

const periodText = (period) => period.label.toLowerCase();
const DUE_HORIZON_DAYS = 30;

/** Movimientos de caja del período global (compartido por todos los widgets de Finanzas). */
function usePeriodCash() {
  const { period } = usePeriod();
  return { period, movements: useCashMovements(period.days) };
}

export function KpiIngresosPeriodo() {
  const { period, movements } = usePeriodCash();
  return (
    <Kpi
      queries={[movements]} to="/admin/cash" icon={TrendingUp} label="Ingresos" tone="success"
      build={() => ({ value: formatARS(cashTotals(movements.data).entradas), delta: `entradas · ${periodText(period)}` })}
    />
  );
}

export function KpiEgresosPeriodo() {
  const { period, movements } = usePeriodCash();
  return (
    <Kpi
      queries={[movements]} to="/admin/cash" icon={TrendingDown} label="Egresos" tone="primary"
      build={() => ({ value: formatARS(cashTotals(movements.data).salidas), delta: `salidas · ${periodText(period)}` })}
    />
  );
}

export function KpiResultadoPeriodo() {
  const { period, movements } = usePeriodCash();
  const totals = movements.data ? cashTotals(movements.data) : null;
  const isLoss = totals ? totals.resultado < 0 : false;
  return (
    <Kpi
      queries={[movements]} to="/admin/cash" icon={Scale}
      label={isLoss ? 'Pérdida' : 'Ganancia'}
      tone={isLoss ? 'danger' : 'success'}
      build={() => ({
        value: formatARS(totals.resultado),
        delta: totals.margin == null
          ? `Sin ingresos · ${periodText(period)}`
          : `Margen ${(totals.margin * 100).toFixed(1)}% · ${periodText(period)}`,
      })}
    />
  );
}

export function GraficoCostosCategoria({ config }) {
  const { period, movements } = usePeriodCash();
  const data = useMemo(() => (movements.data ? byCategory(movements.data, 'salida') : []), [movements.data]);
  return (
    <ChartPanel title="Costos por categoría" subtitle={`Egresos — ${periodText(period)}`}>
      <QueryState query={movements} isEmpty={() => data.length === 0} empty="Sin egresos en el período">
        {() => (config.visual === 'bars'
          ? <HBarChart data={data} formatValue={formatARS} />
          : <PieChart data={data} formatValue={formatARS} />)}
      </QueryState>
    </ChartPanel>
  );
}

export function GraficoMediosPago() {
  const { period, movements } = usePeriodCash();
  const data = useMemo(() => (movements.data ? byPaymentMethod(movements.data) : []), [movements.data]);
  return (
    <ChartPanel
      title="Medios de pago"
      subtitle={`Entradas y salidas — ${periodText(period)}`}
      legend={<Legend items={[{ color: 'var(--success)', label: 'Entra' }, { color: 'var(--danger)', label: 'Sale' }]} />}
    >
      <QueryState query={movements} isEmpty={() => data.length === 0} empty="Sin movimientos en el período">
        {() => <PairedBars data={data} formatValue={formatARS} />}
      </QueryState>
    </ChartPanel>
  );
}

export function KpiCuotasCobradas() {
  const { period } = usePeriod();
  const paid = useInstallmentsPaid(period.days);
  return (
    <Kpi
      queries={[paid]} to="/admin/invoices" icon={HandCoins} label="Cuotas cobradas" tone="success"
      build={() => {
        const { count, total } = installmentsPaidSummary(paid.data);
        return { value: formatARS(total), delta: `${count} cuota${count !== 1 ? 's' : ''} · ${periodText(period)}` };
      }}
    />
  );
}

export function KpiCuotasPorVencer() {
  const open = useOpenInstallments();
  const summary = open.data ? installmentsDueSummary(open.data, todayLocalISO(), DUE_HORIZON_DAYS) : null;
  return (
    <Kpi
      queries={[open]} to="/admin/invoices" icon={CalendarClock} label="Por vencer (30 días)"
      tone={summary?.overdueCount ? 'danger' : 'muted'}
      build={() => ({
        value: formatARS(summary.upcomingTotal),
        delta: summary.overdueCount
          ? `${summary.upcomingCount} por vencer · ${summary.overdueCount} vencida${summary.overdueCount !== 1 ? 's' : ''}`
          : `${summary.upcomingCount} cuota${summary.upcomingCount !== 1 ? 's' : ''} · sin vencidas`,
      })}
    />
  );
}
