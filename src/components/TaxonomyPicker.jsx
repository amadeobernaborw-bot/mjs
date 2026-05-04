import { useEffect, useState, useMemo } from 'react';
import { supabase, TABLES } from '../lib/supabase';

/**
 * Hook que carga la taxonomía editable: tipos, modelos, capacidades, estados.
 * Si una tabla no existe (migración no corrida) devuelve fallbacks hardcoded.
 */
export function useTaxonomy() {
  const [data, setData] = useState({ types: [], models: [], capacities: [], conditions: [], loading: true });

  const load = async () => {
    const [types, models, caps, conds] = await Promise.all([
      supabase.from(TABLES.productTypes).select('*').order('name'),
      supabase.from(TABLES.productModels).select('*').order('name'),
      supabase.from(TABLES.productCapacities).select('*').order('sort_order'),
      supabase.from(TABLES.productConditions).select('*').order('sort_order'),
    ]);
    setData({
      types: types.data || [],
      models: models.data || [],
      capacities: caps.data || [],
      conditions: conds.data || [],
      loading: false,
    });
  };

  useEffect(() => { load(); }, []);

  return { ...data, reload: load };
}

/**
 * TaxonomyPicker — dropdowns en cascada con opción de carga personalizada.
 * Props:
 *   value: { type, model, capacity, condition, description }
 *   onChange: (newValue) => void
 *   showDescription: boolean
 */
export default function TaxonomyPicker({ value, onChange, showDescription = true, hideCondition = false }) {
  const tax = useTaxonomy();
  const [editorOpen, setEditorOpen] = useState(null); // 'type' | 'model' | 'capacity' | 'condition'

  const set = (k, v) => onChange({ ...value, [k]: v });

  const modelsForType = useMemo(
    () => tax.models.filter((m) => m.type_name === value.type),
    [tax.models, value.type]
  );

  const handleType = (e) => {
    const v = e.target.value;
    if (v === '__new') { setEditorOpen('type'); return; }
    onChange({ ...value, type: v, model: '', capacity: value.capacity, condition: value.condition });
  };
  const handleModel = (e) => {
    const v = e.target.value;
    if (v === '__new') { setEditorOpen('model'); return; }
    set('model', v);
  };
  const handleCap = (e) => {
    const v = e.target.value;
    if (v === '__new') { setEditorOpen('capacity'); return; }
    set('capacity', v);
  };
  const handleCond = (e) => {
    const v = e.target.value;
    if (v === '__new') { setEditorOpen('condition'); return; }
    set('condition', v);
  };

  const addCustom = async (name) => {
    if (!name?.trim()) { setEditorOpen(null); return; }
    const trimmed = name.trim();
    if (editorOpen === 'type') {
      await supabase.from(TABLES.productTypes).insert({ name: trimmed });
      onChange({ ...value, type: trimmed });
    } else if (editorOpen === 'model') {
      await supabase.from(TABLES.productModels).insert({ name: trimmed, type_name: value.type });
      set('model', trimmed);
    } else if (editorOpen === 'capacity') {
      await supabase.from(TABLES.productCapacities).insert({ name: trimmed, sort_order: 500 });
      set('capacity', trimmed);
    } else if (editorOpen === 'condition') {
      await supabase.from(TABLES.productConditions).insert({ name: trimmed, sort_order: 500 });
      set('condition', trimmed);
    }
    setEditorOpen(null);
    tax.reload();
  };

  if (tax.loading) {
    return <div className="loading-state"><div className="spinner" /></div>;
  }

  const labelFor = {
    type: 'Tipo / Categoría',
    model: 'Modelo',
    capacity: 'Capacidad',
    condition: 'Estado',
  };

  return (
    <>
      <div className="form-grid">
        <div className="field">
          <label className="field__label">Tipo</label>
          <select className="select" value={value.type || ''} onChange={handleType}>
            <option value="">Seleccionar…</option>
            {tax.types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            <option value="__new">＋ Otro (cargar nuevo)…</option>
          </select>
        </div>

        <div className="field">
          <label className="field__label">Modelo</label>
          <select className="select" value={value.model || ''} onChange={handleModel} disabled={!value.type}>
            <option value="">{value.type ? 'Seleccionar…' : 'Elegí tipo primero'}</option>
            {modelsForType.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
            {value.type && <option value="__new">＋ Otro (cargar nuevo)…</option>}
          </select>
        </div>

        <div className="field">
          <label className="field__label">Capacidad</label>
          <select className="select" value={value.capacity || ''} onChange={handleCap}>
            <option value="">Seleccionar…</option>
            {tax.capacities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            <option value="__new">＋ Otra (cargar nueva)…</option>
          </select>
        </div>

        {!hideCondition && (
          <div className="field">
            <label className="field__label">Estado</label>
            <select className="select" value={value.condition || ''} onChange={handleCond}>
              <option value="">Seleccionar…</option>
              {tax.conditions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__new">＋ Otro (cargar nuevo)…</option>
            </select>
          </div>
        )}

        {showDescription && (
          <div className="field field--full">
            <label className="field__label">Descripción / detalles</label>
            <textarea
              className="textarea"
              value={value.description || ''}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Color, observaciones, batería, accesorios incluidos…"
            />
          </div>
        )}
      </div>

      {editorOpen && (
        <CustomEditor
          label={labelFor[editorOpen]}
          onSave={addCustom}
          onCancel={() => setEditorOpen(null)}
        />
      )}
    </>
  );
}

function CustomEditor({ label, onSave, onCancel }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3 className="modal__title">Cargar nuevo {label.toLowerCase()}</h3>
          <button className="modal__close" onClick={onCancel}>×</button>
        </div>
        <div className="modal__body">
          <div className="field">
            <label className="field__label">Nombre</label>
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSave(name)}
              placeholder={`Ej: ${label}…`}
            />
            <p className="field__hint">Se agregará al catálogo y quedará disponible para próximos productos.</p>
          </div>
        </div>
        <div className="modal__foot">
          <button className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn--primary" onClick={() => onSave(name)} disabled={!name.trim()}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
