import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatARS, formatDate } from '../lib/format';

const STATUS_LABEL = {
  pendiente: 'Pendiente',
  aprobado: 'Aprobado',
  cancelado: 'Cancelado',
  pagada: 'Pagada',
  vencida: 'Vencida',
};

const STATUS_TONE = {
  pendiente: 'yellow',
  aprobado: 'green',
  cancelado: 'red',
  pagada: 'green',
  vencida: 'red',
};

export default function TransactionCard({ kind, data, installments = [], onMarkPaid }) {
  if (kind === 'invoice') {
    const items = Array.isArray(data.items) ? data.items : [];
    const previewItems = items.slice(0, 3).map((it) => `${it.qty || 1}× ${it.name}`).join(' · ');
    const moreCount = items.length - 3;
    const paidCount = installments.filter((c) => c.status === 'pagada').length;
    return (
      <Card size="sm" data-tone="accent" className="gap-3">
        <CardHeader>
          <CardTitle className="tx-card__title">
            {data.type === 'factura' ? 'Factura' : 'Presupuesto'} <strong>#{String(data.invoice_number || '').padStart(6, '0')}</strong>
          </CardTitle>
          <CardDescription className="tx-card__date">{formatDate(data.created_at)}</CardDescription>
          <CardAction>
            <span className={`badge badge--${STATUS_TONE[data.status] || 'gray'}`}>{STATUS_LABEL[data.status] || data.status}</span>
          </CardAction>
        </CardHeader>
        <CardContent className="tx-card__body gap-1.5">
          {items.length > 0 && (
            <p className="tx-card__items">{previewItems}{moreCount > 0 && <span className="tx-card__more"> +{moreCount} más</span>}</p>
          )}
          <div className="tx-card__meta">
            {data.payment_method && <span className="tx-card__chip">{data.payment_method}</span>}
            {installments.length > 0 && (
              <span className="tx-card__chip">{paidCount}/{installments.length} cuotas pagadas</span>
            )}
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t border-border pt-3">
          <span className="tx-card__amount">{formatARS(data.total_ars || 0)}</span>
        </CardFooter>

        {installments.length > 0 && (
          <CardContent>
            <ul className="tx-card__installments">
              {installments.map((c) => (
                <li key={c.id} className={`tx-card__inst tx-card__inst--${c.status}`}>
                  <span className="tx-card__inst-num">Cuota {c.installment_num}</span>
                  <span className="tx-card__inst-due">{c.due_date ? formatDate(c.due_date) : 'Sin fecha'}</span>
                  <span className="tx-card__inst-amt">{formatARS(c.amount)}</span>
                  <span className={`badge badge--${STATUS_TONE[c.status] || 'gray'}`}>{STATUS_LABEL[c.status] || c.status}</span>
                  {c.status !== 'pagada' && onMarkPaid && (
                    <Button type="button" variant="ghost" size="xs" onClick={() => onMarkPaid(c)}>
                      <Check data-icon="inline-start" /> Marcar pagada
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>
    );
  }

  // Cash movement
  const isIn = data.type === 'entrada';
  return (
    <Card size="sm" data-tone={isIn ? 'success' : 'danger'} className="gap-3">
      <CardHeader>
        <CardTitle className="tx-card__title">{data.category}</CardTitle>
        <CardDescription className="tx-card__date">{formatDate(data.occurred_at)}</CardDescription>
        <CardAction>
          <span className={`badge badge--${isIn ? 'green' : 'red'}`}>{isIn ? 'Entrada' : 'Salida'}</span>
        </CardAction>
      </CardHeader>
      <CardContent className="tx-card__body gap-1.5">
        {data.detail && <p className="tx-card__items">{data.detail}</p>}
        <div className="tx-card__meta">
          {data.payment_method && <span className="tx-card__chip">{data.payment_method}</span>}
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t border-border pt-3">
        <span className={`tx-card__amount tx-card__amount--${data.type}`}>
          {isIn ? '+' : '−'} {formatARS(data.amount || 0)}
        </span>
      </CardFooter>
    </Card>
  );
}
