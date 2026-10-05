import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { computeRowHeight } from '../../lib/widgets/layoutMath';
import { FALLBACK_ROW_HEIGHT } from '../../lib/widgets/constants';

/**
 * Ancho del elemento con ResizeObserver (no solo resize de ventana): así la
 * grilla responde cuando se contrae la barra lateral del admin.
 */
export function useElementWidth(ref) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/**
 * Alto de fila para que las primeras 8 filas de la grilla ocupen justo el alto
 * visible desde el borde superior de `ref` hasta el final de la pantalla.
 * Se mide la posición en el documento (top + scrollY), así que no cambia al
 * hacer scroll. Se recalcula al cambiar el tamaño de la ventana o del contenido
 * (por ejemplo, si el encabezado baja de línea).
 * `bottomOffset` es un número o una función estable (el) => número.
 */
export function useFrameRowHeight(ref, { enabled = true, bottomOffset = 0 } = {}) {
  const [rowHeight, setRowHeight] = useState(FALLBACK_ROW_HEIGHT);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return undefined;

    const measure = () => {
      const frameTop = el.getBoundingClientRect().top + window.scrollY;
      const bottomPadding = typeof bottomOffset === 'function' ? bottomOffset(el) : bottomOffset;
      setRowHeight(computeRowHeight({ viewportHeight: window.innerHeight, frameTop, bottomPadding }));
    };

    // Primera medición antes de pintar, para que la grilla no salte
    measure();
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      observer.disconnect();
    };
  }, [ref, enabled, bottomOffset]);

  return rowHeight;
}

// Mensaje del guard activo (null si no hay cambios sin guardar). Lo consultan
// acciones que navegan por código, como "Cerrar sesión".
let activeGuardMessage = null;

/** true si se puede seguir: no hay cambios sin guardar o el usuario confirmó descartarlos. */
export function confirmDiscardUnsavedChanges() {
  return activeGuardMessage == null || window.confirm(activeGuardMessage);
}

const SENTINEL_KEY = '__unsavedChangesGuard';

/**
 * Mientras haya cambios sin guardar pide confirmación:
 * - al cerrar o recargar la pestaña (beforeunload);
 * - al hacer click en un link interno: la app usa BrowserRouter (sin
 *   useBlocker), así que los clicks se interceptan en fase de captura, antes
 *   de que react-router los procese;
 * - con Atrás del navegador: se apila una entrada "centinela" con la misma URL.
 *   Al volver, la ruta no cambia (el panel no se desmonta) y se pregunta; si
 *   el usuario se queda, se repone la centinela;
 * - en navegaciones por código que llamen a confirmDiscardUnsavedChanges().
 */
export function useUnsavedChangesGuard(isDirty, message) {
  useEffect(() => {
    if (!isDirty) return undefined;
    activeGuardMessage = message;
    let leaving = false;

    const pushSentinel = () => {
      window.history.pushState({ ...window.history.state, [SENTINEL_KEY]: true }, '');
    };
    pushSentinel();

    const onPopState = () => {
      if (leaving) return;
      if (window.confirm(message)) {
        leaving = true;
        // Ya estamos en la entrada de antes de la centinela: un paso más es la página anterior real
        window.history.back();
      } else {
        pushSentinel();
      }
    };

    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target instanceof Element ? e.target.closest('a[href]') : null;
      if (!anchor || (anchor.target && anchor.target !== '_self')) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(message)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClick, true);
      activeGuardMessage = null;
      // Guardó o canceló sin salir: se saca la centinela para no dejar una entrada de más
      if (!leaving && window.history.state?.[SENTINEL_KEY]) window.history.back();
    };
  }, [isDirty, message]);
}

/** Id reservado de la vista personalizada (el layout guardado del usuario). */
export const CUSTOM_VIEW = 'custom';

function readStoredView(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // Sin almacenamiento (modo privado): se arranca en la personalizada
  }
}

/**
 * Vista activa de una pantalla, recordada por navegador. Si lo guardado ya no
 * es una vista válida (se renombró o se sacó), vuelve a la personalizada.
 */
export function useActiveView(screen, validIds) {
  const key = `mj-widgets-view-${screen}`;
  const [view, setView] = useState(() => readStoredView(key));

  const select = useCallback((next) => {
    setView(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      // Sin almacenamiento: la elección vale solo para esta visita
    }
  }, [key]);

  return [validIds.includes(view) ? view : CUSTOM_VIEW, select];
}
