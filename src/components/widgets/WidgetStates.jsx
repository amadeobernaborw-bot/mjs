import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Estados comunes de un widget. Error y vacío se ven distintos a propósito. */
export function WidgetLoading({ label = 'Cargando…' }) {
  return (
    <div className="widget-state" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function WidgetEmpty({ children }) {
  return <div className="widget-state widget-state--empty">{children}</div>;
}

export function WidgetError({ message = 'No se pudieron cargar los datos.', onRetry }) {
  return (
    <div className="widget-state widget-state--error" role="alert">
      <TriangleAlert className="size-5" aria-hidden="true" />
      <span>{message}</span>
      {onRetry && (
        <Button type="button" variant="ghost" size="sm" onClick={onRetry}>
          <RotateCcw data-icon="inline-start" /> Reintentar
        </Button>
      )}
    </div>
  );
}

/** Falló y no hay datos previos para mostrar. */
export const hasFailed = (query) => query.isError && query.data === undefined;
/** Todavía no hay datos (primera carga). */
export const isWaiting = (query) => query.data === undefined;

/**
 * Elige el estado a mostrar a partir de una consulta de TanStack Query.
 * `isEmpty(data)` decide el vacío; `children(data)` pinta el contenido.
 */
export function QueryState({ query, isEmpty, empty, children }) {
  // Si un refetch en segundo plano falla, se siguen mostrando los datos que ya había
  if (query.data === undefined) {
    if (query.isError) return <WidgetError onRetry={() => query.refetch()} />;
    return <WidgetLoading />;
  }
  if (isEmpty?.(query.data)) return <WidgetEmpty>{empty}</WidgetEmpty>;
  return children(query.data);
}
