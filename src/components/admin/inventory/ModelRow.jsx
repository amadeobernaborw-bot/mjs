import { ChevronRight, Eye, EyeOff, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatARS } from '../../../lib/format';
import VariantTable from './VariantTable';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Un modelo con su resumen; abierto, muestra la tabla de variantes. */
export default function ModelRow({ model, open, onToggleOpen, actions }) {
  const panelId = `inv-model-${model.id}`;
  const hidden = model.is_active === false;
  const empty = model.variants.length === 0;

  return (
    <article className="inv-model" data-open={open} data-hidden={hidden}>
      <div className="inv-model__head">
        <button type="button" className="inv-model__toggle" onClick={onToggleOpen} aria-expanded={open} aria-controls={open ? panelId : undefined}>
          <ChevronRight className="inv-model__caret size-4" aria-hidden="true" />
          <span className="inv-model__thumb">
            {model.image_url ? <img src={model.image_url} alt="" /> : <span aria-hidden="true">{model.name?.[0]}</span>}
          </span>
          <span className="inv-model__title">
            <strong className="inv-model__name">{model.name}</strong>
            <span className="inv-model__meta">
              {empty ? 'Sin variantes' : plural(model.variantCount, 'variante', 'variantes')}
              {!empty && <> · {plural(model.stockTotal, 'unidad', 'unidades')}</>}
              {model.priceFromArs && <> · desde {formatARS(model.priceFromArs)}</>}
            </span>
          </span>
        </button>
        <div className="inv-model__badges">
          {hidden && <span className="badge badge--gray">Modelo oculto</span>}
          {!empty && model.stockTotal === 0 && <span className="badge badge--yellow">Sin stock</span>}
        </div>
        <div className="inv-model__actions">
          <Button variant="outline" size="sm" onClick={() => actions.addVariant(model)}><Plus data-icon="inline-start" /> Variante</Button>
          <Button variant="ghost" size="icon-sm" onClick={() => actions.addMatrix(model)} aria-label="Agregar varias variantes" title="Agregar varias"><Layers /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => actions.editModel(model)} aria-label="Editar modelo" title="Editar modelo"><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => actions.toggleModel(model)} aria-label={hidden ? 'Mostrar modelo' : 'Ocultar modelo'} title={hidden ? 'Mostrar en la tienda' : 'Ocultar de la tienda'}>
            {hidden ? <Eye /> : <EyeOff />}
          </Button>
          <Button variant="ghost" size="icon-sm" className="inv-danger" onClick={() => actions.deleteModel(model)} aria-label="Borrar modelo" title="Borrar modelo"><Trash2 /></Button>
        </div>
      </div>

      {open && (
        <div id={panelId} className="inv-model__body">
          {empty ? (
            <div className="inv-model__empty">
              <p>Este modelo todavía no tiene variantes.</p>
              <div className="inv-model__empty-actions">
                <Button size="sm" onClick={() => actions.addVariant(model)}><Plus data-icon="inline-start" /> Agregar variante</Button>
                <Button size="sm" variant="outline" onClick={() => actions.addMatrix(model)}><Layers data-icon="inline-start" /> Agregar varias</Button>
              </div>
            </div>
          ) : (
            <VariantTable
              model={model}
              variants={model.variants}
              onEdit={(v) => actions.editVariant(model, v)}
              onDuplicate={(v) => actions.duplicateVariant(model, v)}
              onToggle={actions.toggleVariant}
              onDelete={actions.deleteVariant}
              onStock={actions.adjustStock}
            />
          )}
        </div>
      )}
    </article>
  );
}
