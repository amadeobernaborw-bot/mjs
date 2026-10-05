import { SLIDES, scrollToSection } from '../lib/sections';
import { useActiveSection } from '../hooks/useActiveSection';

const SLIDE_IDS = SLIDES.map((s) => s.id);

export default function SectionDots() {
  const activeId = useActiveSection(SLIDE_IDS);

  return (
    <nav className="section-dots" aria-label="Secciones">
      {SLIDES.map((s) => {
        const isActive = s.id === activeId;
        return (
          <button
            key={s.id}
            type="button"
            className={`section-dots__btn ${isActive ? 'is-active' : ''}`}
            aria-label={`Ir a ${s.label}`}
            aria-current={isActive ? 'true' : undefined}
            title={s.label}
            onClick={() => scrollToSection(s.id)}
          >
            <span className="section-dots__dot" aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
