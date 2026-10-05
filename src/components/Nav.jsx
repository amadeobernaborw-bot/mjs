import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Menu, MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SECTIONS, scrollToSection } from '../lib/sections';

// Debe coincidir con --nav-height en design-system.css
const NAV_HEIGHT = 56;

// true mientras el hero (carbón) sigue debajo de la barra: el nav usa la variante oscura
function useOverHero() {
  const [overHero, setOverHero] = useState(true);

  useEffect(() => {
    const hero = document.querySelector('.hero');
    if (!hero) {
      setOverHero(false);
      return undefined;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      setOverHero(hero.getBoundingClientRect().bottom > NAV_HEIGHT);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  return overHero;
}

export default function Nav({ profile }) {
  const [open, setOpen] = useState(false);
  const overHero = useOverHero();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleScroll = (e, id) => {
    e.preventDefault();
    setOpen(false);
    scrollToSection(id);
  };

  const wa = (profile?.whatsapp || '').replace(/[^\d+]/g, '');

  return (
    <header className={`nav ${overHero ? 'nav--over-hero surface-dark' : ''}`}>
      <div className="nav__inner">
        <Link to="/" className="nav__logo" aria-label={`${profile?.store_name || 'Tu Tienda'} inicio`}>
          {profile?.logo_url ? (
            <img src={profile.logo_url} alt={profile.store_name || 'Tu Tienda'} />
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>{profile?.store_name || 'Tu Tienda'}</span>
            </>
          )}
        </Link>

        <nav className="nav__links" aria-label="Navegación principal">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="nav__link" onClick={(e) => handleScroll(e, s.id)}>
              {s.label}
            </a>
          ))}
          {wa && (
            <Button asChild size="sm" className="rounded-full px-4">
              <a href={`https://wa.me/${wa.replace('+','')}`} target="_blank" rel="noreferrer">
                <MessageCircle data-icon="inline-start" /> WhatsApp
              </a>
            </Button>
          )}
        </nav>

        <button
          className="nav__hamburger"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile-only menu, oculto por CSS en desktop */}
      <div className={`nav__menu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="nav__link" onClick={(e) => handleScroll(e, s.id)}>
            {s.label}
          </a>
        ))}
        {wa && (
          <a className="nav__link inline-flex items-center gap-2" href={`https://wa.me/${wa.replace('+','')}`} target="_blank" rel="noreferrer">
            WhatsApp <ArrowRight className="size-5" aria-hidden="true" />
          </a>
        )}
      </div>
    </header>
  );
}
