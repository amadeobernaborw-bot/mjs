import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, History, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  QueryState, WidgetError, WidgetLoading, hasFailed, isWaiting,
} from '@/components/widgets/WidgetStates';
import { ListPanel } from '@/components/dashboard/surfaces';
import { formatARS, formatDate, parseLocalDate } from '../../lib/format';
import {
  useAgendaDoneCount, useAgendaMutations, useAgendaNotes, useClients, useDebts,
} from '../../hooks/dashboard/queries';

function urgencyOf(remindDate) {
  if (!remindDate) return 'neutral';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = parseLocalDate(remindDate); d.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((d - today) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'warning';
  return 'ok';
}

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;

export function DebtsCard() {
  const debts = useDebts();
  return (
    <ListPanel
      className="dash-quadrant--debts"
      title="Cobranzas"
      subtitle="Clientes con cuotas vencidas o por vencer"
      actions={(
        <Button asChild size="sm">
          <Link to="/admin/invoices"><Plus data-icon="inline-start" /> Nueva factura</Link>
        </Button>
      )}
    >
      <QueryState query={debts} isEmpty={(d) => d.length === 0} empty="Sin deudas pendientes registradas.">
        {(rows) => (
          <ul className="debt-list">
            {rows.map((d) => (
              <li key={d.id} className="debt-row">
                <div className="debt-row__main">
                  <div className="debt-row__name">{d.name}</div>
                  <div className="debt-row__details">
                    {d.invoice_number != null && <>Factura #{String(d.invoice_number).padStart(6, '0')} · </>}
                    {d.overdue > 0 && <span className="debt-row__overdue">{plural(d.overdue, 'cuota')} vencida{d.overdue !== 1 ? 's' : ''} · </span>}
                    {d.pending > 0 && <>{plural(d.pending, 'pendiente')}</>}
                    {d.nextDue && <> · Próx: {formatDate(d.nextDue)}</>}
                  </div>
                </div>
                <div className="debt-row__amount">{formatARS(d.total)}</div>
                <Button asChild variant="ghost" size="sm" className="debt-row__action">
                  <Link to="/admin/clients"><History data-icon="inline-start" /> Historial</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </ListPanel>
  );
}

function AgendaForm({ clients, onDone }) {
  const { create } = useAgendaMutations();
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState('');
  const [text, setText] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!clientId || !text.trim()) return;
    try {
      await create.mutateAsync({ client_id: clientId, remind_date: date || null, text: text.trim() });
      onDone();
    } catch {
      // El error queda en create.error y se muestra abajo
    }
  };

  return (
    <form onSubmit={submit} className="agenda-form">
      <select className="select" value={clientId} onChange={(e) => setClientId(e.target.value)} required aria-label="Cliente">
        <option value="">Cliente…</option>
        {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Fecha del recordatorio" />
      <input
        className="input"
        placeholder="Ej: Avisar que ingresó nuevo stock"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Nota"
        required
      />
      <Button type="submit" size="sm" disabled={create.isPending}>
        {create.isPending ? 'Guardando…' : 'Guardar'}
      </Button>
      {create.isError && <p className="agenda-form__error" role="alert">No se pudo guardar la nota. Intentá de nuevo.</p>}
    </form>
  );
}

export function AgendaCard() {
  const [view, setView] = useState('activas');
  const [showForm, setShowForm] = useState(false);
  const notes = useAgendaNotes(view);
  const doneCount = useAgendaDoneCount();
  const clients = useClients();
  const { setStatus, remove } = useAgendaMutations();
  const active = view === 'activas';

  const removeNote = (id) => {
    if (confirm('¿Eliminar esta nota?')) remove.mutate(id);
  };

  const tabs = (
    <div className="agenda-tabs" role="tablist">
      <button type="button" role="tab" aria-selected={active}
        className={`agenda-tabs__btn ${active ? 'is-active' : ''}`} onClick={() => setView('activas')}>
        Activas{active && notes.data ? ` (${notes.data.length})` : ''}
      </button>
      <button type="button" role="tab" aria-selected={!active}
        className={`agenda-tabs__btn ${!active ? 'is-active' : ''}`} onClick={() => setView('hechas')}>
        Hechas{doneCount.data != null ? ` (${doneCount.data})` : ''}
      </button>
    </div>
  );

  let body;
  if (hasFailed(notes) || hasFailed(clients)) {
    body = <WidgetError onRetry={() => { notes.refetch(); clients.refetch(); }} />;
  } else if (isWaiting(notes) || isWaiting(clients)) {
    body = <WidgetLoading />;
  } else {
    body = (
      <QueryState
        query={notes}
        isEmpty={(d) => d.length === 0}
        empty={active ? 'Sin recordatorios. Cargá uno para hacer seguimiento.' : 'Sin notas archivadas todavía.'}
      >
        {(rows) => (
          <ul className="agenda-list">
            {rows.map((n) => {
              const u = active ? urgencyOf(n.remind_date) : 'neutral';
              return (
                <li key={n.id} className={`agenda-note agenda-note--${u} ${active ? '' : 'agenda-note--done'}`}>
                  <div className="agenda-note__head">
                    <span className="agenda-note__date">{n.remind_date ? formatDate(n.remind_date) : 'Sin fecha'}</span>
                    <span className="agenda-note__client">{clients.map[n.client_id] || '—'}</span>
                  </div>
                  <p className="agenda-note__text">{n.text}</p>
                  <div className="agenda-note__actions">
                    {active ? (
                      <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: n.id, status: 'hecha' })}>
                        <Check data-icon="inline-start" /> Marcar hecha
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setStatus.mutate({ id: n.id, status: 'pendiente' })}>
                        <RotateCcw data-icon="inline-start" /> Deshacer
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => removeNote(n.id)}>
                      <Trash2 data-icon="inline-start" /> Borrar
                    </Button>
                  </div>
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
      className="dash-quadrant--agenda"
      title="Agenda"
      subtitle="Recordatorios para contactar clientes"
      actions={active && (
        <Button size="sm" variant={showForm ? 'outline' : 'default'} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : <><Plus data-icon="inline-start" /> Nueva nota</>}
        </Button>
      )}
      toolbar={(
        <>
          {tabs}
          {(setStatus.isError || remove.isError) && (
            <p className="agenda-form__error" role="alert">No se pudo actualizar la nota. Intentá de nuevo.</p>
          )}
          {showForm && active && <AgendaForm clients={clients.data || []} onDone={() => setShowForm(false)} />}
        </>
      )}
    >
      {body}
    </ListPanel>
  );
}
