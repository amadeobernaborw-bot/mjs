import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Superficies compartidas de los widgets del Inicio. El alto lo pone la celda:
 * la raíz ocupa todo (h-full) y el cuerpo se estira con min-h-0 flex-1.
 */

/** Tarjeta de gráfico. El cuerpo nunca scrollea: los gráficos se adaptan al alto. */
export function ChartPanel({ title, subtitle, legend, actions, className, children }) {
  return (
    <Card className={cn('chart-card chart-panel h-full gap-0', className)}>
      <div className="chart-card__head">
        <div className="min-w-0">
          <h3 className="chart-card__title truncate">{title}</h3>
          {subtitle && <p className="chart-card__subtitle truncate">{subtitle}</p>}
        </div>
        {(legend || actions) && (
          <div className="chart-card__head-right">
            {legend}
            {actions}
          </div>
        )}
      </div>
      <div className="chart-panel__body">{children}</div>
    </Card>
  );
}

/** Panel de lista (Cobranzas, Agenda, últimas facturas…): el cuerpo scrollea por dentro. */
export function ListPanel({ title, subtitle, actions, toolbar, className, children }) {
  return (
    <section className={cn('dash-quadrant list-panel h-full', className)}>
      <header className="dash-quadrant__header">
        <div className="min-w-0">
          <h2 className="dash-quadrant__title truncate">{title}</h2>
          {subtitle && <p className="dash-quadrant__subtitle truncate">{subtitle}</p>}
        </div>
        {actions && <div className="dash-quadrant__actions">{actions}</div>}
      </header>
      {toolbar}
      <div className="list-panel__body">{children}</div>
    </section>
  );
}
