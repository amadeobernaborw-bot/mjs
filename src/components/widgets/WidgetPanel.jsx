import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, LayoutGrid, Plus, RotateCcw, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BREAKPOINTS, FALLBACK_ROW_HEIGHT, breakpointFor } from '../../lib/widgets/constants';
import { layoutsEqual, moveItem, resizeItem } from '../../lib/widgets/layoutMath';
import { visualOf } from '../../lib/widgets/registry';
import { useWidgetLayout } from '../../hooks/useWidgetLayout';
import { DEFAULT_LABELS } from './labels';
import { CUSTOM_VIEW, useActiveView, useElementWidth, useFrameRowHeight, useUnsavedChangesGuard } from './hooks';
import ViewTabs from './ViewTabs';
import WidgetGrid from './WidgetGrid';
import WidgetCatalog from './WidgetCatalog';
import { WidgetLoading } from './WidgetStates';

/**
 * Pantalla de widgets personalizable.
 *   viendo ──Personalizar──▶ editando ──Guardar──▶ guardando ──ok──▶ viendo
 *                              ▲  └──Cancelar──▶ viendo   │
 *                              └────────── error ─────────┘ (el borrador queda intacto)
 * Nada se persiste mientras se edita: el borrador vive acá hasta "Guardar".
 *
 * `leading` va a la izquierda de la barra (p. ej. el saludo) y `toolbar` a la
 * derecha solo mientras no se edita (p. ej. el filtro de período). La barra
 * mantiene el mismo alto en los dos modos para que la grilla no salte.
 * `frameBottomOffset` (número o función estable) descuenta el padding inferior
 * de la página para que el encuadre de 8 filas termine justo en el borde.
 *
 * Vistas: `presets` ([{ id, label, description, items }]) son vistas fijas de
 * solo lectura que se alternan con pestañas junto a la vista personalizada
 * (CUSTOM_VIEW, el layout guardado). "Usar como base" copia una vista fija al
 * borrador de la personalizada; solo esa se edita y se guarda.
 */
export default function WidgetPanel({
  screen, registry, presets = [], leading, toolbar, labels: customLabels, frameBottomOffset = 0,
}) {
  const labels = useMemo(() => ({ ...DEFAULT_LABELS, ...customLabels }), [customLabels]);
  const { data, isLoading, loadError, reload, save } = useWidgetLayout(screen);
  const saved = useMemo(() => registry.mergeLayout(data?.items ?? null), [registry, data]);

  const viewIds = useMemo(() => [...presets.map((p) => p.id), CUSTOM_VIEW], [presets]);
  const [activeView, setActiveView] = useActiveView(screen, viewIds);
  const preset = presets.find((p) => p.id === activeView) || null;
  const presetLayout = useMemo(() => (preset ? registry.layoutFromPreset(preset.items) : null), [registry, preset]);

  const [mode, setMode] = useState('viewing');
  const [draft, setDraft] = useState(null);
  const [base, setBase] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  // Desde qué vista y con qué borrador se entró a editar (para que Cancelar vuelva ahí)
  const [editOrigin, setEditOrigin] = useState(null);

  const areaRef = useRef(null);
  const width = useElementWidth(areaRef);
  const breakpoint = breakpointFor(width);
  const isDesktop = breakpoint === 'lg';
  const frameRowHeight = useFrameRowHeight(areaRef, { enabled: isDesktop, bottomOffset: frameBottomOffset });
  const rowHeight = isDesktop ? frameRowHeight : FALLBACK_ROW_HEIGHT;

  const editing = mode !== 'viewing';
  const layout = editing ? draft : (presetLayout || saved);
  const showLoading = !editing && !preset && isLoading;
  const isDirty = editing && !layoutsEqual(draft, base.layout);
  const canCustomize = !isLoading && !loadError && isDesktop;

  useUnsavedChangesGuard(isDirty, labels.confirmLeave);

  // Llevar a la vista el widget recién agregado (entra al fondo)
  useEffect(() => {
    if (!lastAdded) return;
    const el = areaRef.current?.querySelector(`[data-widget-id="${lastAdded}"]`);
    el?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    setLastAdded(null);
  }, [lastAdded]);

  /** Entra a editar la vista personalizada; `from` es el borrador inicial (por defecto, lo guardado). */
  const enterEdit = (from = saved) => {
    setBase({ layout: saved, updatedAt: data?.updatedAt ?? null });
    setDraft(from);
    setEditOrigin({ view: activeView, startDraft: from });
    setSaveError(null);
    setActiveView(CUSTOM_VIEW);
    setMode('editing');
  };

  const exitEdit = () => {
    setMode('viewing');
    setDraft(null);
    setBase(null);
    setEditOrigin(null);
    setSaveError(null);
  };

  const cancel = () => {
    // Si no se tocó el borrador con el que se entró (p. ej. recién copiado de una
    // vista fija), no hay nada propio que descartar: no se pregunta.
    const touched = !editOrigin || !layoutsEqual(draft, editOrigin.startDraft);
    if (isDirty && touched && !window.confirm(labels.confirmDiscard)) return;
    const originView = editOrigin?.view;
    exitEdit();
    if (originView && originView !== CUSTOM_VIEW) setActiveView(originView);
  };

  const restore = () => {
    if (!window.confirm(labels.confirmRestore)) return;
    setDraft(registry.defaultLayout);
  };

  const handleSave = async () => {
    setMode('saving');
    setSaveError(null);
    try {
      await save({ items: draft, expectedUpdatedAt: base.updatedAt });
      exitEdit();
    } catch (err) {
      if (err.isConflict) {
        // Otra pestaña guardó antes. Se toma su versión como referencia sin tocar
        // el borrador: un segundo "Guardar" la reemplaza a propósito; "Cancelar"
        // muestra la versión nueva.
        try {
          const fresh = await reload();
          setBase((b) => ({ ...b, updatedAt: fresh?.updatedAt ?? null }));
          setSaveError(labels.conflict);
        } catch {
          setSaveError(`${err.message} ${labels.saveErrorSuffix}`);
        }
      } else {
        setSaveError(`${err.message} ${labels.saveErrorSuffix}`);
      }
      setMode('editing');
    }
  };

  const update = useCallback((fn) => setDraft((prev) => {
    if (!prev) return prev;
    const next = fn(prev);
    return layoutsEqual(next, prev) ? prev : next;
  }), []);

  const actions = useMemo(() => ({
    change: (next) => update(() => next),
    move: (id, dx, dy) => update((l) => moveItem(l, id, dx, dy)),
    resize: (id, dw, dh) => update((l) => resizeItem(l, id, dw, dh, registry.widgetById.get(id))),
    setVisual: (id, visual) => update((l) => {
      const item = l.find((it) => it.widget_id === id);
      // Elegir el visual que ya se ve no cuenta como cambio
      if (!item || visualOf(item.config, registry.widgetById.get(id)) === visual) return l;
      return registry.updateConfig(l, id, { visual });
    }),
    hide: (id) => update((l) => registry.hideWidget(l, id)),
  }), [update, registry]);

  const addWidget = (id) => {
    update((l) => registry.showWidget(l, id));
    setCatalogOpen(false);
    setLastAdded(id);
  };

  return (
    <div className="widget-panel">
      <div className="widget-panel__bar">
        <div className="widget-panel__leading">{leading}</div>
        <div className="widget-panel__actions">
          {!editing && toolbar}
          {!editing && (isDesktop ? (
            preset ? (
              <Button
                type="button" variant="outline" size="sm" onClick={() => enterEdit(presetLayout)} disabled={!canCustomize}
                title={loadError ? labels.loadError : labels.useAsBaseHint}
              >
                <Copy data-icon="inline-start" /> {labels.useAsBase}
              </Button>
            ) : (
              <Button
                type="button" variant="outline" size="sm" onClick={() => enterEdit()} disabled={!canCustomize}
                title={loadError ? labels.loadError : undefined}
              >
                <LayoutGrid data-icon="inline-start" /> {labels.customize}
              </Button>
            )
          ) : (
            width > 0 && <span className="widget-panel__hint">{labels.narrowHint}</span>
          ))}

          {editing && (
            <>
              <span className="widget-panel__hint">{isDesktop ? labels.editingHint : labels.narrowWhileEditing}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setCatalogOpen(true)} disabled={mode === 'saving' || !isDesktop}>
                <Plus data-icon="inline-start" /> {labels.addWidget}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={restore} disabled={mode === 'saving'}>
                <RotateCcw data-icon="inline-start" /> {labels.restore}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancel} disabled={mode === 'saving'}>
                {labels.cancel}
              </Button>
              <Button type="button" size="sm" onClick={handleSave} disabled={!isDirty || mode === 'saving'}>
                {mode === 'saving' ? labels.saving : labels.save}
              </Button>
            </>
          )}
        </div>
      </div>

      {presets.length > 0 && (
        <div className="widget-panel__views">
          <ViewTabs
            label={labels.views}
            views={[...presets, { id: CUSTOM_VIEW, label: labels.customView }]}
            active={activeView}
            disabled={editing}
            onChange={setActiveView}
          />
          <span className="widget-panel__hint">
            {preset ? preset.description : (editing ? '' : labels.customViewHint)}
          </span>
        </div>
      )}

      {loadError && !preset && (
        <div className="widget-panel__alert" role="alert">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span>{labels.loadError} <small>({loadError.message})</small></span>
        </div>
      )}

      <div className="widget-panel__area" ref={areaRef}>
        {showLoading ? (
          <WidgetLoading />
        ) : width > 0 && (
          <WidgetGrid
            key={editing ? CUSTOM_VIEW : activeView}
            registry={registry}
            layout={layout}
            width={width}
            cols={BREAKPOINTS[breakpoint].cols}
            rowHeight={rowHeight}
            editing={mode === 'editing'}
            labels={labels}
            actions={actions}
          />
        )}
      </div>

      {saveError && (
        <div className="widget-toast" role="alert">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          <span>{saveError}</span>
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => setSaveError(null)} aria-label="Cerrar aviso">
            <X aria-hidden="true" />
          </Button>
        </div>
      )}

      {editing && (
        <WidgetCatalog
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
          registry={registry}
          layout={draft}
          labels={labels}
          onAdd={addWidget}
        />
      )}
    </div>
  );
}
