import { Link } from 'react-router-dom';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  QueryState, WidgetError, WidgetLoading, hasFailed, isWaiting,
} from '@/components/widgets/WidgetStates';
import { formatARS, formatDate } from '../../../lib/format';
import { LOW_STOCK_THRESHOLD, useClients, useLatestInvoices, useLowStock, useNewLeads } from '../../../hooks/dashboard/queries';
import { ListPanel } from '../surfaces';

const STATUS_BADGE = { aprobado: 'badge--green', pendiente: 'badge--yellow', cancelado: 'badge--red' };

function SeeAll({ to, label = 'Ver todo' }) {
  return (
    <Button asChild variant="ghost" size="sm">
      <Link to={to}>{label} <ArrowUpRight data-icon="inline-end" /></Link>
    </Button>
  );
}

export function UltimasFacturas() {
  const invoices = useLatestInvoices(8);
  const clients = useClients();
  let body;
  if (hasFailed(invoices) || hasFailed(clients)) {
    body = <WidgetError onRetry={() => { invoices.refetch(); clients.refetch(); }} />;
  } else if (isWaiting(invoices) || isWaiting(clients)) {
    body = <WidgetLoading />;
  } else {
    body = (
      <QueryState query={invoices} isEmpty={(d) => d.length === 0} empty="Todavía no hay facturas.">
        {(rows) => (
          <ul className="mini-list">
            {rows.map((inv) => (
              <li key={inv.id} className="mini-list__row">
                <div className="mini-list__main">
                  <span className="mini-list__title">
                    #{String(inv.invoice_number ?? '').padStart(6, '0')} · {clients.map[inv.client_id] || 'Sin cliente'}
                  </span>
                  <span className="mini-list__meta">{formatDate(inv.created_at)} · {inv.type}</span>
                </div>
                <span className={`badge ${STATUS_BADGE[inv.status] || 'badge--gray'}`}>{inv.status}</span>
                <span className="mini-list__amount">{formatARS(inv.total_ars)}</span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    );
  }
  return (
    <ListPanel title="Últimas facturas" subtitle="Las 8 más recientes" actions={<SeeAll to="/admin/invoices" />}>
      {body}
    </ListPanel>
  );
}

export function ListaStockBajo() {
  const low = useLowStock();
  return (
    <ListPanel
      title="Stock bajo"
      subtitle={`Productos activos con ${LOW_STOCK_THRESHOLD} unidades o menos`}
      actions={<SeeAll to="/admin/inventory" label="Inventario" />}
    >
      <QueryState query={low} isEmpty={(d) => d.length === 0} empty="Todo el stock está por encima del mínimo.">
        {(rows) => (
          <ul className="mini-list">
            {rows.map((p) => (
              <li key={p.id} className="mini-list__row">
                <div className="mini-list__main">
                  <span className="mini-list__title">{p.name}</span>
                  <span className="mini-list__meta">{p.category}</span>
                </div>
                <span className={`badge ${p.stock <= 0 ? 'badge--red' : 'badge--yellow'}`}>
                  {p.stock <= 0 ? 'Sin stock' : `${p.stock} u.`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ListPanel>
  );
}

/** Link de WhatsApp solo si el teléfono tiene una longitud internacional válida (8–15 dígitos). */
function whatsappHref(phone) {
  const digits = String(phone || '').replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

export function LeadsNuevos() {
  const leads = useNewLeads(20);
  return (
    <ListPanel title="Consultas nuevas" subtitle="Leads de la tienda sin contactar">
      <QueryState query={leads} isEmpty={(d) => d.length === 0} empty="No hay consultas nuevas.">
        {(rows) => (
          <ul className="mini-list">
            {rows.map((lead) => {
              const href = whatsappHref(lead.phone_number);
              return (
                <li key={lead.id} className="mini-list__row">
                  <div className="mini-list__main">
                    <span className="mini-list__title">{lead.customer_name || 'Sin nombre'}</span>
                    <span className="mini-list__meta">
                      {lead.device_interest || 'Consulta general'} · {formatDate(lead.created_at)}
                    </span>
                  </div>
                  {href && (
                    <Button asChild variant="ghost" size="sm">
                      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Escribir a ${lead.customer_name || 'cliente'} por WhatsApp`}>
                        <MessageCircle data-icon="inline-start" /> WhatsApp
                      </a>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </ListPanel>
  );
}
