import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsDownUp, ChevronsUpDown, Package, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import InlinePanel from '../../components/ui/InlinePanel';
import { useTaxonomy } from '../../components/TaxonomyPicker';
import InventoryTree from '../../components/admin/inventory/InventoryTree';
import ModelForm from '../../components/admin/inventory/ModelForm';
import VariantForm from '../../components/admin/inventory/VariantForm';
import VariantMatrix from '../../components/admin/inventory/VariantMatrix';
import { CATEGORY_ORDER, groupInventory } from '../../lib/inventory/variants';
import {
  deleteModel, deleteVariant, fetchInventory, insertVariants, inventoryErrorMessage,
  saveModel, saveVariant, setModelActive, updateVariant, variantPayload,
} from '../../lib/inventory/api';

const FORM_ID = 'inv-form';
const INITIAL_FILTERS = { search: '', category: 'Todas', visibility: 'Todos', stockOnly: false };

const PANEL_TITLES = {
  model: (p) => (p.model?.id ? 'Editar modelo' : 'Nuevo modelo'),
  variant: (p) => `${p.variant?.id ? 'Editar' : 'Nueva'} variante · ${p.model.name}`,
  matrix: (p) => `Agregar varias · ${p.model.name}`,
};

export default function Inventory() {
  const tax = useTaxonomy();
  const [data, setData] = useState({ models: [], variants: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [expanded, setExpanded] = useState(() => new Set());
  const [panel, setPanel] = useState(null); // { kind: 'model' | 'variant' | 'matrix', model, variant, seq }
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [panelError, setPanelError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Solo vale la última lectura: una más vieja que llega tarde no pisa cambios nuevos
  const loadSeq = useRef(0);
  const panelRef = useRef(null);
  panelRef.current = panel;

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    try {
      const result = await fetchInventory();
      if (seq !== loadSeq.current) return;
      setData(result);
      setLoadError(null);
    } catch (err) {
      if (seq === loadSeq.current) setLoadError(inventoryErrorMessage(err));
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const order = useMemo(() => ({
    conditions: tax.conditions.map((c) => c.name),
    colors: tax.colors.map((c) => c.name),
  }), [tax.conditions, tax.colors]);

  const lines = useMemo(() => groupInventory(data.models, data.variants, filters, order), [data, filters, order]);
  const shownModelIds = useMemo(() => lines.flatMap((l) => l.models.map((m) => m.id)), [lines]);
  const totals = useMemo(() => ({
    models: data.models.length,
    variants: data.variants.length,
    units: data.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0),
  }), [data]);
  const categories = useMemo(() => {
    const present = new Set(data.models.map((m) => m.type_name));
    return [...CATEGORY_ORDER.filter((c) => present.has(c)), ...[...present].filter((c) => !CATEGORY_ORDER.includes(c))];
  }, [data.models]);

  // Con búsqueda, todo lo encontrado se ve abierto
  const filtering = !!filters.search.trim();
  const isOpen = (id) => filtering || expanded.has(id);
  const toggleOpen = (id) => setExpanded((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allOpen = shownModelIds.length > 0 && shownModelIds.every((id) => expanded.has(id));
  const toggleAll = () => setExpanded(allOpen ? new Set() : new Set(shownModelIds));

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));
  const variantsOf = (modelId) => data.variants.filter((v) => v.model_id === modelId);

  // El modelo del panel, actualizado si se editó mientras estaba abierto
  const panelModel = panel?.model && (data.models.find((m) => m.id === panel.model.id) || panel.model);

  const openPanel = (next) => { setPanelError(null); setUploading(false); setPanel({ ...next, seq: Date.now() }); };
  const closePanel = useCallback(() => { setPanel(null); setPanelError(null); setUploading(false); }, []);

  /** Corre una escritura, avisa si falla y recarga. */
  const run = async (fn) => {
    try {
      await fn();
      setNotice(null);
    } catch (err) {
      setNotice(inventoryErrorMessage(err));
    }
    await load();
  };

  const submitPanel = async (payload) => {
    // Si se cancela o se abre otro panel mientras guarda, el resultado no toca el panel nuevo
    const seq = panel.seq;
    const stillOpen = () => panelRef.current?.seq === seq;
    setSaving(true);
    setPanelError(null);
    try {
      if (panel.kind === 'model') {
        const isNew = !payload.id;
        const saved = await saveModel(payload, variantsOf(payload.id));
        await load();
        if (isNew) setExpanded((s) => new Set(s).add(saved.id));
        if (!stillOpen()) return;
        // Recién creado: se sigue con su primera variante
        if (isNew) openPanel({ kind: 'variant', model: saved, variant: null });
        else closePanel();
      } else if (panel.kind === 'variant') {
        await saveVariant(panel.variant?.id, variantPayload(panelModel, payload));
        await load();
        if (stillOpen()) closePanel();
      } else {
        if (payload.length === 0) throw new Error('No hay variantes nuevas: elegí capacidades o colores que no estén cargados.');
        await insertVariants(payload.map((v) => variantPayload(panelModel, v)));
        await load();
        if (stillOpen()) closePanel();
      }
    } catch (err) {
      const message = err?.code ? inventoryErrorMessage(err) : err.message;
      if (stillOpen()) setPanelError(message); else setNotice(message);
      // Una escritura a medias (p. ej. modelo guardado y variantes no) tiene que verse
      load();
    } finally {
      setSaving(false);
    }
  };

  const adjustStock = async (variant, delta) => {
    const stock = Math.max(0, (Number(variant.stock) || 0) + delta);
    const swap = (value) => setData((d) => ({ ...d, variants: d.variants.map((v) => (v.id === variant.id ? { ...v, stock: value } : v)) }));
    loadSeq.current += 1; // descarta lecturas en curso que traerían el stock viejo
    swap(stock);
    try {
      await updateVariant(variant.id, { stock });
    } catch (err) {
      setNotice(inventoryErrorMessage(err));
      load();
    }
  };

  const actions = {
    editModel: (model) => openPanel({ kind: 'model', model }),
    addVariant: (model) => openPanel({ kind: 'variant', model, variant: null }),
    addMatrix: (model) => openPanel({ kind: 'matrix', model }),
    editVariant: (model, variant) => openPanel({ kind: 'variant', model, variant }),
    duplicateVariant: (model, variant) => openPanel({ kind: 'variant', model, variant: { ...variant, id: null } }),
    toggleModel: (model) => run(() => setModelActive(model.id, model.is_active === false)),
    deleteModel: (model) => {
      const count = variantsOf(model.id).length;
      if (count > 0) {
        setNotice(`"${model.name}" tiene ${count} ${count === 1 ? 'variante' : 'variantes'}. Borralas primero o ocultá el modelo.`);
        return;
      }
      if (!confirm(`¿Eliminar el modelo "${model.name}"? Esta acción es permanente.`)) return;
      run(() => deleteModel(model.id));
    },
    toggleVariant: (variant) => run(() => updateVariant(variant.id, { is_active: !variant.is_active })),
    deleteVariant: (variant) => {
      if (!confirm(`¿Eliminar "${variant.name}"? Esta acción es permanente.`)) return;
      run(() => deleteVariant(variant.id));
    },
    adjustStock,
  };

  return (
    <div className="page-layout">
      <div className={`page-layout__main ${panel ? 'has-panel' : ''}`}>
        <div className="admin__head">
          <div>
            <h1 className="admin__title">Inventario</h1>
            <p className="admin__subtitle">
              {totals.models} modelos · {totals.variants} variantes · {totals.units} unidades en stock.
            </p>
          </div>
          <Button onClick={() => openPanel({ kind: 'model', model: null })}><Plus data-icon="inline-start" /> Nuevo modelo</Button>
        </div>

        <div className="toolbar inv-toolbar">
          <input
            className="input toolbar__search"
            type="search"
            placeholder="Buscar modelo, capacidad, color…"
            aria-label="Buscar en el inventario"
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
          />
          <div className="inv-toolbar__filters">
            <select className="select inv-toolbar__select" aria-label="Tipo" value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
              <option value="Todas">Todos los tipos</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="select inv-toolbar__select" aria-label="Visibilidad" value={filters.visibility} onChange={(e) => setFilter('visibility', e.target.value)}>
              <option value="Todos">Visibles y ocultas</option>
              <option value="Activos">Solo visibles</option>
              <option value="Ocultos">Solo ocultas</option>
            </select>
            <label className="inv-check inv-toolbar__check">
              <input type="checkbox" checked={filters.stockOnly} onChange={(e) => setFilter('stockOnly', e.target.checked)} />
              <span>Con stock</span>
            </label>
            <Button variant="ghost" size="sm" onClick={toggleAll} disabled={filtering || shownModelIds.length === 0}>
              {allOpen ? <ChevronsDownUp data-icon="inline-start" /> : <ChevronsUpDown data-icon="inline-start" />}
              {allOpen ? 'Contraer todo' : 'Expandir todo'}
            </Button>
          </div>
        </div>

        {notice && (
          <div className="inv-notice" role="alert">
            <span>{notice}</span>
            <Button variant="ghost" size="sm" onClick={() => setNotice(null)}>Cerrar</Button>
          </div>
        )}

        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : loadError ? (
          <Card className="empty">
            <div className="empty__title">No se pudo cargar el inventario</div>
            <p>{loadError}</p>
            <Button variant="outline" className="mt-3" onClick={() => { setLoading(true); load(); }}>Reintentar</Button>
          </Card>
        ) : lines.length === 0 ? (
          <Card className="empty">
            <Package className="empty__icon mx-auto block size-12" strokeWidth={1.5} aria-hidden="true" />
            <div className="empty__title">{data.models.length ? 'Nada coincide con los filtros' : 'No hay modelos'}</div>
            <p>{data.models.length ? 'Probá con otra búsqueda o quitá filtros.' : 'Cargá tu primer modelo para empezar.'}</p>
            {data.models.length > 0 && <Button variant="outline" className="mt-3" onClick={() => setFilters(INITIAL_FILTERS)}>Quitar filtros</Button>}
          </Card>
        ) : (
          <InventoryTree lines={lines} isOpen={isOpen} onToggleOpen={toggleOpen} actions={actions} />
        )}
      </div>

      <InlinePanel
        open={!!panel}
        onClose={closePanel}
        wide={panel?.kind === 'matrix'}
        title={panel ? PANEL_TITLES[panel.kind](panel) : ''}
        footer={(
          <>
            <Button variant="outline" type="button" onClick={closePanel}>Cancelar</Button>
            <Button type="submit" form={FORM_ID} disabled={saving || uploading}>
              {saving ? 'Guardando…' : panel?.kind === 'model' && !panel.model?.id ? 'Crear y agregar variante' : 'Guardar'}
            </Button>
          </>
        )}
      >
        {panelError && <p className="inv-notice inv-notice--panel" role="alert">{panelError}</p>}
        {panel?.kind === 'model' && (
          <ModelForm key={panel.seq} formId={FORM_ID} model={panel.model} models={data.models} tax={tax} onSubmit={submitPanel} onUploadingChange={setUploading} />
        )}
        {panel?.kind === 'variant' && (
          <VariantForm key={panel.seq} formId={FORM_ID} model={panelModel} variant={panel.variant} tax={tax} onSubmit={submitPanel} onUploadingChange={setUploading} />
        )}
        {panel?.kind === 'matrix' && (
          <VariantMatrix key={panel.seq} formId={FORM_ID} model={panelModel} existing={variantsOf(panel.model.id)} tax={tax} onSubmit={submitPanel} />
        )}
      </InlinePanel>
    </div>
  );
}
