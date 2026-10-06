import { ArrowUpDown } from 'lucide-react';
import { STORE_SORTS } from '../lib/inventory/variants';

export default function CategoryBar({ categories, active, onChange, models = [], activeModel, onChangeModel, sort, onSortChange, embedded = false }) {
  return (
    <div className={`catbar ${embedded ? 'catbar--embedded' : ''}`}>
      <div className="catbar__row">
        <div className="catbar__scroll" role="tablist" aria-label="Categorías de productos">
          {categories.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={active === cat}
              className={`catbar__chip ${active === cat ? 'is-active' : ''}`}
              onClick={() => onChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {onSortChange && (
          // data-sorted y no una clase: así el estado no pisa clases que agregue otro código
          <label className="catbar__sort" data-sorted={sort !== 'featured'}>
            <ArrowUpDown className="catbar__sort-icon" aria-hidden="true" />
            <span className="sr-only">Ordenar por</span>
            <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
              {Object.entries(STORE_SORTS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {models.length > 0 && (
        <div className="catbar__sub" role="tablist" aria-label="Modelos">
          <button
            className={`catbar__pill ${!activeModel ? 'is-active' : ''}`}
            onClick={() => onChangeModel(null)}
          >
            Todos los modelos
          </button>
          {models.map((m) => (
            <button
              key={m}
              className={`catbar__pill ${activeModel === m ? 'is-active' : ''}`}
              onClick={() => onChangeModel(m)}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
