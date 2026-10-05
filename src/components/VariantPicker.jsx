import { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Modal from './ui/Modal';
import { formatARS, formatUSD } from '../lib/format';
import {
  availableOptions, matchVariants, selectOption, selectionOf, variantImage, VARIANT_KEYS,
} from '../lib/inventory/variants';

const LABELS = { capacity: 'Capacidad', color: 'Color', condition: 'Estado' };

const positive = (n) => Number(n) > 0;

/** Etiqueta de una unidad cuando varias comparten capacidad, color y estado. */
const unitLabel = (v, i) => (v.battery_health != null ? `Batería ${v.battery_health}%` : positive(v.price_ars) ? formatARS(v.price_ars) : `Unidad ${i + 1}`);

/** Arranca en la variante más barata con stock (o la más barata si no hay stock). */
function initialSelection(variants) {
  const byPrice = matchVariants(variants, {});
  return selectionOf(byPrice.find((v) => Number(v.stock) > 0) || byPrice[0]);
}

/** Selector de variante de un modelo de la tienda (capacidad → color → estado). */
export default function VariantPicker({ model, onClose, onContact }) {
  const [selection, setSelection] = useState(() => initialSelection(model.variants));
  const available = useMemo(() => availableOptions(model.variants, selection), [model.variants, selection]);
  const [unit, setUnit] = useState(0);
  const matches = useMemo(() => matchVariants(model.variants, selection), [model.variants, selection]);
  const variant = matches[unit] || matches[0] || null;
  const image = variantImage(variant, model);
  const inStock = Number(variant?.stock) > 0;
  const groups = VARIANT_KEYS.filter((k) => model.options[k].length > 0);

  const choose = (key, value) => {
    setSelection((s) => selectOption(model.variants, s, key, value));
    setUnit(0);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={model.name}
      footer={(
        <Button onClick={() => onContact(model, variant)} disabled={!variant}>
          Consultar por WhatsApp <ArrowRight data-icon="inline-end" />
        </Button>
      )}
    >
      <div className="vpicker">
        <div className="vpicker__media">
          {image ? <img src={image} alt={variant?.name || model.name} /> : <span className="pcard__placeholder">{model.name?.[0]}</span>}
        </div>

        <div className="vpicker__info">
          {model.description && <p className="vpicker__desc">{model.description}</p>}

          {groups.map((key) => (
            <fieldset key={key} className="vpicker__group">
              <legend className="vpicker__label">{LABELS[key]}</legend>
              <div className="vpicker__options">
                {model.options[key].map((value) => {
                  const exists = available[key].includes(value);
                  return (
                    <button
                      key={value}
                      type="button"
                      className="vpicker__option"
                      aria-pressed={selection[key] === value}
                      data-unavailable={!exists}
                      onClick={() => choose(key, value)}
                      title={exists ? undefined : 'No disponible con lo elegido: cambia el resto de la selección'}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {matches.length > 1 && (
            <fieldset className="vpicker__group">
              <legend className="vpicker__label">Unidad</legend>
              <div className="vpicker__options">
                {matches.map((v, i) => (
                  <button key={v.id} type="button" className="vpicker__option" aria-pressed={variant?.id === v.id} onClick={() => setUnit(i)}>
                    {unitLabel(v, i)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {variant && (
            <div className="vpicker__summary" aria-live="polite">
              <div className="vpicker__price">
                {positive(variant.price_ars) ? <strong>{formatARS(variant.price_ars)}</strong> : <strong>Consultar precio</strong>}
                {positive(variant.price_usd) && <span>o {formatUSD(variant.price_usd)}</span>}
              </div>
              <ul className="vpicker__facts">
                {variant.battery_health != null && <li>Batería al {variant.battery_health}%</li>}
                <li data-tone={inStock ? 'ok' : 'warn'}>{inStock ? 'Disponible' : 'Sin stock: consultá disponibilidad'}</li>
              </ul>
              {variant.description && <p className="vpicker__notes">{variant.description}</p>}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
