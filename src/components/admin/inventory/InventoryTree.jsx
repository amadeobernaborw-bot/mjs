import ModelRow from './ModelRow';

/** Líneas ("iPhone 15") con sus modelos. */
export default function InventoryTree({ lines, isOpen, onToggleOpen, actions }) {
  return (
    <div className="inv-tree">
      {lines.map((line, i) => (
        <section key={line.key} className="inv-line" aria-labelledby={`inv-line-${i}`}>
          <header className="inv-line__head">
            <h2 className="inv-line__title" id={`inv-line-${i}`}>{line.line}</h2>
            <span className="inv-line__meta">
              {line.category} · {line.models.length} {line.models.length === 1 ? 'modelo' : 'modelos'} · {line.stockTotal} u.
            </span>
          </header>
          <div className="inv-line__models">
            {line.models.map((model) => (
              <ModelRow
                key={model.id}
                model={model}
                open={isOpen(model.id)}
                onToggleOpen={() => onToggleOpen(model.id)}
                actions={actions}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
