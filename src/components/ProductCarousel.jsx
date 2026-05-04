import { useRef, useState, useEffect } from 'react';
import { formatARS, formatUSD } from '../lib/format';

function ProductCard({ product, onContact }) {
  return (
    <article className="pcard">
      <div className="pcard__media">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <span className="pcard__placeholder">{product.name?.[0] || 'A'}</span>
        )}
      </div>
      <div className="pcard__body">
        <span className="pcard__category">{product.category}</span>
        <h3 className="pcard__name">{product.name}</h3>
        {product.description && <p className="pcard__desc">{product.description}</p>}
        <div className="pcard__price">
          {product.price_ars && <strong>{formatARS(product.price_ars)}</strong>}
          {product.price_usd && <span>o {formatUSD(product.price_usd)}</span>}
          {!product.price_ars && !product.price_usd && <span>Consultar precio</span>}
        </div>
        <button className="pcard__cta" onClick={() => onContact(product)}>
          Consultar
        </button>
      </div>
    </article>
  );
}

export default function ProductCarousel({ products, onContact }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateNav = () => {
    const t = trackRef.current;
    if (!t) return;
    setCanPrev(t.scrollLeft > 4);
    setCanNext(t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
  };

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    updateNav();
    t.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    return () => {
      t.removeEventListener('scroll', updateNav);
      window.removeEventListener('resize', updateNav);
    };
  }, [products]);

  const scrollBy = (dir) => {
    const t = trackRef.current;
    if (!t) return;
    const amount = t.clientWidth * 0.8 * dir;
    t.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (!products || products.length === 0) {
    return (
      <div className="empty fade-in">
        <div className="empty__icon">📦</div>
        <div className="empty__title">No hay productos en esta categoría</div>
        <p>Pronto sumamos más equipos.</p>
      </div>
    );
  }

  return (
    <div className="carousel fade-in">
      <div className="carousel__head">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h2 className="title">Encontrá tu próximo Apple.</h2>
        </div>
        <div className="carousel__nav">
          <button className="carousel__btn" onClick={() => scrollBy(-1)} disabled={!canPrev} aria-label="Anterior">‹</button>
          <button className="carousel__btn" onClick={() => scrollBy(1)} disabled={!canNext} aria-label="Siguiente">›</button>
        </div>
      </div>

      <div className="carousel__track" ref={trackRef}>
        {products.map((p) => (
          <div key={p.id} className="carousel__item">
            <ProductCard product={p} onContact={onContact} />
          </div>
        ))}
      </div>
    </div>
  );
}
