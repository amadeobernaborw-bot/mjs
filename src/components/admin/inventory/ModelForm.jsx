import { useMemo, useState } from 'react';
import { CATEGORY_ORDER, deriveLine } from '../../../lib/inventory/variants';
import ImageField from './ImageField';

const EMPTY_MODEL = { id: null, type_name: 'iPhone', name: '', line: '', description: '', image_url: '', is_active: true };

/** Ficha del modelo: tipo, línea, nombre, descripción y foto compartidas por sus variantes. */
export default function ModelForm({ formId, model, models, onSubmit, onUploadingChange }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_MODEL, ...(model || {}) }));
  // Mientras no se toque a mano, la línea sigue al nombre ("iPhone 16 Pro" → "iPhone 16")
  const [lineTouched, setLineTouched] = useState(!!model?.id);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setName = (name) => setForm((f) => ({
    ...f,
    name,
    line: lineTouched ? f.line : deriveLine(name, f.type_name),
  }));

  const setType = (type) => setForm((f) => ({
    ...f,
    type_name: type,
    line: lineTouched ? f.line : deriveLine(f.name, type),
  }));

  const linesForType = useMemo(() => [...new Set(models
    .filter((m) => m.type_name === form.type_name)
    .map((m) => m.line || deriveLine(m.name, m.type_name)))].sort(), [models, form.type_name]);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, line: form.line || deriveLine(form.name, form.type_name) });
  };

  return (
    <form id={formId} onSubmit={submit} className="form-grid">
      {/* Solo los tipos que acepta products.category (check de la base) */}
      <div className="field">
        <label className="field__label" htmlFor="inv-model-type">Tipo</label>
        <select id="inv-model-type" className="select" value={form.type_name} onChange={(e) => setType(e.target.value)} required>
          {!CATEGORY_ORDER.includes(form.type_name) && <option value={form.type_name}>{form.type_name}</option>}
          {CATEGORY_ORDER.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div className="field">
        <label className="field__label" htmlFor="inv-model-line">Línea</label>
        <input
          id="inv-model-line"
          className="input"
          list="inv-model-lines"
          value={form.line || ''}
          onChange={(e) => { setLineTouched(true); set('line', e.target.value); }}
          placeholder="ej: iPhone 16"
        />
        <datalist id="inv-model-lines">
          {linesForType.map((l) => <option key={l} value={l} />)}
        </datalist>
      </div>

      <div className="field field--full">
        <label className="field__label" htmlFor="inv-model-name">Nombre del modelo</label>
        <input
          id="inv-model-name"
          className="input"
          value={form.name}
          onChange={(e) => setName(e.target.value)}
          required
          pattern=".*\S.*"
          title="Escribí el nombre del modelo"
          autoFocus={!form.id}
          placeholder="ej: iPhone 16 Pro Max"
        />
        <p className="field__hint">Agrupa a todas sus variantes de capacidad, color y estado.</p>
      </div>

      <div className="field field--full">
        <label className="field__label" htmlFor="inv-model-desc">Descripción</label>
        <textarea
          id="inv-model-desc"
          className="textarea"
          value={form.description || ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Chip, pantalla, cámaras… Se muestra en la tienda para todas las variantes."
        />
      </div>

      <ImageField
        label="Foto del modelo"
        value={form.image_url}
        onChange={(url) => set('image_url', url)}
        onUploadingChange={onUploadingChange}
        hint="JPG, PNG o WebP. La usan todas las variantes que no tengan foto propia."
      />

      <label className="field field--full inv-check">
        <input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
        <span>Mostrar el modelo en la tienda</span>
      </label>
    </form>
  );
}
