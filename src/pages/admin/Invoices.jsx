import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, MessageCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, TABLES, BUCKETS } from '../../lib/supabase';
import { allRows } from '../../lib/pagination';
import { useStoreProfile } from '../../hooks/useStoreProfile';
import { formatARS, formatUSD } from '../../lib/format';
import { exportNodeToPdf, exportNodeToPng } from '../../lib/export';
import { withClientNames } from '../../lib/invoices/list';
import InlinePanel from '../../components/ui/InlinePanel';
import InvoiceDocument from '../../components/InvoiceDocument';
import InvoiceTable from '../../components/admin/invoices/InvoiceTable';
import ItemRow from '../../components/admin/invoices/ItemRow';

const EMPTY = {
  id: null,
  client_id: '',
  type: 'presupuesto',
  items: [{ name: '', qty: 1, price_usd: '', price_ars: '', image_url: '' }],
  status: 'pendiente',
  payment_method: '',
};

const DEFAULT_PAYMENT_METHODS = [
  'Efectivo', 'Transferencia', 'MercadoPago', 'Débito',
  'Crédito 1 cuota', 'Crédito 3 cuotas', 'Crédito 6 cuotas', 'Crédito 12 cuotas',
  'USD efectivo', 'USDT',
];

function isInstallmentMethod(method) {
  return /cuota/i.test(method || '');
}
function parseInstallmentCount(method) {
  const m = (method || '').match(/(\d+)\s*cuota/i);
  return m ? Number(m[1]) : 0;
}

export default function Invoices() {
  const { profile } = useStoreProfile();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS);
  const [installmentsByInvoice, setInstallmentsByInvoice] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [previewing, setPreviewing] = useState(null);
  const [query, setQuery] = useState('');
  const [convertingId, setConvertingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState(null);
  const [installmentPlan, setInstallmentPlan] = useState([]);
  const [uploadingItemIdx, setUploadingItemIdx] = useState(null);
  const docRef = useRef(null);

  const load = async () => {
    setLoading(true);
    const [invResp, cliResp, prodResp, pmResp] = await Promise.all([
      supabase.from(TABLES.invoices).select('*').order('created_at', { ascending: false }),
      supabase.from(TABLES.clients).select('id, name, phone, email').order('name', { ascending: true }),
      allRows(() => supabase.from(TABLES.products).select('id, name, category, price_ars, price_usd, image_url, stock, catalog_models(image_url)').eq('is_active', true).order('name').order('id'))
        .then((data) => ({ data }), (error) => ({ data: [], error })), // mismo formato que las otras respuestas
      supabase.from(TABLES.paymentMethods).select('name').order('name'),
    ]);
    setInvoices(invResp.data || []);
    setClients(cliResp.data || []);
    // La variante sin foto propia usa la de su modelo
    setProducts((prodResp.data || []).map(({ catalog_models: model, ...p }) => ({ ...p, image_url: p.image_url || model?.image_url || null })));
    if (pmResp.data?.length) setPaymentMethods(pmResp.data.map((p) => p.name));

    // Load installments for all invoices
    const invIds = (invResp.data || []).map((i) => i.id);
    if (invIds.length > 0) {
      const { data: instData } = await supabase
        .from('invoice_installments')
        .select('*')
        .in('invoice_id', invIds)
        .order('installment_num', { ascending: true });
      const grouped = {};
      (instData || []).forEach((c) => {
        if (!grouped[c.invoice_id]) grouped[c.invoice_id] = [];
        grouped[c.invoice_id].push(c);
      });
      setInstallmentsByInvoice(grouped);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const rate = Number(profile?.exchange_rate_ars_per_usd) || 0;

  const rows = useMemo(() => withClientNames(invoices, clients), [invoices, clients]);
  // presupuesto id → la factura que salió de él
  const convertedBy = useMemo(
    () => new Map(invoices.filter((i) => i.source_invoice_id).map((i) => [i.source_invoice_id, i])),
    [invoices],
  );
  const counts = useMemo(() => ({
    factura: invoices.filter((i) => i.type === 'factura').length,
    presupuesto: invoices.filter((i) => i.type === 'presupuesto').length,
  }), [invoices]);

  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));
  const setItem = (idx, k, v) => {
    setEditing((e) => {
      const items = [...e.items];
      const item = { ...items[idx], [k]: v };
      if (k === 'price_usd' && rate && v !== '') {
        item.price_ars = String(Math.round(Number(v) * rate));
      }
      items[idx] = item;
      return { ...e, items };
    });
  };
  const pickProduct = (idx, product) => {
    setEditing((e) => {
      const items = [...e.items];
      items[idx] = {
        ...items[idx],
        name: product.name,
        price_ars: product.price_ars != null ? String(product.price_ars) : items[idx].price_ars,
        price_usd: product.price_usd != null ? String(product.price_usd) : items[idx].price_usd,
        image_url: product.image_url || '',
      };
      return { ...e, items };
    });
  };
  const addRow = () => setEditing((e) => ({ ...e, items: [...e.items, { name: '', qty: 1, price_usd: '', price_ars: '', image_url: '' }] }));
  const delRow = (idx) => setEditing((e) => ({ ...e, items: e.items.filter((_, i) => i !== idx) }));

  const handleItemImageUpload = async (idx, file) => {
    if (!file) return;
    setUploadingItemIdx(idx);
    const ext = file.name.split('.').pop();
    const path = `invoice-item-${Date.now()}-${idx}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKETS.productImages)
      .upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) {
      alert('Error subiendo imagen: ' + error.message);
      setUploadingItemIdx(null);
      return;
    }
    const { data } = supabase.storage.from(BUCKETS.productImages).getPublicUrl(path);
    setItem(idx, 'image_url', data.publicUrl);
    setUploadingItemIdx(null);
  };

  const totals = useMemo(() => {
    if (!editing) return { ars: 0, usd: 0 };
    return editing.items.reduce((acc, it) => {
      const q = Number(it.qty) || 0;
      acc.ars += q * (Number(it.price_ars) || 0);
      acc.usd += q * (Number(it.price_usd) || 0);
      return acc;
    }, { ars: 0, usd: 0 });
  }, [editing]);

  const generateInstallmentPlan = () => {
    const n = parseInstallmentCount(editing?.payment_method);
    if (!n || totals.ars <= 0) {
      alert('Seleccioná una forma de pago con cuotas y agregá ítems al detalle.');
      return;
    }
    const per = Math.round(totals.ars / n);
    const today = new Date();
    const plan = Array.from({ length: n }).map((_, i) => {
      const due = new Date(today);
      due.setMonth(due.getMonth() + i + 1);
      const amount = i === n - 1 ? totals.ars - per * (n - 1) : per;
      return {
        installment_num: i + 1,
        amount,
        due_date: due.toISOString().slice(0, 10),
        status: 'pendiente',
      };
    });
    setInstallmentPlan(plan);
  };

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
        image_url: it.image_url || null,
      }));
    const payload = {
      client_id: editing.client_id,
      type: editing.type,
      items: cleanedItems,
      total_ars: totals.ars,
      total_usd: totals.usd || null,
      status: editing.status,
      payment_method: editing.payment_method || null,
    };

    let invoiceId = editing.id;
    let resp;
    if (editing.id) {
      resp = await supabase.from(TABLES.invoices).update(payload).eq('id', editing.id).select().single();
    } else {
      resp = await supabase.from(TABLES.invoices).insert(payload).select().single();
    }
    if (resp.error) { setSaving(false); alert(resp.error.message); return; }
    invoiceId = resp.data.id;

    // Persist installment plan if present
    if (installmentPlan.length > 0) {
      await supabase.from('invoice_installments').delete().eq('invoice_id', invoiceId);
      const rows = installmentPlan.map((c) => ({
        invoice_id: invoiceId,
        installment_num: c.installment_num,
        amount: c.amount,
        due_date: c.due_date,
        status: c.status || 'pendiente',
      }));
      await supabase.from('invoice_installments').insert(rows);
    } else if (editing.id) {
      // If editing and no plan, leave existing cuotas alone (do not auto-delete)
    }

    setSaving(false);
    setEditing(null);
    setInstallmentPlan([]);
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

  const openPreview = async (inv) => {
    const cli = clients.find((c) => c.id === inv.client_id);
    setEditing(null);
    const { data: insts } = await supabase
      .from('invoice_installments')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('installment_num');
    setPreviewing({ inv, client: cli, installments: insts || [] });
  };

  const openEdit = async (inv) => {
    setPreviewing(null);
    const { data: insts } = await supabase
      .from('invoice_installments')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('installment_num');
    setInstallmentPlan(insts || []);
    setEditing({
      ...EMPTY,
      ...inv,
      payment_method: inv.payment_method || '',
      items: inv.items?.length ? inv.items.map((it) => ({
        name: it.name || '',
        qty: it.qty || 1,
        price_usd: it.price_usd ?? '',
        price_ars: it.price_ars ?? '',
        image_url: it.image_url || '',
      })) : [{ name: '', qty: 1, price_usd: '', price_ars: '', image_url: '' }],
    });
  };

  const openNew = (type = EMPTY.type) => {
    setPreviewing(null);
    setInstallmentPlan([]);
    setEditing({ ...EMPTY, type, items: [{ name: '', qty: 1, price_usd: '', price_ars: '', image_url: '' }] });
  };

  const convertToInvoice = async (quote) => {
    if (!confirm('¿Convertir este presupuesto en factura? Se crea una factura nueva con los mismos ítems y el presupuesto queda aprobado.')) return;
    setConvertingId(quote.id);
    const { data, error } = await supabase.rpc('convert_quote_to_invoice', { p_quote_id: quote.id });
    setConvertingId(null);
    if (error) { alert(error.message); return; }
    await load();
    openPreview(data);
  };

  const closeEdit = () => {
    setEditing(null);
    setInstallmentPlan([]);
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
    const msg = `Hola ${cliName}! Te envío el ${docType} N° ${num} de ${profile?.store_name || 'Tu Tienda'}. Total: ${formatARS(previewing?.inv.total_ars || 0)}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const panelOpen = !!editing || !!previewing;
  const tableProps = {
    rows, query, installmentsByInvoice, convertedBy, convertingId,
    onPreview: openPreview, onEdit: openEdit, onRemove: remove, onStatusChange: updateStatus, onConvert: convertToInvoice,
  };

  return (
    <div className="page-layout">
      <div className={`page-layout__main ${panelOpen ? 'has-panel' : ''}`}>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Facturas y Presupuestos</h1>
          <p className="admin__subtitle">{counts.factura} facturas · {counts.presupuesto} presupuestos. Tipo de cambio: {rate ? formatARS(rate) + '/USD' : '— configurar en Tienda'}</p>
        </div>
        <Button onClick={() => openNew()}><Plus data-icon="inline-start" /> Nuevo</Button>
      </div>

      <div className="toolbar">
        <input
          className="input toolbar__search"
          type="search"
          placeholder="Buscar por cliente…"
          aria-label="Buscar facturas y presupuestos por cliente"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Solo la primera carga: al recargar, las tablas quedan montadas y conservan su filtro y orden */}
      {loading && invoices.length === 0 ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : (
        <div className="invoices-split-wrap">
          <div className="invoices-split">
            <InvoiceTable
              {...tableProps}
              type="factura"
              title="Facturas"
              emptyText="No hay facturas"
              onNew={() => openNew('factura')}
            />
            <InvoiceTable
              {...tableProps}
              type="presupuesto"
              title="Presupuestos"
              emptyText="No hay presupuestos"
              onNew={() => openNew('presupuesto')}
            />
          </div>
        </div>
      )}

      </div>

      {/* EDIT PANEL */}
      <InlinePanel
        wide
        open={!!editing}
        onClose={closeEdit}
        title={editing?.type === 'factura'
          ? (editing?.id ? 'Editar factura' : 'Nueva factura')
          : (editing?.id ? 'Editar presupuesto' : 'Nuevo presupuesto')}
        footer={
          <>
            <Button variant="outline" onClick={closeEdit}>Cancelar</Button>
            <Button form="inv-form" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
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
                <select className="select" value={editing.type} onChange={(e) => setField('type', e.target.value)} disabled={!!editing.id}>
                  <option value="presupuesto">Presupuesto</option>
                  <option value="factura">Factura</option>
                </select>
                {editing.id && editing.type === 'presupuesto' && (
                  <p className="field__hint">Para facturarlo, usá “Convertir en factura” en la tabla.</p>
                )}
              </div>
              <div className="field">
                <label className="field__label">Forma de pago</label>
                <select className="select" value={editing.payment_method || ''} onChange={(e) => setField('payment_method', e.target.value)}>
                  <option value="">— sin especificar —</option>
                  {paymentMethods.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field__label">Estado</label>
                <select className="select" value={editing.status} onChange={(e) => setField('status', e.target.value)}>
                  <option value="pendiente">Pendiente</option>
                  <option value="aprobado">Aprobado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <label className="field__label" style={{ display: 'block', marginBottom: 8 }}>Ítems</label>
              <div className="invoice-items">
                {editing.items.map((it, idx) => (
                  <ItemRow
                    key={idx}
                    item={it}
                    idx={idx}
                    products={products}
                    onChange={(k, v) => setItem(idx, k, v)}
                    onPick={(product) => pickProduct(idx, product)}
                    onRemove={() => delRow(idx)}
                    onUpload={(file) => handleItemImageUpload(idx, file)}
                    uploading={uploadingItemIdx === idx}
                  />
                ))}
              </div>
              <Button variant="ghost" size="sm" type="button" style={{ marginTop: 8 }} onClick={addRow}><Plus data-icon="inline-start" /> Agregar ítem</Button>
              {!rate && <p className="field__hint" style={{ color: 'var(--warning)', marginTop: 6 }}>Sin tipo de cambio configurado: el USD no se convierte automáticamente a ARS.</p>}
            </div>

            <div className="invoice-totals">
              {totals.usd > 0 && <div className="invoice-totals__row"><span>Total USD</span><strong>{formatUSD(totals.usd)}</strong></div>}
              <div className="invoice-totals__row invoice-totals__row--final"><span>Total ARS</span><strong>{formatARS(totals.ars)}</strong></div>
            </div>

            {isInstallmentMethod(editing.payment_method) && (
              <div className="installment-builder">
                <div className="installment-builder__head">
                  <div>
                    <strong>Plan de cuotas</strong>
                    <p className="field__hint" style={{ margin: 0 }}>
                      {parseInstallmentCount(editing.payment_method)} cuotas · {formatARS(totals.ars)} total
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={generateInstallmentPlan}>
                    <CalendarClock data-icon="inline-start" /> {installmentPlan.length ? 'Regenerar plan' : 'Generar plan'}
                  </Button>
                </div>
                {installmentPlan.length > 0 && (
                  <table className="installment-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Vencimiento</th>
                        <th>Importe</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {installmentPlan.map((c, i) => (
                        <tr key={i}>
                          <td>{c.installment_num}</td>
                          <td>
                            <input
                              type="date"
                              className="input"
                              value={c.due_date || ''}
                              onChange={(e) => setInstallmentPlan((arr) => arr.map((x, j) => j === i ? { ...x, due_date: e.target.value } : x))}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="input"
                              value={c.amount}
                              onChange={(e) => setInstallmentPlan((arr) => arr.map((x, j) => j === i ? { ...x, amount: Number(e.target.value) || 0 } : x))}
                            />
                          </td>
                          <td>
                            <select
                              className="select"
                              value={c.status}
                              onChange={(e) => setInstallmentPlan((arr) => arr.map((x, j) => j === i ? { ...x, status: e.target.value } : x))}
                            >
                              <option value="pendiente">Pendiente</option>
                              <option value="pagada">Pagada</option>
                              <option value="vencida">Vencida</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
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
            <Button variant="outline" onClick={() => setPreviewing(null)}>Cerrar</Button>
            <Button variant="outline" onClick={sendWhatsapp}><MessageCircle data-icon="inline-start" /> WhatsApp</Button>
            <Button variant="outline" onClick={handleExportPng} disabled={exportingId === 'png'}>{exportingId === 'png' ? 'Generando…' : 'PNG'}</Button>
            <Button onClick={handleExportPdf} disabled={exportingId === 'pdf'}>{exportingId === 'pdf' ? 'Generando…' : 'PDF'}</Button>
          </>
        }
      >
        {previewing && (
          <div style={{ background: 'var(--surface-sunken)', padding: 16, borderRadius: 12, overflow: 'auto' }}>
            <InvoiceDocument
              ref={docRef}
              invoice={previewing.inv}
              profile={profile}
              client={previewing.client}
              installments={previewing.installments}
            />
          </div>
        )}
      </InlinePanel>
    </div>
  );
}
