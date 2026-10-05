import { useEffect } from 'react';

export function useScrollObserver(selector = '.fade-in, .scale-in', deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll(selector);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      // Sin margen inferior: con el scroll guiado no hay "un poco más de scroll" para revelar el pie de cada pantalla
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
