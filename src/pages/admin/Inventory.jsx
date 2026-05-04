import { useEffect, useState } from 'react';
import { supabase, TABLES, BUCKETS } from '../../lib/supabase';
import InlinePanel from '../../components/ui/InlinePanel';
import TaxonomyPicker from '../../components/TaxonomyPicker';
import { formatARS, formatUSD } from '../../lib/format';

const EMPTY = {
  id: null,
  name: '',
  category: '',
  model: '',
  capacity: '',
  condition: '',
  description: '',
  price_ars: '',
  price_usd: '',
  stock: 0,
  image_url: '',
  is_active: true,
};

function buildName(t) {
  const parts = [t.model || t.category, t.capacity, t.condition && `(${t.condition})`].filter(Boolean);
  return parts.join(' ').trim();
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('Todas');
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoName, setAutoName] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(TABLES.products).select('*').order('created_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) => {
    const okCat = filterCat === 'Todas' || p.category === filterCat;
    const okSearch = !search || p.name?.toLowerCase().includes(search.toLowerCase());
    return okCat && okSearch;
  });

  const allCategories = [...new Set(items.map((p) => p.category).filter(Boolean))];

  const openNew = () => { setEditing({ ...EMPTY }); setAutoName(true); };
  const openEdit = (p) => { setEditing({ ...EMPTY, ...p }); setAutoName(false); };
  const close = () => setEditing(null);

  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));

  const handleTaxonomyChange = (t) => {
    setEditing((e) => {
      const next = {
        ...e,
        category: t.type || e.category,
        model: t.model,
        capacity: t.capacity,
        condition: t.condition,
        description: t.description ?? e.description,
      };
      if (autoName) next.name = buildName({ category: next.category, model: next.model, capacity: next.capacity, condition: next.condition }) || e.name;
      return next;
    });
  };

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `prod-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKETS.productImages).upload(path, file, { cacheControl: '3600', upsert: false });
    if (!error) {
      const { data } = supabase.storage.from(BUCKETS.productImages).getPublicUrl(path);
      setField('image_url', data.publicUrl);
    } else { alert('Error subiendo imagen: ' + error.message); }
    setUploading(false);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: editing.name || buildName(editing) || 'Sin nombre',
      category: editing.category || 'Otros',
      model: editing.model || null,
      capacity: editing.capacity || null,
      condition: editing.condition || null,
      description: editing.description || null,
      price_ars: editing.price_ars ? Number(editing.price_ars) : null,
      price_usd: editing.price_usd ? Number(editing.price_usd) : null,
      stock: Number(editing.stock) || 0,
      image_url: editing.image_url || null,
      is_active: !!editing.is_active,
    };
    let resp;
    if (editing.id) resp = await supabase.from(TABLES.products).update(payload).eq('id', editing.id);
    else resp = await supabase.from(TABLES.products).insert(payload);
    setSaving(false);
    if (resp.error) { alert(resp.error.message); return; }
    close(); load();
  };

  const toggleActive = async (p) => {
    await supabase.from(TABLES.products).update({ is_active: !p.is_active }).eq('id', p.id); load();
  };
  const remove = async (p) => {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción es permanente.`)) return;
    await supabase.from(TABLES.products).delete().eq('id', p.id); load();
  };

  return (
    <div className="page-layout">
      <div className={`page-layout__main ${editing ? 'has-panel' : ''}`}>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Inventario</h1>
          <p className="admin__subtitle">{items.length} productos en total.</p>
        </div>
        <button className="btn btn--primary" onClick={openNew}>+ Nuevo producto</button>
      </div>

      <div className="toolbar">
        <input className="input toolbar__search" placeholder="Buscar por nombre…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ width: 'auto' }}>
          <option>Todas</option>
          {allCategories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="admin-card empty">
          <div className="empty__icon">📦</div>
          <div className="empty__title">No hay productos</div>
          <p>Cargá tu primer producto para empezar.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Capacidad</th>
                <th>Estado</th>
                <th>Precio ARS</th>
                <th>Stock</th>
                <th>Visible</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 56 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-secondary)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>}
                    </div>
                  </td>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.category}</td>
                  <td>{p.capacity || '—'}</td>
                  <td>{p.condition || '—'}</td>
                  <td>{p.price_ars ? formatARS(p.price_ars) : '—'}</td>
                  <td>{p.stock || 0}</td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge--green' : 'badge--gray'}`}>{p.is_active ? 'Activo' : 'Oculto'}</span>
                  </td>
                  <td>
                    <div className="table__actions">
                      <button className="btn btn--sm btn--ghost" onClick={() => openEdit(p)}>Editar</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => toggleActive(p)}>{p.is_active ? 'Ocultar' : 'Mostrar'}</button>
                      <button className="btn btn--sm btn--ghost" onClick={() => remove(p)} style={{ color: 'var(--accent-red)' }}>Borrar</button>
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
        onClose={close}
        title={editing?.id ? 'Editar producto' : 'Nuevo producto'}
        footer={
          <>
            <button type="button" className="btn btn--ghost" onClick={close}>Cancelar</button>
            <button type="submit" form="prod-form" className="btn btn--primary" disabled={saving || uploading}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>
        }
      >
        {editing && (
          <form id="prod-form" onSubmit={save}>
            <Disclosure title="Carga rápida (Tipo · Modelo · Capacidad · Estado)" defaultOpen>
              <TaxonomyPicker
                value={{
                  type: editing.category,
                  model: editing.model,
                  capacity: editing.capacity,
                  condition: editing.condition,
                  description: editing.description,
                }}
                onChange={handleTaxonomyChange}
              />
            </Disclosure>

            <Disclosure title="Detalles, precios y stock" defaultOpen>
              <div className="form-grid">
                <div className="field field--full">
                  <label className="field__label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Nombre del producto</span>
                    <label style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)', display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="checkbox" checked={autoName} onChange={(e) => setAutoName(e.target.checked)} />
                      Auto-generar
                    </label>
                  </label>
                  <input className="input" value={editing.name} onChange={(e) => { setAutoName(false); setField('name', e.target.value); }} required placeholder="ej: iPhone 15 Pro 256GB Nuevo sellado" />
                </div>

                <div className="field"><label className="field__label">Stock</label>
                  <input type="number" className="input" value={editing.stock} onChange={(e) => setField('stock', e.target.value)} min="0" />
                </div>
                <div className="field"><label className="field__label">Precio ARS</label>
                  <input type="number" className="input" value={editing.price_ars} onChange={(e) => setField('price_ars', e.target.value)} min="0" step="0.01" />
                </div>
                <div className="field"><label className="field__label">Precio USD</label>
                  <input type="number" className="input" value={editing.price_usd} onChange={(e) => setField('price_usd', e.target.value)} min="0" step="0.01" />
                </div>

                <div className="field field--full">
                  <label className="field__label">Imagen</label>
                  <div className="image-uploader">
                    <div className="image-uploader__preview">
                      {editing.image_url ? <img src={editing.image_url} alt="" /> : <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>—</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} />
                      <p className="field__hint" style={{ marginTop: 4 }}>{uploading ? 'Subiendo…' : 'JPG, PNG o WebP'}</p>
                    </div>
                  </div>
                </div>

                <div className="field field--full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                    <span>Mostrar en el storefront</span>
                  </label>
                </div>
              </div>
            </Disclosure>
          </form>
        )}
      </InlinePanel>
    </div>
  );
}

function Disclosure({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`disclosure ${open ? 'is-open' : ''}`}>
      <button type="button" className="disclosure__head" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span className="disclosure__caret">▾</span>
      </button>
      <div className="disclosure__body">{children}</div>
    </div>
  );
}
