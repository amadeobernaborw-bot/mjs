import { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function InlinePanel({ open, onClose, title, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  return (
    <aside
      className={`inline-panel ${wide ? 'inline-panel--wide' : ''} ${open ? 'is-open' : ''}`}
      aria-hidden={!open}
    >
      <div className="inline-panel__inner">
        <div className="inline-panel__header">
          <h2 className="inline-panel__title">{title}</h2>
          <Button type="button" variant="ghost" size="icon-sm" className="rounded-full" onClick={onClose} aria-label="Cerrar"><X /></Button>
        </div>
        <div className="inline-panel__body">{children}</div>
        {footer && <div className="inline-panel__footer">{footer}</div>}
      </div>
    </aside>
  );
}
