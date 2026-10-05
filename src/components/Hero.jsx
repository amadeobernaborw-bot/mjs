import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { heroSourcesFromProfile, readHeroCache, writeHeroCache } from '../lib/heroCache';
import { HERO_SECTION, scrollToSection } from '../lib/sections';

const HERO_CHIPS = ['Productos originales', 'Garantía oficial', 'Cuotas sin interés', 'Plan canje al instante'];

// Debe coincidir con el breakpoint móvil del CSS y con index.html
const MOBILE_QUERY = '(max-width: 768px)';

/**
 * Imagen vigente: la del perfil cuando ya cargó; mientras tanto, la de la última visita
 * (así el placeholder aparece al instante en visitas repetidas).
 */
function useHeroSources(profile) {
  const [cached] = useState(readHeroCache);
  const isProfileLoaded = Boolean(profile?.id);
  const fromProfile = isProfileLoaded ? heroSourcesFromProfile(profile) : null;
  const cacheKey = isProfileLoaded ? JSON.stringify(fromProfile) : null;

  useEffect(() => {
    if (cacheKey !== null) writeHeroCache(JSON.parse(cacheKey));
  }, [cacheKey]);

  return isProfileLoaded ? fromProfile : cached;
}

/** Foto final: invisible hasta que termina de descargarse y decodificarse, después entra con fade. */
function HeroPhoto({ desktop, mobile }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef(null);

  const reveal = (img) => {
    const decoded = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
    decoded.catch(() => {}).then(() => setIsLoaded(true));
  };

  // Si la imagen ya estaba en caché del navegador, onLoad puede haberse disparado antes de montar
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) reveal(img);
  }, []);

  return (
    <picture className={`hero__photo ${isLoaded ? 'is-loaded' : ''}`}>
      {mobile && <source media={MOBILE_QUERY} srcSet={mobile} />}
      <img
        ref={imgRef}
        src={desktop}
        alt=""
        decoding="async"
        fetchpriority="high"
        onLoad={(e) => reveal(e.currentTarget)}
      />
    </picture>
  );
}

export default function Hero({ profile }) {
  const sources = useHeroSources(profile);

  return (
    <section className="hero surface-dark snap-slide" id={HERO_SECTION.id}>
      {/* Capa 1: fondo de diseño propio detrás de todo el Hero, siempre presente */}
      <div className="hero__ambient" aria-hidden="true" />

      <div className="hero__inner">
        <p className="eyebrow hero__eyebrow fade-in">{profile?.store_name || 'Tu Tienda'} · Apple Premium</p>
        <h1 className="hero__headline fade-in fade-in--delay-1">
          La mejor tecnología Apple,<br /><span className="hero__headline-em">en tu mano.</span>
        </h1>
        <p className="hero__sub fade-in fade-in--delay-2">
          iPhone, Mac, iPad, Watch y AirPods. Productos originales con garantía y
          plan canje para que estrenes el equipo que querés.
        </p>
        <div className="hero__ctas fade-in fade-in--delay-3">
          <Button size="lg" onClick={() => scrollToSection('productos')}>
            Ver catálogo <ArrowRight data-icon="inline-end" />
          </Button>
          <Button variant="outline" size="lg" onClick={() => scrollToSection('canje')}>
            <RefreshCw data-icon="inline-start" /> Cotizar mi equipo
          </Button>
        </div>

        <ul className="hero__chips fade-in fade-in--delay-3">
          {HERO_CHIPS.map((chip) => (
            <li key={chip} className="hero__chip inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-brand" aria-hidden="true" /> {chip}
            </li>
          ))}
        </ul>
      </div>

      {/* Panel de la foto: a la derecha en escritorio, arriba en celular; se funde hacia el texto */}
      <div className="hero__media" aria-hidden="true">
        {sources && (
          <>
            {/* Capa 2: miniatura difuminada (~1 KB) mientras baja la foto */}
            {sources.placeholder && (
              <picture className="hero__placeholder">
                {sources.mobilePlaceholder && <source media={MOBILE_QUERY} srcSet={sources.mobilePlaceholder} />}
                <img src={sources.placeholder} alt="" />
              </picture>
            )}
            {/* Capa 3: foto final; key reinicia el fade si cambia la imagen */}
            <HeroPhoto key={`${sources.desktop}|${sources.mobile}`} desktop={sources.desktop} mobile={sources.mobile} />
            <div className="hero__media-grade" style={{ '--hero-overlay': sources.overlay / 100 }} />
          </>
        )}
      </div>

      <button className="hero__scroll" onClick={() => scrollToSection('productos')} aria-label="Bajar al catálogo">
        <ChevronDown className="size-5 text-muted-foreground" aria-hidden="true" />
      </button>
    </section>
  );
}
