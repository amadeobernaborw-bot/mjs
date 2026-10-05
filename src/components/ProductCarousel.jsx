import { useRef, useState, useEffect } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, GalleryHorizontal, LayoutGrid, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatARS, formatUSD } from '../lib/format';

/** "128GB · 256GB · 3 colores" */
function optionsSummary({ capacity, color }) {
  const parts = [];
  if (capacity.length) parts.push(capacity.join(' · '));
  if (color.length > 1) parts.push(`${color.length} colores`);
  else if (color.length === 1) parts.push(color[0]);
  return parts.join(' · ');
}

function ModelCard({ model, onOpen }) {
  const summary = optionsSummary(model.options);
  const several = model.variants.length > 1;
  return (
    <Card className="pcard gap-0 py-0">
      <div className="pcard__media">
        {model.image_url ? (
          <img src={model.image_url} alt={model.name} loading="lazy" />
        ) : (
          <span className="pcard__placeholder">{model.name?.[0] || 'A'}</span>
        )}
      </div>
      <div className="pcard__body">
        <span className="pcard__category">{model.type_name}</span>
        <h3 className="pcard__name">{model.name}</h3>
        {summary && <p className="pcard__options">{summary}</p>}
        {model.description && <p className="pcard__desc">{model.description}</p>}
        <div className="pcard__price">
          {model.priceFromArs && <strong>{several && <span className="pcard__from">Desde</span>}{formatARS(model.priceFromArs)}</strong>}
          {model.priceFromUsd && <span>o {formatUSD(model.priceFromUsd)}</span>}
          {!model.priceFromArs && !model.priceFromUsd && <span>Consultar precio</span>}
        </div>
        <Button variant="outline" size="sm" className="mt-3 self-start" onClick={() => onOpen(model)}>
          {several ? 'Ver opciones' : 'Consultar'} <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </Card>
  );
}

export default function ProductCarousel({ models, onOpen }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [viewMode, setViewMode] = useState('carousel'); // 'carousel' | 'grid'

  const updateNav = () => {
    const t = trackRef.current;
    if (!t || viewMode !== 'carousel') return;
    setCanPrev(t.scrollLeft > 4);
    setCanNext(t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
  };

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    if (viewMode !== 'carousel') return;
    updateNav();
    t.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    return () => {
      t.removeEventListener('scroll', updateNav);
      window.removeEventListener('resize', updateNav);
    };
  }, [models, viewMode]);

  // Galería: ocupa el alto que queda en la pantalla del catálogo (snap-scroll.css); el resto, scroll interno
  useEffect(() => {
    const t = trackRef.current;
    if (t && viewMode === 'grid') t.scrollTop = 0;
  }, [models, viewMode]);

  const scrollBy = (dir) => {
    const t = trackRef.current;
    if (!t) return;
    const amount = t.clientWidth * 0.8 * dir;
    t.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (!models || models.length === 0) {
    return (
      <div className="empty fade-in">
        <Package className="empty__icon mx-auto block size-12" strokeWidth={1.5} aria-hidden="true" />
        <div className="empty__title">No hay productos en esta categoría</div>
        <p>Pronto sumamos más equipos.</p>
      </div>
    );
  }

  const isGrid = viewMode === 'grid';

  return (
    // className fijo: si cambiara con viewMode, React borraría el is-visible que pone useScrollObserver
    <div className="carousel fade-in" data-view={viewMode}>
      <div className="carousel__head">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2 className="title">Encontrá tu próximo Apple.</h2>
        </div>
        <div className="carousel__controls">
          <div className="view-toggle" role="tablist" aria-label="Modo de vista">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'carousel'}
              className={`view-toggle__btn ${viewMode === 'carousel' ? 'is-active' : ''}`}
              onClick={() => setViewMode('carousel')}
              title="Vista carrusel"
            >
              <GalleryHorizontal className="size-4" aria-hidden="true" />
              <span className="view-toggle__label">Carrusel</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'grid'}
              className={`view-toggle__btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vista galería"
            >
              <LayoutGrid className="size-4" aria-hidden="true" />
              <span className="view-toggle__label">Galería</span>
            </button>
          </div>
          {!isGrid && (
            <div className="carousel__nav">
              <Button variant="outline" size="icon-lg" className="rounded-full" onClick={() => scrollBy(-1)} disabled={!canPrev} aria-label="Anterior"><ChevronLeft /></Button>
              <Button variant="outline" size="icon-lg" className="rounded-full" onClick={() => scrollBy(1)} disabled={!canNext} aria-label="Siguiente"><ChevronRight /></Button>
            </div>
          )}
        </div>
      </div>

      <div
        className={`carousel__track ${isGrid ? 'carousel__track--grid' : ''}`}
        ref={trackRef}
      >
        {models.map((m) => (
          <div key={m.id} className="carousel__item">
            <ModelCard model={m} onOpen={onOpen} />
          </div>
        ))}
      </div>

    </div>
  );
}
