import { useState } from 'react';
import { Copy, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SortableHeader, { sortItems } from '../../ui/SortableHeader';
import { formatARS, formatUSD } from '../../../lib/format';

/** Variantes de un modelo. Sin orden elegido, respeta el del árbol (capacidad, estado, color). */
export default function VariantTable({ model, variants, onEdit, onDuplicate, onToggle, onDelete, onStock }) {
  const [sort, setSort] = useState(null);
  const rows = sortItems(variants, sort);
  const header = (label, key, align) => <SortableHeader label={label} sortKey={key} sort={sort} onSort={setSort} align={align} />;

  return (
    <div className="inv-variants">
      <table className="table inv-variants__table">
        <thead>
          <tr>
            {header('Capacidad', 'capacity')}
            {header('Color', 'color')}
            {header('Estado', 'condition')}
            {header('Batería', 'battery_health', 'right')}
            {header('Precio ARS', 'price_ars', 'right')}
            {header('USD', 'price_usd', 'right')}
            {header('Stock', 'stock', 'right')}
            <th>Visible</th>
            <th><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const visible = v.is_active && model.is_active !== false;
            return (
              <tr key={v.id}>
                <td>
                  <div className="inv-variant__cell">
                    {v.image_url && <img src={v.image_url} alt="" className="inv-variant__thumb" title="Foto propia de la variante" />}
                    <strong>{v.capacity || '—'}</strong>
                  </div>
                </td>
                <td>{v.color || '—'}</td>
                <td>{v.condition || '—'}</td>
                <td className="num">{v.battery_health != null ? `${v.battery_health}%` : '—'}</td>
                <td className="num">{v.price_ars ? formatARS(v.price_ars) : '—'}</td>
                <td className="num">{v.price_usd ? formatUSD(v.price_usd) : '—'}</td>
                <td className="num">
                  <div className="inv-stepper" role="group" aria-label={`Stock de ${v.name}`}>
                    <button type="button" className="inv-stepper__btn" onClick={() => onStock(v, -1)} disabled={!v.stock} aria-label="Restar una unidad"><Minus className="size-3.5" /></button>
                    <span className="inv-stepper__value" data-empty={!v.stock}>{v.stock || 0}</span>
                    <button type="button" className="inv-stepper__btn" onClick={() => onStock(v, 1)} aria-label="Sumar una unidad"><Plus className="size-3.5" /></button>
                  </div>
                </td>
                <td>
                  <button type="button" className={`badge ${visible ? 'badge--green' : 'badge--gray'} inv-badge-btn`} onClick={() => onToggle(v)}
                    title={model.is_active === false ? 'El modelo está oculto' : v.is_active ? 'Ocultar de la tienda' : 'Mostrar en la tienda'}>
                    {visible ? 'Activa' : 'Oculta'}
                  </button>
                </td>
                <td>
                  <div className="table__actions inv-variant__actions">
                    <Button variant="ghost" size="icon-sm" onClick={() => onEdit(v)} aria-label="Editar variante" title="Editar"><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => onDuplicate(v)} aria-label="Duplicar variante" title="Duplicar"><Copy /></Button>
                    <Button variant="ghost" size="icon-sm" className="inv-danger" onClick={() => onDelete(v)} aria-label="Borrar variante" title="Borrar"><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
