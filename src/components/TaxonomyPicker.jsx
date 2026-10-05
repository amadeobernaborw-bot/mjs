import { useEffect, useId, useState, useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase, TABLES } from '../lib/supabase';

/**
 * Hook que carga la taxonomía editable: tipos, modelos, capacidades, estados y colores.
 * Si una tabla no existe (migración no corrida) esa lista queda vacía.
 */
export function useTaxonomy() {
  const [data, setData] = useState({ types: [], models: [], capacities: [], conditions: [], colors: [], loading: true });

  const load = async () => {
    const [types, models, caps, conds, colors] = await Promise.all([
      supabase.from(TABLES.catalogTypes).select('*').order('name'),
      supabase.from(TABLES.catalogModels).select('*').order('name'),
      supabase.from(TABLES.catalogCapacities).select('*').order('position'),
      supabase.from(TABLES.catalogConditions).select('*').order('sort_order').order('name'),
      supabase.from(TABLES.catalogColors).select('*').order('sort_order').order('name'),
    ]);
    setData({
      types: types.data || [],
      models: models.data || [],
      capacities: caps.data || [],
      conditions: conds.data || [],
      colors: colors.data || [],
      loading: false,
    });
  };

  useEffect(() => { load(); }, []);

  return { ...data, reload: load };
}

const NEW = '__new';

const CATALOG_LABELS = {
  type: 'Tipo / Categoría',
  model: 'Modelo',
  capacity: 'Capacidad',
  condition: 'Estado',
  color: 'Color',
};

/** Agrega un valor a la lista editable correspondiente. Devuelve el error de Supabase, si hubo. */
export async function addCatalogEntry(kind, name, { type } = {}) {
  const inserts = {
    type: () => supabase.from(TABLES.catalogTypes).insert({ name }),
    model: () => supabase.from(TABLES.catalogModels).insert({ name, type_name: type }),
    capacity: () => supabase.from(TABLES.catalogCapacities).insert({ name, position: 500 }),
    condition: () => supabase.from(TABLES.catalogConditions).insert({ name, sort_order: 500 }),
    color: () => supabase.from(TABLES.catalogColors).insert({ name, sort_order: 500 }),
  };
  const { error } = await inserts[kind]();
  return error;
}

/**
 * Select de una lista del catálogo con opción "+ Otro" que la amplía.
 * Props: kind, value, options (nombres), onChange(name), onCreated(), disabled, placeholder, type (para modelos)
 */
export function CatalogSelect({ kind, value, options, onChange, onCreated, disabled = false, placeholder = 'Seleccionar…', type, label = CATALOG_LABELS[kind] }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const id = useId();

  const handleChange = (e) => {
    if (e.target.value === NEW) { setEditorOpen(true); return; }
    onChange(e.target.value);
  };

  const create = async (name) => {
    const trimmed = name?.trim();
    if (!trimmed) { setEditorOpen(false); return; }
    const error = await addCatalogEntry(kind, trimmed, { type });
    // Un duplicado no es un problema: el valor ya existe en la lista
    if (error && error.code !== '23505') { alert(`No se pudo agregar: ${error.message}`); return; }
    onChange(trimmed);
    setEditorOpen(false);
    onCreated?.();
  };

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <select id={id} className="select" value={value || ''} onChange={handleChange} disabled={disabled}>
        <option value="">{placeholder}</option>
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map((name) => <option key={name} value={name}>{name}</option>)}
        {!disabled && <option value={NEW}>+ Otro (cargar nuevo)…</option>}
      </select>
      {editorOpen && (
        <CustomEditor label={CATALOG_LABELS[kind]} onSave={create} onCancel={() => setEditorOpen(false)} />
      )}
    </div>
  );
}

/**
 * TaxonomyPicker — dropdowns en cascada con opción de carga personalizada.
 * Props:
 *   value: { type, model, capacity, condition, description }
 *   onChange: (newValue) => void
 *   showDescription: boolean
 */
export default function TaxonomyPicker({ value, onChange, showDescription = true, hideCondition = false, fixedType = null }) {
  const tax = useTaxonomy();

  // Si fixedType viene seteado, normalizamos value.type para que el filtro de modelos funcione
  useEffect(() => {
    if (fixedType && value.type !== fixedType) {
      onChange({ ...value, type: fixedType });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixedType]);

  const effectiveType = fixedType || value.type;

  const set = (k, v) => onChange({ ...value, [k]: v });

  const modelsForType = useMemo(
    () => tax.models.filter((m) => m.type_name === effectiveType).map((m) => m.name),
    [tax.models, effectiveType]
  );

  if (tax.loading) {
    return <div className="loading-state"><div className="spinner" /></div>;
  }

  return (
    <div className="form-grid">
      {!fixedType && (
        <CatalogSelect
          kind="type"
          label="Tipo"
          value={value.type}
          options={tax.types.map((t) => t.name)}
          onChange={(v) => onChange({ ...value, type: v, model: '' })}
          onCreated={tax.reload}
        />
      )}

      <CatalogSelect
        kind="model"
        label="Modelo"
        type={effectiveType}
        value={value.model}
        options={modelsForType}
        onChange={(v) => set('model', v)}
        onCreated={tax.reload}
        disabled={!effectiveType}
        placeholder={effectiveType ? 'Seleccionar…' : 'Elegí tipo primero'}
      />

      <CatalogSelect
        kind="capacity"
        value={value.capacity}
        options={tax.capacities.map((c) => c.name)}
        onChange={(v) => set('capacity', v)}
        onCreated={tax.reload}
      />

      {!hideCondition && (
        <CatalogSelect
          kind="condition"
          value={value.condition}
          options={tax.conditions.map((c) => c.name)}
          onChange={(v) => set('condition', v)}
          onCreated={tax.reload}
        />
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
  );
}

function CustomEditor({ label, onSave, onCancel }) {
  const [name, setName] = useState('');
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3 className="modal__title">Cargar nuevo {label.toLowerCase()}</h3>
          <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={onCancel} aria-label="Cerrar"><X /></Button>
        </div>
        <div className="modal__body">
          <div className="field">
            <label className="field__label">Nombre</label>
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSave(name); } }}
              placeholder={`Ej: ${label}…`}
            />
            <p className="field__hint">Se agregará al catálogo y quedará disponible para próximos productos.</p>
          </div>
        </div>
        <div className="modal__foot">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="button" onClick={() => onSave(name)} disabled={!name.trim()}><Check data-icon="inline-start" /> Guardar</Button>
        </div>
      </div>
    </div>
  );
}
