import { useEffect, useState } from 'react';
import { supabase, TABLES } from '../../lib/supabase';
import InlinePanel from '../../components/ui/InlinePanel';
import { formatDate } from '../../lib/format';

const EMPTY = { id: null, name: '', phone: '', email: '', notes: '' };

export default function Clients() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(TABLES.clients).select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  });

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

  return (
    <div className="page-layout">
      <div className={`page-layout__main ${editing ? 'has-panel' : ''}`}>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Clientes</h1>
          <p className="admin__subtitle">{items.length} contactos en el CRM.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setEditing({ ...EMPTY })}>+ Nuevo cliente</button>
      </div>

      <div className="toolbar">
        <input className="input toolbar__search" placeholder="Buscar por nombre, teléfono, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="admin-card empty">
          <div className="empty__icon">👥</div>
          <div className="empty__title">No hay clientes</div>
          <p>Empezá a sumar contactos a tu CRM.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Alta</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong>{c.notes && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{c.notes}</div>}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.email || '—'}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--sm btn--ghost" onClick={() => setEditing({ ...EMPTY, ...c })}>Editar</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => remove(c)} style={{ color: 'var(--accent-red)' }}>Borrar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>
      <InlinePanel
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar cliente' : 'Nuevo cliente'}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setEditing(null)}>Cancelar</button>
            <button form="cli-form" type="submit" className="btn btn--primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
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
                <input className="input" value={editing.phone || ''} onChange={(e) => setField('phone', e.target.value)} placeholder="+5492994565758" />
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
    </div>
  );
}
