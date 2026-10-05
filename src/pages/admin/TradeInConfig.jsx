import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase, TABLES } from '../../lib/supabase';
import InlinePanel from '../../components/ui/InlinePanel';
import TaxonomyPicker from '../../components/TaxonomyPicker';
import SortableHeader, { sortItems } from '../../components/ui/SortableHeader';
import { formatARS } from '../../lib/format';

const EMPTY = {
  id: null,
  type_name: 'iPhone',
  model: '',
  capacity: '',
  device_model: '',
  price_excellent: '',
  price_good: '',
  price_damaged: '',
  is_active: true,
};

function buildDeviceModel(t) {
  return [t.model, t.capacity].filter(Boolean).join(' ').trim();
}

export default function TradeInConfig() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sort, setSort] = useState(null);
  const [filterActive, setFilterActive] = useState('Todos');

  const visible = useMemo(() => {
    const base = models.filter((m) => {
      if (filterActive === 'Activos') return m.is_active;
      if (filterActive === 'Ocultos') return !m.is_active;
      return true;
    });
    return sortItems(base, sort);
  }, [models, sort, filterActive]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from(TABLES.tradeIn).select('*').order('device_model', { ascending: true });
    setModels(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTax = (t) => {
    setEditing((e) => {
      // Permitir vaciar (cuando el usuario re-selecciona "Seleccionar…")
      const next = {
        ...e,
        type_name: t.type ?? e.type_name,
        model: t.model ?? '',
        capacity: t.capacity ?? '',
      };
      next.device_model = buildDeviceModel({ model: next.model, capacity: next.capacity });
      return next;
    });
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      type_name: editing.type_name || 'iPhone',
      model: editing.model || null,
      capacity: editing.capacity || null,
      device_model: (editing.device_model || buildDeviceModel(editing) || '').trim(),
      price_excellent: editing.price_excellent ? Number(editing.price_excellent) : null,
      price_good: editing.price_good ? Number(editing.price_good) : null,
      price_damaged: editing.price_damaged ? Number(editing.price_damaged) : null,
      is_active: !!editing.is_active,
    };
    let resp;
    if (editing.id) resp = await supabase.from(TABLES.tradeIn).update(payload).eq('id', editing.id);
    else resp = await supabase.from(TABLES.tradeIn).insert(payload);
    setSaving(false);
    if (resp.error) { alert(resp.error.message); return; }
    setEditing(null); load();
  };

  const remove = async (m) => {
    if (!confirm(`¿Eliminar "${m.device_model}"?`)) return;
    await supabase.from(TABLES.tradeIn).delete().eq('id', m.id); load();
  };
  const toggleActive = async (m) => {
    await supabase.from(TABLES.tradeIn).update({ is_active: !m.is_active }).eq('id', m.id); load();
  };
  const setField = (k, v) => setEditing((e) => ({ ...e, [k]: v }));

  return (
    <div className="page-layout">
      <div className={`page-layout__main ${editing ? 'has-panel' : ''}`}>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Plan Canje</h1>
          <p className="admin__subtitle">Precios de cotización por modelo y estado.</p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}><Plus data-icon="inline-start" /> Nuevo modelo</Button>
      </div>

      <div className="toolbar">
        <select className="select" value={filterActive} onChange={(e) => setFilterActive(e.target.value)} style={{ width: 'auto' }}>
          <option>Todos</option>
          <option>Activos</option>
          <option>Ocultos</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : models.length === 0 ? (
        <Card className="empty">
          <RefreshCw className="empty__icon mx-auto block size-12" strokeWidth={1.5} aria-hidden="true" />
          <div className="empty__title">No hay modelos cargados</div>
          <p>Cargá modelos para que la calculadora del storefront los muestre.</p>
        </Card>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <SortableHeader label="Modelo" sortKey="model" sort={sort} onSort={setSort} />
                <SortableHeader label="Capacidad" sortKey="capacity" sort={sort} onSort={setSort} />
                <SortableHeader label="Excelente" sortKey="price_excellent" sort={sort} onSort={setSort} align="right" />
                <SortableHeader label="Bueno" sortKey="price_good" sort={sort} onSort={setSort} align="right" />
                <SortableHeader label="Con daños" sortKey="price_damaged" sort={sort} onSort={setSort} align="right" />
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.model || m.device_model}</strong></td>
                  <td>{m.capacity || '—'}</td>
                  <td>{formatARS(m.price_excellent)}</td>
                  <td>{formatARS(m.price_good)}</td>
                  <td>{formatARS(m.price_damaged)}</td>
                  <td>
                    <span className={`badge ${m.is_active ? 'badge--green' : 'badge--gray'}`}>{m.is_active ? 'Activo' : 'Oculto'}</span>
                  </td>
                  <td>
                    <div className="table__actions">
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ ...EMPTY, ...m })}><Pencil data-icon="inline-start" /> Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(m)}>{m.is_active ? 'Ocultar' : 'Mostrar'}</Button>
                      <Button variant="destructive" size="sm" onClick={() => remove(m)}><Trash2 data-icon="inline-start" /> Borrar</Button>
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
        title={editing?.id ? 'Editar modelo' : 'Nuevo modelo de canje'}
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button form="ti-form" type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </>
        }
      >
        {editing && (
          <form id="ti-form" onSubmit={save}>
            <Disclosure title="Carga rápida (Tipo · Modelo · Capacidad)" defaultOpen>
              <TaxonomyPicker
                fixedType="iPhone"
                value={{
                  type: 'iPhone',
                  model: editing.model || '',
                  capacity: editing.capacity || '',
                }}
                onChange={handleTax}
                showDescription={false}
                hideCondition
              />
            </Disclosure>

            <Disclosure title="Precios por estado" defaultOpen>
              <div className="form-grid">
                <div className="field field--full">
                  <label className="field__label">Etiqueta visible (auto)</label>
                  <input className="input" value={editing.device_model} onChange={(e) => setField('device_model', e.target.value)} placeholder="Ej: iPhone 15 Pro 256GB" required />
                </div>
                <div className="field">
                  <label className="field__label">Excelente (ARS)</label>
                  <input type="number" className="input" min="0" value={editing.price_excellent} onChange={(e) => setField('price_excellent', e.target.value)} />
                </div>
                <div className="field">
                  <label className="field__label">Bueno (ARS)</label>
                  <input type="number" className="input" min="0" value={editing.price_good} onChange={(e) => setField('price_good', e.target.value)} />
                </div>
                <div className="field field--full">
                  <label className="field__label">Con daños (ARS)</label>
                  <input type="number" className="input" min="0" value={editing.price_damaged} onChange={(e) => setField('price_damaged', e.target.value)} />
                </div>
                <div className="field field--full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editing.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                    <span>Mostrar en el calculador del storefront</span>
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
        <ChevronDown className="disclosure__caret size-4" aria-hidden="true" />
      </button>
      <div className="disclosure__body">{children}</div>
    </div>
  );
}
