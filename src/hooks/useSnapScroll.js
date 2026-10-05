import { useEffect } from 'react';

const SNAP_CLASS = 'snap-scroll';

/** Activa el scroll guiado por secciones (ver snap-scroll.css) mientras el componente está montado. */
export function useSnapScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(SNAP_CLASS);
    return () => root.classList.remove(SNAP_CLASS);
  }, []);
}
