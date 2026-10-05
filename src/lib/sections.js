// Secciones de la landing: las usan el Nav (links) y SectionDots (puntos indicadores)
export const HERO_SECTION = { id: 'inicio', label: 'Inicio' };

export const SECTIONS = [
  { id: 'productos', label: 'Productos' },
  { id: 'servicios', label: 'Por qué nosotros' },
  { id: 'canje', label: 'Plan Canje' },
  { id: 'contacto', label: 'Contacto' },
];

export const SLIDES = [HERO_SECTION, ...SECTIONS];

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** 'smooth', salvo que el usuario haya pedido reducir el movimiento. */
export function getScrollBehavior() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches ? 'auto' : 'smooth';
}

/** Lleva a una sección respetando scroll-padding-top (debajo de la barra fija). */
export function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: getScrollBehavior(), block: 'start' });
}
