import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CatalogSelect } from '../../TaxonomyPicker';
import { variantMatrix } from '../../../lib/inventory/variants';
import { SEALED } from './VariantForm';

const comboKey = (c) => `${c.capacity || ''}|${c.color || ''}`;
const sameCombo = (v, c) => (v.capacity || null) === c.capacity && (v.color || null) === c.color && (v.condition || null) === c.condition;

function ChipGroup({ label, options, selected, onToggle }) {
  return (
    <fieldset className="field field--full inv-chips">
      <legend className="field__label">{label}</legend>
      <div className="inv-chips__list">
        {options.map((name) => (
          <button key={name} type="button" className="inv-chip" aria-pressed={selected.includes(name)} onClick={() => onToggle(name)}>
            {name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** "Agregar varias": capacidades × colores con un estado, con precio y stock editables por fila. */
export default function VariantMatrix({ formId, model, existing, tax, onSubmit }) {
  const [capacities, setCapacities] = useState([]);
  const [colors, setColors] = useState([]);
  const [condition, setCondition] = useState(SEALED);
  const [defaults, setDefaults] = useState({ price_ars: '', price_usd: '', stock: 1 });
  const [rows, setRows] = useState({}); // comboKey → { price_ars, price_usd, stock } editado a mano
  const [removed, setRemoved] = useState(() => new Set());

  // Mantiene el orden del catálogo aunque se elijan salteados
  const toggleIn = (list, setList, all) => (name) => setList(
    all.filter((n) => (n === name ? !list.includes(n) : list.includes(n)))
  );
  const capNames = tax.capacities.map((c) => c.name);
  const colorNames = tax.colors.map((c) => c.name);

  const combos = useMemo(() => (capacities.length || colors.length
    ? variantMatrix({ capacities, colors, condition }).filter((c) => !removed.has(comboKey(c)))
    : []), [capacities, colors, condition, removed]);

  const valueOf = (c, key) => rows[comboKey(c)]?.[key] ?? defaults[key];
  const setRow = (c, key, value) => setRows((r) => ({ ...r, [comboKey(c)]: { ...r[comboKey(c)], [key]: value } }));
  const remove = (c) => setRemoved((s) => new Set(s).add(comboKey(c)));
  const isLoaded = (c) => existing.some((v) => sameCombo(v, c));
  const fresh = combos.filter((c) => !isLoaded(c));

  const submit = (e) => {
    e.preventDefault();
    // Las combinaciones que ya existen se omiten: para otra unidad usar Duplicar
    onSubmit(fresh.map((c) => ({
      ...c,
      price_ars: valueOf(c, 'price_ars'),
      price_usd: valueOf(c, 'price_usd'),
      stock: valueOf(c, 'stock'),
      battery_health: '',
      description: '',
      image_url: '',
      is_active: true,
    })));
  };

  return (
    <form id={formId} onSubmit={submit} className="form-grid">
      <p className="field--full inv-form__preview">Elegí capacidades y colores: se crea una variante de <strong>{model.name}</strong> por cada combinación.</p>

      <ChipGroup label="Capacidades" options={capNames} selected={capacities} onToggle={toggleIn(capacities, setCapacities, capNames)} />
      <ChipGroup label="Colores" options={colorNames} selected={colors} onToggle={toggleIn(colors, setColors, colorNames)} />

      <CatalogSelect kind="condition" value={condition} options={tax.conditions.map((c) => c.name)} onChange={setCondition} onCreated={tax.reload} />
      <div className="field">
        <label className="field__label" htmlFor="inv-mx-stock">Stock de cada una</label>
        <input id="inv-mx-stock" type="number" className="input" min="0" value={defaults.stock} onChange={(e) => setDefaults((d) => ({ ...d, stock: e.target.value }))} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="inv-mx-ars">Precio ARS (base)</label>
        <input id="inv-mx-ars" type="number" className="input" min="0" step="0.01" value={defaults.price_ars} onChange={(e) => setDefaults((d) => ({ ...d, price_ars: e.target.value }))} />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="inv-mx-usd">Precio USD (base)</label>
        <input id="inv-mx-usd" type="number" className="input" min="0" step="0.01" value={defaults.price_usd} onChange={(e) => setDefaults((d) => ({ ...d, price_usd: e.target.value }))} />
      </div>

      <div className="field field--full">
        {combos.length === 0 ? (
          <p className="field__hint">Todavía no hay combinaciones.</p>
        ) : (
          <div className="inv-matrix">
            <p className="field__label">{fresh.length} {fresh.length === 1 ? 'variante nueva' : 'variantes nuevas'}</p>
            <table className="inv-matrix__table">
              <thead>
                <tr><th>Variante</th><th>ARS</th><th>USD</th><th>Stock</th><th><span className="sr-only">Quitar</span></th></tr>
              </thead>
              <tbody>
                {combos.map((c) => {
                  const label = [c.capacity, c.color].filter(Boolean).join(' · ');
                  const dup = isLoaded(c);
                  return (
                    <tr key={comboKey(c)} data-loaded={dup}>
                      <td>
                        {label}
                        {dup && <span className="badge badge--yellow inv-matrix__dup">Ya cargada · se omite</span>}
                      </td>
                      <td><input type="number" className="input" min="0" step="0.01" aria-label={`Precio ARS de ${label}`} value={valueOf(c, 'price_ars')} onChange={(e) => setRow(c, 'price_ars', e.target.value)} /></td>
                      <td><input type="number" className="input" min="0" step="0.01" aria-label={`Precio USD de ${label}`} value={valueOf(c, 'price_usd')} onChange={(e) => setRow(c, 'price_usd', e.target.value)} /></td>
                      <td><input type="number" className="input" min="0" aria-label={`Stock de ${label}`} value={valueOf(c, 'stock')} onChange={(e) => setRow(c, 'stock', e.target.value)} /></td>
                      <td><Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(c)} aria-label={`Quitar ${label}`}><X /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </form>
  );
}
