import { useMemo, useState } from 'react';
import { FileCheck2, FileDown, Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import SortableHeader from '../../ui/SortableHeader';
import { formatARS, formatDate } from '../../../lib/format';
import { DEFAULT_SORT, STATUS_ALL, formatDocNumber, selectRows } from '../../../lib/invoices/list';

const STATUSES = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'cancelado', label: 'Cancelado' },
];

/**
 * Tabla de un tipo de documento (facturas o presupuestos) con su propio filtro
 * de estado y su propio orden. `rows` trae todos los documentos con client_name.
 */
export default function InvoiceTable({
  type, title, emptyText, rows, query, installmentsByInvoice, convertedBy,
  onNew, onPreview, onEdit, onRemove, onStatusChange, onConvert, convertingId,
}) {
  const [status, setStatus] = useState(STATUS_ALL);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const isQuote = type === 'presupuesto';

  const total = useMemo(() => rows.filter((r) => r.type === type).length, [rows, type]);
  const visible = useMemo(() => selectRows(rows, { type, status, query, sort }), [rows, type, status, query, sort]);
  const headingId = `invoice-table-${type}`;

  return (
    <section className="invoice-table" aria-labelledby={headingId}>
      <div className="invoice-table__head">
        <div>
          <h2 id={headingId} className="invoice-table__title">{title}</h2>
          <p className="invoice-table__meta">
            {visible.length === total ? `${total} documentos` : `${visible.length} de ${total}`}
          </p>
        </div>
        <div className="invoice-table__tools">
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label={`Filtrar ${title.toLowerCase()} por estado`}
            style={{ width: 'auto' }}
          >
            <option value={STATUS_ALL}>Todos</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <Button size="sm" onClick={onNew}><Plus data-icon="inline-start" /> Nuevo</Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="empty invoice-table__empty">
          <Receipt className="empty__icon mx-auto block size-10" strokeWidth={1.5} aria-hidden="true" />
          <div className="empty__title">{total === 0 ? emptyText : 'Sin resultados'}</div>
          <p>{total === 0 ? 'Creá el primero con “Nuevo”.' : 'Probá con otro estado o búsqueda.'}</p>
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="table table--compact">
            <thead>
              <tr>
                <SortableHeader label="N°" sortKey="invoice_number" sort={sort} onSort={setSort} />
                <SortableHeader label="Cliente" sortKey="client_name" sort={sort} onSort={setSort} />
                <SortableHeader label="Total ARS" sortKey="total_ars" sort={sort} onSort={setSort} align="right" />
                <SortableHeader label="Pago" sortKey="payment_method" sort={sort} onSort={setSort} />
                <SortableHeader label="Estado" sortKey="status" sort={sort} onSort={setSort} />
                <SortableHeader label="Fecha" sortKey="created_at" sort={sort} onSort={setSort} />
                <th><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => {
                const installments = installmentsByInvoice[i.id] || [];
                const factura = isQuote ? convertedBy.get(i.id) : null;
                return (
                  <tr key={i.id}>
                    <td><strong>{formatDocNumber(i.invoice_number)}</strong></td>
                    <td>{i.client_name || '—'}</td>
                    <td>{formatARS(i.total_ars)}</td>
                    <td>
                      <div className="invoice-table__badges">
                        {i.payment_method ? <span className="badge badge--gray">{i.payment_method}</span> : '—'}
                        {installments.length > 0 && (
                          <span className="badge badge--blue" title="Plan de cuotas">
                            {installments.filter((c) => c.status === 'pagada').length}/{installments.length} cuotas
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={i.status}
                        onChange={(e) => onStatusChange(i, e.target.value)}
                        aria-label={`Estado de ${formatDocNumber(i.invoice_number)}`}
                        style={{ height: 30, padding: '0 8px', fontSize: 12, width: 'auto' }}
                      >
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td>{formatDate(i.created_at)}</td>
                    <td>
                      <div className="table__actions">
                        <Button size="icon-sm" onClick={() => onPreview(i)} aria-label="Ver / Exportar" title="Ver / Exportar"><FileDown /></Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(i)} aria-label="Editar" title="Editar"><Pencil /></Button>
                        {isQuote && (factura ? (
                          <button
                            type="button"
                            className="badge badge--green badge-btn"
                            onClick={() => onPreview(factura)}
                            title="Ver la factura"
                          >
                            Facturado F{formatDocNumber(factura.invoice_number)}
                          </button>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon-sm"
                            onClick={() => onConvert(i)}
                            disabled={i.status === 'cancelado' || convertingId === i.id}
                            aria-label="Convertir en factura"
                            title={i.status === 'cancelado' ? 'Un presupuesto cancelado no se puede facturar' : 'Convertir en factura'}
                          ><FileCheck2 /></Button>
                        ))}
                        <Button variant="destructive" size="icon-sm" onClick={() => onRemove(i)} aria-label="Borrar" title="Borrar"><Trash2 /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
