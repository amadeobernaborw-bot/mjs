import { useEffect, useMemo, useRef, useState } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatARS } from '../../../lib/format';

export default function ItemRow({ item, idx, products, onChange, onPick, onRemove, onUpload, uploading }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState(item.name || '');
  const fileRef = useRef(null);

  useEffect(() => { setQuery(item.name || ''); }, [item.name]);

  const matches = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return products.filter((p) => p.name?.toLowerCase().includes(q)).slice(0, 8);
  }, [query, products]);

  const handleNameChange = (v) => {
    setQuery(v);
    onChange('name', v);
    setShowDropdown(true);
  };

  const handlePick = (p) => {
    onPick(p);
    setQuery(p.name);
    setShowDropdown(false);
  };

  return (
    <div className="item-row">
      <div className="item-row__thumb">
        {item.image_url ? (
          <img src={item.image_url} alt="" />
        ) : (
          <Package className="size-5 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        )}
        <button
          type="button"
          className="item-row__thumb-btn"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Cambiar foto"
        >
          {uploading ? '…' : 'Foto'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => onUpload(e.target.files?.[0])}
        />
      </div>

      <div className="item-row__name">
        <input
          className="input"
          placeholder="Buscar producto del catálogo o escribir libre…"
          value={query}
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        />
        {showDropdown && matches.length > 0 && (
          <ul className="combobox-list" role="listbox">
            {matches.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => handlePick(p)} className="combobox-list__item">
                  {p.image_url && <img src={p.image_url} alt="" className="combobox-list__img" />}
                  <span className="combobox-list__main">
                    <span className="combobox-list__name">{p.name}</span>
                    <span className="combobox-list__meta">{p.category} · {p.price_ars ? formatARS(p.price_ars) : '—'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        className="input item-row__qty"
        type="number"
        min="1"
        value={item.qty}
        onChange={(e) => onChange('qty', e.target.value)}
        title="Cantidad"
      />
      <input
        className="input item-row__price"
        type="number"
        min="0"
        step="0.01"
        placeholder="USD"
        value={item.price_usd}
        onChange={(e) => onChange('price_usd', e.target.value)}
      />
      <input
        className="input item-row__price"
        type="number"
        min="0"
        step="0.01"
        placeholder="ARS"
        value={item.price_ars}
        onChange={(e) => onChange('price_ars', e.target.value)}
      />
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        onClick={onRemove}
        title="Eliminar fila"
        aria-label="Eliminar fila"
      ><Trash2 /></Button>
    </div>
  );
}
