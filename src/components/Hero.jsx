import { useEffect, useState } from 'react';
import { supabase, BUCKETS } from '../lib/supabase';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1592286927505-1def25115558?auto=format&fit=crop&w=1400&q=80';

function smoothScrollTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.pageYOffset - 72;
  window.scrollTo({ top: y, behavior: 'smooth' });
}

export default function Hero({ profile }) {
  const [heroImg, setHeroImg] = useState(profile?.hero_image_url || '');

  useEffect(() => {
    if (profile?.hero_image_url) { setHeroImg(profile.hero_image_url); return; }
    // Try a known asset key in storage
    (async () => {
      try {
        const { data } = supabase.storage.from(BUCKETS.storeAssets).getPublicUrl('hero.jpg');
        if (data?.publicUrl) {
          // Quick HEAD test by image load
          const img = new Image();
          img.onload = () => setHeroImg(data.publicUrl);
          img.onerror = () => setHeroImg(FALLBACK_IMG);
          img.src = data.publicUrl;
        } else {
          setHeroImg(FALLBACK_IMG);
        }
      } catch {
        setHeroImg(FALLBACK_IMG);
      }
    })();
  }, [profile?.hero_image_url]);

  return (
    <section className="hero hero--media">
      <div className="hero__media" aria-hidden="true">
        <div className="hero__media-img" style={{ backgroundImage: heroImg ? `url(${heroImg})` : undefined }} />
        <div className="hero__media-grade" />
      </div>

      <div className="hero__inner">
        <p className="eyebrow hero__eyebrow fade-in">MJ Store · Apple Premium</p>
        <h1 className="hero__headline fade-in fade-in--delay-1">
          La mejor tecnología Apple,<br /><span className="hero__headline-em">en tu mano.</span>
        </h1>
        <p className="hero__sub fade-in fade-in--delay-2">
          iPhone, Mac, iPad, Watch y AirPods. Productos originales con garantía y
          plan canje para que estrenes el equipo que querés.
        </p>
        <div className="hero__ctas fade-in fade-in--delay-3">
          <button className="btn btn--primary btn--lg" onClick={() => smoothScrollTo('productos')}>
            Ver catálogo
          </button>
          <button className="btn btn--ghost-light btn--lg" onClick={() => smoothScrollTo('canje')}>
            Cotizar mi equipo
          </button>
        </div>

        <div className="hero__chips fade-in fade-in--delay-3">
          <span className="hero__chip">✓ Productos originales</span>
          <span className="hero__chip">✓ Garantía oficial</span>
          <span className="hero__chip">✓ Cuotas sin interés</span>
          <span className="hero__chip">✓ Plan canje al instante</span>
        </div>
      </div>

      <button className="hero__scroll" onClick={() => smoothScrollTo('productos')} aria-label="Bajar al catálogo">
        <span /><span /><span />
      </button>
    </section>
  );
}
