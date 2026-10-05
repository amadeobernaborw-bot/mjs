import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Modal from '@/components/ui/Modal';

/** Catálogo por categoría: los widgets en pantalla se marcan, los ocultos se pueden agregar. */
export default function WidgetCatalog({ open, onClose, registry, layout, labels, onAdd }) {
  const enabled = new Set(layout.filter((it) => it.enabled).map((it) => it.widget_id));
  const sizeOf = (id) => layout.find((it) => it.widget_id === id);

  return (
    <Modal open={open} onClose={onClose} title={labels.catalogTitle}>
      <div className="widget-catalog">
        {registry.groups.map((group) => {
          const items = registry.widgets.filter((w) => w.group === group);
          if (items.length === 0) return null;
          return (
            <section key={group} className="widget-catalog__group" aria-labelledby={`wc-${group}`}>
              <h3 id={`wc-${group}`} className="widget-catalog__title">{group}</h3>
              <ul className="widget-catalog__list">
                {items.map((w) => {
                  const onScreen = enabled.has(w.id);
                  const size = sizeOf(w.id) || w.defaults;
                  return (
                    <li key={w.id} className={`widget-catalog__item ${onScreen ? 'is-on-screen' : ''}`}>
                      <div className="widget-catalog__info">
                        <span className="widget-catalog__name">{w.title}</span>
                        <span className="widget-catalog__desc">{w.description}</span>
                      </div>
                      <span className="widget-catalog__size" title="Columnas × filas">{size.w}×{size.h}</span>
                      {onScreen ? (
                        <span className="badge badge--gray inline-flex items-center gap-1">
                          <Check className="size-3" aria-hidden="true" /> {labels.catalogOnScreen}
                        </span>
                      ) : (
                        <Button type="button" size="sm" onClick={() => onAdd(w.id)}>
                          <Plus data-icon="inline-start" /> {labels.catalogAdd}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
