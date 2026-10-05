import { useState } from 'react';
import { CatalogSelect } from '../../TaxonomyPicker';
import { buildVariantName } from '../../../lib/inventory/variants';
import ImageField from './ImageField';

export const SEALED = 'Nuevo sellado';

const EMPTY_VARIANT = {
  capacity: '', color: '', condition: SEALED, battery_health: '',
  price_ars: '', price_usd: '', stock: 1, description: '', image_url: '', is_active: true,
};

// Una variante existente conserva sus vacíos (un accesorio sin estado no pasa a "Nuevo sellado")
const fromRow = (v) => (v
  ? { ...Object.fromEntries(Object.keys(EMPTY_VARIANT).map((k) => [k, v[k] ?? ''])), stock: v.stock ?? 0, is_active: v.is_active ?? true }
  : { ...EMPTY_VARIANT });

/** Una variante: capacidad, color, estado, batería, precios, stock y foto propia opcional. */
export default function VariantForm({ formId, model, variant, tax, onSubmit, onUploadingChange }) {
  const [form, setForm] = useState(() => fromRow(variant));
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const used = form.condition && form.condition !== SEALED;

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ ...form, battery_health: used ? form.battery_health : '' });
  };

  const names = (list) => list.map((x) => x.name);

  return (
    <form id={formId} onSubmit={submit} className="form-grid">
      <p className="field--full inv-form__preview">
        Se guarda como <strong>{buildVariantName(model.name, form) || model.name}</strong>
      </p>

      <CatalogSelect kind="capacity" value={form.capacity} options={names(tax.capacities)} onChange={(v) => set('capacity', v)} onCreated={tax.reload} />
      <CatalogSelect kind="color" value={form.color} options={names(tax.colors)} onChange={(v) => set('color', v)} onCreated={tax.reload} />
      <CatalogSelect kind="condition" value={form.condition} options={names(tax.conditions)} onChange={(v) => set('condition', v)} onCreated={tax.reload} />

      <div className="field">
        <label className="field__label" htmlFor="inv-var-battery">Batería %</label>
        <input
          id="inv-var-battery"
          type="number"
          className="input"
          min="0"
          max="100"
          step="1"
          value={used ? form.battery_health ?? '' : ''}
          onChange={(e) => set('battery_health', e.target.value)}
          disabled={!used}
          placeholder={used ? 'ej: 92' : 'Solo para usados'}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="inv-var-ars">Precio ARS</label>
        <input id="inv-var-ars" type="number" className="input" min="0" step="0.01" value={form.price_ars ?? ''} onChange={(e) => set('price_ars', e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="inv-var-usd">Precio USD</label>
        <input id="inv-var-usd" type="number" className="input" min="0" step="0.01" value={form.price_usd ?? ''} onChange={(e) => set('price_usd', e.target.value)} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="inv-var-stock">Stock</label>
        <input id="inv-var-stock" type="number" className="input" min="0" step="1" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
      </div>

      <div className="field field--full">
        <label className="field__label" htmlFor="inv-var-notes">Notas de esta variante</label>
        <textarea
          id="inv-var-notes"
          className="textarea"
          value={form.description || ''}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Accesorios incluidos, detalles estéticos, garantía…"
        />
      </div>

      <ImageField
        label="Foto propia (opcional)"
        value={form.image_url}
        fallbackUrl={model.image_url || ''}
        onChange={(url) => set('image_url', url)}
        onUploadingChange={onUploadingChange}
        hint="Si no subís una, se usa la foto del modelo. Útil para usados con foto real."
      />

      <label className="field field--full inv-check">
        <input type="checkbox" checked={!!form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
        <span>Mostrar esta variante en la tienda</span>
      </label>
    </form>
  );
}
