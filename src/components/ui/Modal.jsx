import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Modal({ open, onClose, title, children, footer }) {
  // onClose suele llegar como arrow inline: en un ref, el efecto no se rearma en cada render
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === 'Escape' && onCloseRef.current?.();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;
  // Portal al body: un ancestro con transform (p. ej. las celdas de la grilla de
  // widgets) atraparía al backdrop position: fixed.
  return createPortal(
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={onClose} aria-label="Cerrar"><X /></Button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
