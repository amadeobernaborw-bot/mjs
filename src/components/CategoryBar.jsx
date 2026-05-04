export default function CategoryBar({ categories, active, onChange, models = [], activeModel, onChangeModel }) {
  return (
    <div className="catbar">
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
