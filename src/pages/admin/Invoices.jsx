import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase, TABLES } from '../../lib/supabase';
import { useStoreProfile } from '../../hooks/useStoreProfile';
import { formatARS, formatUSD, formatDate } from '../../lib/format';
import { exportNodeToPdf, exportNodeToPng } from '../../lib/export';
import InlinePanel from '../../components/ui/InlinePanel';
import InvoiceDocument from '../../components/InvoiceDocument';

const EMPTY = {
  id: null,
  client_id: '',
  type: 'presupuesto',
  items: [{ name: '', qty: 1, price_usd: '', price_ars: '' }],
  status: 'pendiente',
};

export default function Invoices() {
  const { profile } = useStoreProfile();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [filterType, setFilterType] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const docRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const [invResp, cliResp] = await Promise.all([
      supabase.from(TABLES.invoices).select('*').order('created_at', { ascending: false }),
      supabase.from(TABLES.clients).select('id, name, phone, email').order('name', { ascending: true }),
    ]);
    setInvoices(invResp.data || []);
    setClients(cliResp.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const rate = Number(profile?.exchange_rate_ars_per_usd) || 0;

  const visible = useMemo(() => invoices.filter((i) => {
    if (filterType !== 'Todos' && i.type !== filterType) return false;
    if (filterStatus !== 'Todos' && i.status !== filterStatus) return false;
    return true;
  }), [invoices, filterType, filterStatus]);

  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));
  const setItem = (idx, k, v) => {
    setEditing((e) => {
      const items = [...e.items];
      const item = { ...items[idx], [k]: v };
      // Auto-convert USD ↔ ARS using rate
      if (k === 'price_usd' && rate && v !== '') {
        item.price_ars = String(Math.round(Number(v) * rate));
      }
      items[idx] = item;
      return { ...e, items };
    });
  };
  const addRow = () => setEditing((e) => ({ ...e, items: [...e.items, { name: '', qty: 1, price_usd: '', price_ars: '' }] }));
  const delRow = (idx) => setEditing((e) => ({ ...e, items: e.items.filter((_, i) => i !== idx) }));

  const totals = useMemo(() => {
    if (!editing) return { ars: 0, usd: 0 };
    return editing.items.reduce((acc, it) => {
      const q = Number(it.qty) || 0;
      acc.ars += q * (Number(it.price_ars) || 0);
      acc.usd += q * (Number(it.price_usd) || 0);
      return acc;
    }, { ars: 0, usd: 0 });
  }, [editing]);

  const save = async (e) => {
    e.preventDefault();
    if (!editing.client_id) { alert('Seleccioná un cliente.'); return; }
    if (editing.items.length === 0 || !editing.items[0].name) {
      alert('Agregá al menos un ítem.');
      return;
    }
    setSaving(true);
    const cleanedItems = editing.items
      .filter((it) => it.name)
      .map((it) => ({
        name: it.name,
        qty: Number(it.qty) || 1,
        price_usd: it.price_usd ? Number(it.price_usd) : null,
        price_ars: it.price_ars ? Number(it.price_ars) : null,
      }));
    const payload = {
      client_id: editing.client_id,
      type: editing.type,
      items: cleanedItems,
      total_ars: totals.ars,
      total_usd: totals.usd || null,
      status: editing.status,
    };
    let resp;
    if (editing.id) {
      resp = await supabase.from(TABLES.invoices).update(payload).eq('id', editing.id);
    } else {
      resp = await supabase.from(TABLES.invoices).insert(payload);
    }
    setSaving(false);
    if (resp.error) { alert(resp.error.message); return; }
    setEditing(null);
    load();
  };

  const remove = async (i) => {
    if (!confirm('¿Eliminar esta factura/presupuesto?')) return;
    await supabase.from(TABLES.invoices).delete().eq('id', i.id);
    load();
  };

  const updateStatus = async (i, status) => {
    await supabase.from(TABLES.invoices).update({ status }).eq('id', i.id);
    load();
  };

  const openPreview = (inv) => {
    const cli = clients.find((c) => c.id === inv.client_id);
    setEditing(null);
    setPreviewing({ inv, client: cli });
  };

  const openEdit = (inv) => {
    setPreviewing(null);
    setEditing({ ...EMPTY, ...inv, items: inv.items?.length ? inv.items : [{ name: '', qty: 1 }] });
  };

  const handleExportPdf = async () => {
    if (!docRef.current || !previewing) return;
    setExportingId('pdf');
    try {
      const fname = `${previewing.inv.type}-${String(previewing.inv.invoice_number || '').padStart(6, '0')}.pdf`;
      await exportNodeToPdf(docRef.current, fname);
    } finally { setExportingId(null); }
  };
  const handleExportPng = async () => {
    if (!docRef.current || !previewing) return;
    setExportingId('png');
    try {
      const fname = `${previewing.inv.type}-${String(previewing.inv.invoice_number || '').padStart(6, '0')}.png`;
      await exportNodeToPng(docRef.current, fname);
    } finally { setExportingId(null); }
  };

  const sendWhatsapp = () => {
    if (!previewing?.client?.phone && !profile?.whatsapp) return;
    const phone = (previewing?.client?.phone || profile?.whatsapp || '').replace(/[^\d]/g, '');
    const cliName = previewing?.client?.name || '';
    const docType = previewing?.inv.type === 'factura' ? 'factura' : 'presupuesto';
    const num = String(previewing?.inv.invoice_number || '').padStart(6, '0');
    const msg = `Hola ${cliName}! Te envío el ${docType} N° ${num} de ${profile?.store_name || 'MJ STORE'}. Total: ${formatARS(previewing?.inv.total_ars || 0)}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const clientName = (id) => clients.find((c) => c.id === id)?.name || '—';

  const panelOpen = !!editing || !!previewing;

  return (
    <div className="page-layout">
      <div className={`page-layout__main ${panelOpen ? 'has-panel' : ''}`}>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Facturas y Presupuestos</h1>
          <p className="admin__subtitle">{invoices.length} documentos. Tipo de cambio: {rate ? formatARS(rate) + '/USD' : '— configurar en Tienda'}</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setPreviewing(null); setEditing({ ...EMPTY, items: [{ name: '', qty: 1, price_usd: '', price_ars: '' }] }); }}>+ Nuevo</button>
      </div>

      <div className="toolbar">
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: 'auto' }}>
          <option>Todos</option>
          <option value="presupuesto">Presupuestos</option>
          <option value="factura">Facturas</option>
        </select>
        <select className="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
          <option>Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="aprobado">Aprobado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : visible.length === 0 ? (
        <div className="admin-card empty">
          <div className="empty__icon">🧾</div>
          <div className="empty__title">No hay documentos</div>
          <p>Creá tu primer presupuesto o factura.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Total ARS</th>
                <th>Total USD</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id}>
                  <td><strong>#{String(i.invoice_number || '').padStart(6, '0')}</strong></td>
                  <td><span className={`badge ${i.type === 'factura' ? 'badge--blue' : 'badge--gray'}`}>{i.type}</span></td>
                  <td>{clientName(i.client_id)}</td>
                  <td>{formatARS(i.total_ars)}</td>
                  <td>{i.total_usd ? formatUSD(i.total_usd) : '—'}</td>
                  <td>
                    <select
                      className="select"
                      value={i.status}
                      onChange={(e) => updateStatus(i, e.target.value)}
                      style={{ height: 30, padding: '0 8px', fontSize: 12, width: 'auto' }}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </td>
                  <td>{formatDate(i.created_at)}</td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--sm btn--primary" onClick={() => openPreview(i)}>Ver / Exportar</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => openEdit(i)}>Editar</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => remove(i)} style={{ color: 'var(--accent-red)' }}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {/* EDIT PANEL */}
      <InlinePanel
        wide
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar documento' : 'Nuevo presupuesto / factura'}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button form="inv-form" type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        {editing && (
          <form id="inv-form" onSubmit={save}>
            <div className="form-grid">
              <div className="field">
                <label className="field__label">Cliente</label>
                <select className="select" required value={editing.client_id} onChange={(e) => setField('client_id', e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field__label">Tipo</label>
                <select className="select" value={editing.type} onChange={(e) => setField('type', e.target.value)}>
                  <option value="presupuesto">Presupuesto</option>
                  <option value="factura">Factura</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label className="field__label" style={{ display: 'block', marginBottom: 8 }}>Ítems</label>
              <div style={{ overflowX: 'auto' }}>
              <table className="invoice-items-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="col-qty">Cant.</th>
                    <th className="col-price">P. USD</th>
                    <th className="col-price">P. ARS</th>
                    <th className="col-act"></th>
                  </tr>
                </thead>
                <tbody>
                  {editing.items.map((it, idx) => (
                    <tr key={idx}>
                      <td><input className="input" placeholder="iPhone 15 Pro 256GB" value={it.name} onChange={(e) => setItem(idx, 'name', e.target.value)} /></td>
                      <td><input className="input" type="number" min="1" value={it.qty} onChange={(e) => setItem(idx, 'qty', e.target.value)} /></td>
                      <td><input className="input" type="number" min="0" step="0.01" value={it.price_usd} onChange={(e) => setItem(idx, 'price_usd', e.target.value)} /></td>
                      <td><input className="input" type="number" min="0" step="0.01" value={it.price_ars} onChange={(e) => setItem(idx, 'price_ars', e.target.value)} /></td>
                      <td><button type="button" className="btn btn--sm btn--ghost" onClick={() => delRow(idx)} style={{ color: 'var(--accent-red)' }}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              <button type="button" className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={addRow}>+ Agregar ítem</button>
              {!rate && <p className="field__hint" style={{ color: 'var(--accent-yellow)', marginTop: 6 }}>Sin tipo de cambio configurado: el USD no se convierte automáticamente a ARS.</p>}
            </div>

            <div className="invoice-totals">
              {totals.usd > 0 && <div className="invoice-totals__row"><span>Total USD</span><strong>{formatUSD(totals.usd)}</strong></div>}
              <div className="invoice-totals__row invoice-totals__row--final"><span>Total ARS</span><strong>{formatARS(totals.ars)}</strong></div>
            </div>

            <div className="field" style={{ marginTop: 16 }}>
              <label className="field__label">Estado</label>
              <select className="select" value={editing.status} onChange={(e) => setField('status', e.target.value)}>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </form>
        )}
      </InlinePanel>

      {/* PREVIEW + EXPORT PANEL */}
      <InlinePanel
        wide
        open={!!previewing}
        onClose={() => setPreviewing(null)}
        title="Vista previa"
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setPreviewing(null)}>Cerrar</button>
            <button className="btn btn--ghost" onClick={sendWhatsapp}>WhatsApp</button>
            <button className="btn btn--ghost" onClick={handleExportPng} disabled={exportingId === 'png'}>{exportingId === 'png' ? 'Generando…' : 'PNG'}</button>
            <button className="btn btn--primary" onClick={handleExportPdf} disabled={exportingId === 'pdf'}>{exportingId === 'pdf' ? 'Generando…' : 'PDF'}</button>
          </>
        }
      >
        {previewing && (
          <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, overflow: 'auto' }}>
            <InvoiceDocument
              ref={docRef}
              invoice={previewing.inv}
              profile={profile}
              client={previewing.client}
            />
          </div>
        )}
      </InlinePanel>
    </div>
  );
}
