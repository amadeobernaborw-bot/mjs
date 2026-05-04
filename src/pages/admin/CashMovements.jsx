import { useEffect, useMemo, useState } from 'react';
import { supabase, TABLES } from '../../lib/supabase';
import Modal from '../../components/ui/Modal';
import { formatARS } from '../../lib/format';

const EMPTY = {
  id: null,
  type: 'entrada',
  category: '',
  detail: '',
  amount: '',
  payment_method: '',
  occurred_at: new Date().toISOString().slice(0, 16),
};

export default function CashMovements() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('todos');
  const [filterCat, setFilterCat] = useState('todas');
  const [editorOpen, setEditorOpen] = useState(null);

  const load = async () => {
    setLoading(true);
    const [m, c, p] = await Promise.all([
      supabase.from(TABLES.cashMovements).select('*').order('occurred_at', { ascending: false }),
      supabase.from(TABLES.cashCategories).select('*').order('name'),
      supabase.from(TABLES.paymentMethods).select('*').order('name'),
    ]);
    setItems(m.data || []);
    setCategories(c.data || []);
    setMethods(p.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const entrada = items.filter((i) => i.type === 'entrada').reduce((s, i) => s + Number(i.amount || 0), 0);
    const salida  = items.filter((i) => i.type === 'salida').reduce((s, i) => s + Number(i.amount || 0), 0);
    return { entrada, salida, balance: entrada - salida };
  }, [items]);

  const filtered = items.filter((i) => {
    const okType = filterType === 'todos' || i.type === filterType;
    const okCat = filterCat === 'todas' || i.category === filterCat;
    return okType && okCat;
  });

  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));

  const categoriesForType = categories.filter((c) => c.type === editing?.type || c.type === 'ambos');

  const handleCatChange = (e) => {
    const v = e.target.value;
    if (v === '__new') { setEditorOpen('cat'); return; }
    setField('category', v);
  };
  const handleMethodChange = (e) => {
    const v = e.target.value;
    if (v === '__new') { setEditorOpen('method'); return; }
    setField('payment_method', v);
  };

  const addCustom = async (name) => {
    if (!name?.trim()) { setEditorOpen(null); return; }
    if (editorOpen === 'cat') {
      await supabase.from(TABLES.cashCategories).insert({ name: name.trim(), type: editing.type });
      setField('category', name.trim());
    } else if (editorOpen === 'method') {
      await supabase.from(TABLES.paymentMethods).insert({ name: name.trim() });
      setField('payment_method', name.trim());
    }
    setEditorOpen(null);
    load();
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      type: editing.type,
      category: editing.category,
      detail: editing.detail || null,
      amount: Number(editing.amount),
      payment_method: editing.payment_method,
      occurred_at: new Date(editing.occurred_at).toISOString(),
    };
    let resp;
    if (editing.id) resp = await supabase.from(TABLES.cashMovements).update(payload).eq('id', editing.id);
    else resp = await supabase.from(TABLES.cashMovements).insert(payload);
    setSaving(false);
    if (resp.error) { alert(resp.error.message); return; }
    setEditing(null); load();
  };

  const remove = async (m) => {
    if (!confirm('¿Eliminar movimiento?')) return;
    await supabase.from(TABLES.cashMovements).delete().eq('id', m.id); load();
  };

  return (
    <>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Movimientos de caja</h1>
          <p className="admin__subtitle">Registro rápido de entradas y salidas.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setEditing({ ...EMPTY })}>+ Nuevo movimiento</button>
      </div>

      <div className="stat-grid">
        <div className="stat"><div className="stat__label">Entradas</div><div className="stat__value" style={{ color: '#1ea846', fontSize: 26 }}>{formatARS(totals.entrada)}</div></div>
        <div className="stat"><div className="stat__label">Salidas</div><div className="stat__value" style={{ color: 'var(--accent-red)', fontSize: 26 }}>{formatARS(totals.salida)}</div></div>
        <div className="stat"><div className="stat__label">Balance</div><div className="stat__value" style={{ fontSize: 26, color: totals.balance >= 0 ? 'var(--accent-blue)' : 'var(--accent-red)' }}>{formatARS(totals.balance)}</div></div>
        <div className="stat"><div className="stat__label">Movimientos</div><div className="stat__value">{items.length}</div></div>
      </div>

      <div className="toolbar">
        <select className="select" value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: 'auto' }}>
          <option value="todos">Todos los tipos</option>
          <option value="entrada">Entradas</option>
          <option value="salida">Salidas</option>
        </select>
        <select className="select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ width: 'auto' }}>
          <option value="todas">Todas las categorías</option>
          {[...new Set(items.map((i) => i.category))].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="admin-card empty">
          <div className="empty__icon">💰</div>
          <div className="empty__title">No hay movimientos</div>
          <p>Cargá el primero para empezar a llevar la caja.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Detalle</th>
                <th>Forma de pago</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.occurred_at).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td><span className={`badge ${m.type === 'entrada' ? 'badge--green' : 'badge--red'}`}>{m.type}</span></td>
                  <td>{m.category}</td>
                  <td style={{ maxWidth: 240, color: 'var(--text-secondary)' }}>{m.detail || '—'}</td>
                  <td>{m.payment_method}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: m.type === 'entrada' ? '#1ea846' : 'var(--accent-red)' }}>
                    {m.type === 'salida' ? '−' : '+'}{formatARS(m.amount)}
                  </td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--sm btn--ghost" onClick={() => setEditing({ ...EMPTY, ...m, occurred_at: new Date(m.occurred_at).toISOString().slice(0,16) })}>Editar</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => remove(m)} style={{ color: 'var(--accent-red)' }}>Borrar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar movimiento' : 'Nuevo movimiento'}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button form="cm-form" type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
          </>
        }
      >
        {editing && (
          <form id="cm-form" onSubmit={save}>
            <div className="form-grid">
              <div className="field">
                <label className="field__label">Tipo</label>
                <select className="select" value={editing.type} onChange={(e) => { setField('type', e.target.value); setField('category', ''); }}>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>
              </div>
              <div className="field">
                <label className="field__label">Fecha y hora</label>
                <input type="datetime-local" className="input" value={editing.occurred_at} onChange={(e) => setField('occurred_at', e.target.value)} required />
              </div>
              <div className="field">
                <label className="field__label">Categoría</label>
                <select className="select" value={editing.category} onChange={handleCatChange} required>
                  <option value="">Seleccionar…</option>
                  {categoriesForType.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="__new">＋ Otra (cargar nueva)…</option>
                </select>
              </div>
              <div className="field">
                <label className="field__label">Forma de pago</label>
                <select className="select" value={editing.payment_method} onChange={handleMethodChange} required>
                  <option value="">Seleccionar…</option>
                  {methods.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value="__new">＋ Otra (cargar nueva)…</option>
                </select>
              </div>
              <div className="field field--full">
                <label className="field__label">Detalle</label>
                <input className="input" value={editing.detail} onChange={(e) => setField('detail', e.target.value)} placeholder="Ej: Venta iPhone 15, factura 234, cliente Pérez" />
              </div>
              <div className="field field--full">
                <label className="field__label">Monto (ARS)</label>
                <input type="number" className="input" min="0" step="0.01" value={editing.amount} onChange={(e) => setField('amount', e.target.value)} required />
              </div>
            </div>
          </form>
        )}
      </Modal>

      {editorOpen && (
        <div className="modal-backdrop" onClick={() => setEditorOpen(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h3 className="modal__title">Cargar {editorOpen === 'cat' ? 'nueva categoría' : 'nuevo método de pago'}</h3>
              <button className="modal__close" onClick={() => setEditorOpen(null)}>×</button>
            </div>
            <CustomInput onSave={addCustom} onCancel={() => setEditorOpen(null)} />
          </div>
        </div>
      )}
    </>
  );
}

function CustomInput({ onSave, onCancel }) {
  const [v, setV] = useState('');
  return (
    <>
      <div className="modal__body">
        <div className="field">
          <label className="field__label">Nombre</label>
          <input className="input" autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSave(v)} />
        </div>
      </div>
      <div className="modal__foot">
        <button className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn--primary" onClick={() => onSave(v)} disabled={!v.trim()}>Guardar</button>
      </div>
    </>
  );
}
