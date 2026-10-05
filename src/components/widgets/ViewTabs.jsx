import { useRef } from 'react';

/**
 * Pestañas de vistas (tablist con foco itinerante): ←/→ recorren, Inicio/Fin
 * van a los extremos y la flecha también selecciona. `disabled` las deja
 * visibles pero inactivas (mientras se edita), para que la barra no cambie.
 */
export default function ViewTabs({ label, views, active, disabled = false, onChange }) {
  const listRef = useRef(null);

  const focusAndSelect = (index) => {
    const view = views[(index + views.length) % views.length];
    onChange(view.id);
    listRef.current?.querySelector(`[data-view-id="${view.id}"]`)?.focus();
  };

  const onKeyDown = (e) => {
    // Alt/Ctrl/Cmd + flecha son atajos del navegador (Atrás/Adelante): no se tocan
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const current = views.findIndex((v) => v.id === active);
    const moves = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: views.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    focusAndSelect(moves[e.key]);
  };

  return (
    <div ref={listRef} className="widget-views" role="tablist" aria-label={label} onKeyDown={disabled ? undefined : onKeyDown}>
      {views.map((v) => {
        const selected = v.id === active;
        return (
          <button
            key={v.id}
            type="button"
            role="tab"
            data-view-id={v.id}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            className={`widget-views__tab ${selected ? 'is-active' : ''}`}
            onClick={() => onChange(v.id)}
            title={v.description}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
