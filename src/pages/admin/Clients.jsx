import { useEffect, useMemo, useState } from 'react';
import { FilterX, History, Inbox, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase, TABLES } from '../../lib/supabase';
import InlinePanel from '../../components/ui/InlinePanel';
import TransactionCard from '../../components/TransactionCard';
import SortableHeader, { sortItems } from '../../components/ui/SortableHeader';
import { formatARS, formatDate } from '../../lib/format';

const EMPTY = { id: null, name: '', phone: '', email: '', notes: '' };

const DEFAULT_PAYMENT_METHODS = [
  'Efectivo', 'Transferencia', 'MercadoPago', 'Débito',
  'Crédito 1 cuota', 'Crédito 3 cuotas', 'Crédito 6 cuotas', 'Crédito 12 cuotas',
  'USD efectivo', 'USDT',
];

export default function Clients() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [historyClient, setHistoryClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [sort, setSort] = useState(null);

  // History panel data
  const [historyLoading, setHistoryLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [installmentsByInvoice, setInstallmentsByInvoice] = useState({});
  const [cashMovements, setCashMovements] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [paymentFilter, setPaymentFilter] = useState('Todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    setLoading(true);
    const [cliResp, pmResp] = await Promise.all([
      supabase.from(TABLES.clients).select('*').order('created_at', { ascending: false }),
      supabase.from(TABLES.paymentMethods).select('name').order('name'),
    ]);
    setItems(cliResp.data || []);
    if (pmResp.data?.length) setPaymentMethods(pmResp.data.map((p) => p.name));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const base = items.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.name?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
      );
    });
    return sortItems(base, sort);
  }, [items, search, sort]);

  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: editing.name.trim(),
      phone: editing.phone || null,
      email: editing.email || null,
      notes: editing.notes || null,
    };
    let resp;
    if (editing.id) {
      resp = await supabase.from(TABLES.clients).update(payload).eq('id', editing.id);
    } else {
      resp = await supabase.from(TABLES.clients).insert(payload);
    }
    setSaving(false);
    if (resp.error) { alert(resp.error.message); return; }
    setEditing(null);
    load();
  };

  const remove = async (c) => {
    if (!confirm(`¿Eliminar a ${c.name}?`)) return;
    await supabase.from(TABLES.clients).delete().eq('id', c.id);
    load();
  };

  const loadHistory = async (clientId) => {
    setHistoryLoading(true);
    const [invResp, cashResp] = await Promise.all([
      supabase.from(TABLES.invoices).select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
      supabase.from(TABLES.cashMovements).select('*').eq('client_id', clientId).order('occurred_at', { ascending: false }),
    ]);
    const invs = invResp.data || [];
    setInvoices(invs);
    setCashMovements(cashResp.data || []);

    const invIds = invs.map((i) => i.id);
    if (invIds.length > 0) {
      const { data: instData } = await supabase
        .from('invoice_installments')
        .select('*')
        .in('invoice_id', invIds)
        .order('installment_num');
      const grouped = {};
      (instData || []).forEach((c) => {
        if (!grouped[c.invoice_id]) grouped[c.invoice_id] = [];
        grouped[c.invoice_id].push(c);
      });
      setInstallmentsByInvoice(grouped);
    } else {
      setInstallmentsByInvoice({});
    }
    setHistoryLoading(false);
  };

  const openHistory = (client) => {
    setEditing(null);
    setHistoryClient(client);
    setSourceFilter('Todos');
    setStatusFilter('Todos');
    setPaymentFilter('Todos');
    setDateFrom('');
    setDateTo('');
    loadHistory(client.id);
  };

  const closeHistory = () => {
    setHistoryClient(null);
    setInvoices([]);
    setCashMovements([]);
    setInstallmentsByInvoice({});
  };

  const markInstallmentPaid = async (cuota) => {
    await supabase
      .from('invoice_installments')
      .update({ status: 'pagada', paid_at: new Date().toISOString() })
      .eq('id', cuota.id);
    if (historyClient) loadHistory(historyClient.id);
  };

  // Filtered history items
  const filteredHistory = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;

    const invoiceCards = invoices
      .filter((i) => {
        if (statusFilter !== 'Todos' && i.status !== statusFilter) return false;
        if (paymentFilter !== 'Todos' && i.payment_method !== paymentFilter) return false;
        const d = new Date(i.created_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .map((i) => ({ kind: 'invoice', data: i, when: new Date(i.created_at) }));

    const cashCards = cashMovements
      .filter((m) => {
        if (paymentFilter !== 'Todos' && m.payment_method !== paymentFilter) return false;
        const d = new Date(m.occurred_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .map((m) => ({ kind: 'cash', data: m, when: new Date(m.occurred_at) }));

    let combined = [];
    if (sourceFilter === 'Todos') combined = [...invoiceCards, ...cashCards];
    else if (sourceFilter === 'Facturas') combined = invoiceCards;
    else if (sourceFilter === 'Caja') combined = cashCards;

    combined.sort((a, b) => b.when - a.when);
    return combined;
  }, [invoices, cashMovements, sourceFilter, statusFilter, paymentFilter, dateFrom, dateTo]);

  // Debt summary
  const debtSummary = useMemo(() => {
    const totalBought = invoices
      .filter((i) => i.status === 'aprobado')
      .reduce((s, i) => s + Number(i.total_ars || 0), 0);

    // Sum installments that are pagada across all approved invoices
    let installmentTotal = 0;
    let installmentPaid = 0;
    invoices.forEach((i) => {
      const insts = installmentsByInvoice[i.id] || [];
      if (insts.length === 0) return;
      insts.forEach((c) => {
        installmentTotal += Number(c.amount || 0);
        if (c.status === 'pagada') installmentPaid += Number(c.amount || 0);
      });
    });

    // Cash entries from this client
    const cashIn = cashMovements
      .filter((m) => m.type === 'entrada')
      .reduce((s, m) => s + Number(m.amount || 0), 0);

    // Conservative debt: pending installments
    const pendingInstallments = installmentTotal - installmentPaid;
    const debt = pendingInstallments;

    return { totalBought, paid: installmentPaid + cashIn, debt, hasInstallments: installmentTotal > 0 };
  }, [invoices, installmentsByInvoice, cashMovements]);

  const panelOpen = !!editing || !!historyClient;
  const isHistory = !!historyClient;

  return (
    <div className="page-layout">
      <div className={`page-layout__main ${panelOpen ? 'has-panel' : ''}`}>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Clientes</h1>
          <p className="admin__subtitle">{items.length} contactos en el CRM.</p>
        </div>
        <Button onClick={() => { setHistoryClient(null); setEditing({ ...EMPTY }); }}><Plus data-icon="inline-start" /> Nuevo cliente</Button>
      </div>

      <div className="toolbar">
        <input className="input toolbar__search" placeholder="Buscar por nombre, teléfono, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <Card className="empty">
          <Users className="empty__icon mx-auto block size-12" strokeWidth={1.5} aria-hidden="true" />
          <div className="empty__title">No hay clientes</div>
          <p>Empezá a sumar contactos a tu CRM.</p>
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <SortableHeader label="Nombre" sortKey="name" sort={sort} onSort={setSort} />
                <SortableHeader label="Teléfono" sortKey="phone" sort={sort} onSort={setSort} />
                <SortableHeader label="Email" sortKey="email" sort={sort} onSort={setSort} />
                <SortableHeader label="Alta" sortKey="created_at" sort={sort} onSort={setSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <button className="table__link" onClick={() => openHistory(c)}><strong>{c.name}</strong></button>
                    {c.notes && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{c.notes}</div>}
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    <div className="table__actions">
                      <Button size="sm" onClick={() => openHistory(c)}><History data-icon="inline-start" /> Historial</Button>
                      <Button variant="ghost" size="sm" onClick={() => { setHistoryClient(null); setEditing({ ...EMPTY, ...c }); }}><Pencil data-icon="inline-start" /> Editar</Button>
                      <Button variant="destructive" size="sm" onClick={() => remove(c)}><Trash2 data-icon="inline-start" /> Borrar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {/* EDIT CLIENT PANEL */}
      <InlinePanel
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar cliente' : 'Nuevo cliente'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button form="cli-form" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </>
        }
      >
        {editing && (
          <form id="cli-form" onSubmit={save}>
            <div className="form-grid">
              <div className="field field--full">
                <label className="field__label">Nombre completo</label>
                <input className="input" required value={editing.name} onChange={(e) => setField('name', e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label">Teléfono / WhatsApp</label>
                <input className="input" value={editing.phone || ''} onChange={(e) => setField('phone', e.target.value)} placeholder="+54 9 11 0000 0000" />
              </div>
              <div className="field">
                <label className="field__label">Email</label>
                <input type="email" className="input" value={editing.email || ''} onChange={(e) => setField('email', e.target.value)} />
              </div>
              <div className="field field--full">
                <label className="field__label">Notas</label>
                <textarea className="textarea" value={editing.notes || ''} onChange={(e) => setField('notes', e.target.value)} placeholder="Modelo de interés, preferencias, etc." />
              </div>
            </div>
          </form>
        )}
      </InlinePanel>

      {/* HISTORY PANEL */}
      <InlinePanel
        wide
        open={isHistory}
        onClose={closeHistory}
        title={historyClient ? `Historial — ${historyClient.name}` : 'Historial'}
        footer={
          <Button variant="outline" onClick={closeHistory}>Cerrar</Button>
        }
      >
        {historyClient && (
          <>
            <div className="debt-summary">
              <div className="debt-summary__col">
                <span className="debt-summary__label">Total comprado</span>
                <strong>{formatARS(debtSummary.totalBought)}</strong>
              </div>
              <div className="debt-summary__col">
                <span className="debt-summary__label">Saldado</span>
                <strong style={{ color: 'var(--success)' }}>{formatARS(debtSummary.paid)}</strong>
              </div>
              <div className="debt-summary__col debt-summary__col--debt">
                <span className="debt-summary__label">Deuda pendiente</span>
                <strong style={{ color: debtSummary.debt > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                  {formatARS(debtSummary.debt)}
                </strong>
                {!debtSummary.hasInstallments && debtSummary.debt === 0 && (
                  <small style={{ color: 'var(--text-tertiary)' }}>Sin cuotas registradas</small>
                )}
              </div>
            </div>

            <div className="history-filters">
              <div className="history-filters__row">
                <select className="select" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
                  <option>Todos</option>
                  <option value="Facturas">Solo facturas</option>
                  <option value="Caja">Solo caja</option>
                </select>
                <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={sourceFilter === 'Caja'}>
                  <option value="Todos">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <select className="select" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                  <option value="Todos">Todas las formas de pago</option>
                  {paymentMethods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="history-filters__row">
                <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Desde" />
                <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Hasta" />
                {(dateFrom || dateTo || statusFilter !== 'Todos' || paymentFilter !== 'Todos' || sourceFilter !== 'Todos') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('Todos'); setPaymentFilter('Todos'); setSourceFilter('Todos'); }}
                  ><FilterX data-icon="inline-start" /> Limpiar filtros</Button>
                )}
              </div>
            </div>

            {historyLoading ? (
              <div className="loading-state"><div className="spinner" /></div>
            ) : filteredHistory.length === 0 ? (
              <div className="empty" style={{ padding: 24, textAlign: 'center' }}>
                <Inbox className="empty__icon mx-auto block size-12" strokeWidth={1.5} aria-hidden="true" />
                <div className="empty__title">Sin movimientos</div>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Este cliente no tiene transacciones que coincidan con los filtros.</p>
              </div>
            ) : (
              <div className="tx-list">
                {filteredHistory.map((tx) => (
                  <TransactionCard
                    key={`${tx.kind}-${tx.data.id}`}
                    kind={tx.kind}
                    data={tx.data}
                    installments={tx.kind === 'invoice' ? (installmentsByInvoice[tx.data.id] || []) : []}
                    onMarkPaid={tx.kind === 'invoice' ? markInstallmentPaid : undefined}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </InlinePanel>
    </div>
  );
}
