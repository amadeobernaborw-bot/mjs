import { useEffect, useMemo, useState } from 'react';
import { supabase, TABLES } from '../lib/supabase';
import { formatARS } from '../lib/format';

const CONDITIONS = [
  { key: 'price_excellent', label: 'Excelente', desc: 'Sin marcas, batería sana, todo funcional' },
  { key: 'price_good',      label: 'Bueno',     desc: 'Marcas leves de uso, todo funcional' },
  { key: 'price_damaged',   label: 'Con daños', desc: 'Pantalla, batería o golpes visibles' },
];

export default function TradeInCalculator({ profile }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cascade selections
  const [selModel, setSelModel] = useState('');
  const [selCapacity, setSelCapacity] = useState('');
  const [condition, setCondition] = useState('price_excellent');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from(TABLES.tradeIn)
        .select('*')
        .eq('is_active', true)
        .order('device_model', { ascending: true });
      if (!error && data) setModels(data);
      setLoading(false);
    })();
  }, []);

  // Lista de modelos únicos (usar columna 'model' si existe, sino device_model parseado)
  const modelOptions = useMemo(() => {
    const set = new Set();
    models.forEach((m) => {
      const name = m.model || (m.device_model || '').replace(/\b\d+\s*(GB|TB)\b/i, '').trim();
      if (name) set.add(name);
    });
    return [...set].sort();
  }, [models]);

  // Capacidades disponibles para el modelo seleccionado
  const capacityOptions = useMemo(() => {
    if (!selModel) return [];
    const matching = models.filter((m) => {
      const n = m.model || (m.device_model || '').replace(/\b\d+\s*(GB|TB)\b/i, '').trim();
      return n === selModel;
    });
    const set = new Set(matching.map((m) => m.capacity || (m.device_model.match(/\d+\s*(GB|TB)/i)?.[0] || '')).filter(Boolean));
    return [...set];
  }, [models, selModel]);

  // Reset capacidad al cambiar modelo
  useEffect(() => { setSelCapacity(''); }, [selModel]);

  const selected = useMemo(() => {
    if (!selModel) return null;
    return models.find((m) => {
      const n = m.model || (m.device_model || '').replace(/\b\d+\s*(GB|TB)\b/i, '').trim();
      const c = m.capacity || (m.device_model.match(/\d+\s*(GB|TB)/i)?.[0] || '');
      const matchModel = n === selModel;
      const matchCap = !selCapacity || c === selCapacity;
      return matchModel && matchCap;
    });
  }, [models, selModel, selCapacity]);

  const value = selected ? selected[condition] : null;

  const sendToWhatsApp = () => {
    if (!selected || !profile?.whatsapp) return;
    const wa = profile.whatsapp.replace(/[^\d]/g, '');
    const cond = CONDITIONS.find((c) => c.key === condition)?.label || '';
    const label = selected.device_model || `${selModel} ${selCapacity}`;
    const msg = `Hola! Quiero canjear mi *${label}* (estado: ${cond}). La cotización indicada es ${value ? formatARS(value) : 'a confirmar'}. ¿Cómo seguimos?`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <section className="section tradein" id="canje">
      <div className="container">
        <div className="center" style={{ marginBottom: 40 }}>
          <p className="eyebrow fade-in">Plan Canje</p>
          <h2 className="title fade-in fade-in--delay-1" style={{ marginTop: 8 }}>
            Tu iPhone usado, parte del próximo.
          </h2>
          <p className="body-lg fade-in fade-in--delay-2" style={{ marginTop: 14, maxWidth: 600, margin: '14px auto 0' }}>
            Decinos qué iPhone tenés y en qué estado. Te damos una cotización
            estimada al instante.
          </p>
        </div>

        <div className="tradein__panel fade-in">
          {loading ? (
            <div className="loading-state"><div className="spinner" /></div>
          ) : models.length === 0 ? (
            <div className="empty">
              <div className="empty__icon">📱</div>
              <div className="empty__title">Pronto disponible</div>
              <p>Estamos cargando los modelos. Contactanos por WhatsApp para una cotización personalizada.</p>
            </div>
          ) : (
            <>
              <div className="tradein__form tradein__form--cascade">
                <div className="field">
                  <label className="field__label" htmlFor="ti-model">Modelo</label>
                  <select id="ti-model" className="select" value={selModel} onChange={(e) => setSelModel(e.target.value)}>
                    <option value="">Seleccionar modelo…</option>
                    {modelOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="ti-cap">Capacidad</label>
                  <select id="ti-cap" className="select" value={selCapacity} onChange={(e) => setSelCapacity(e.target.value)} disabled={!selModel || capacityOptions.length === 0}>
                    <option value="">{selModel ? (capacityOptions.length === 0 ? 'No especificada' : 'Seleccionar…') : 'Elegí modelo primero'}</option>
                    {capacityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">Estado del equipo</label>
                  <div className="condition-grid">
                    {CONDITIONS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        className={`condition-chip ${condition === c.key ? 'is-active' : ''}`}
                        onClick={() => setCondition(c.key)}
                        title={c.desc}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="tradein__result">
                <p className="body" style={{ marginBottom: 0 }}>Cotización estimada</p>
                <div className={`tradein__amount ${!value ? 'tradein__amount--empty' : ''}`}>
                  {value ? formatARS(value) : (selected ? 'A confirmar' : 'Seleccioná tu modelo')}
                </div>
                <p className="body" style={{ fontSize: 13, marginTop: 4 }}>
                  Valor sujeto a revisión presencial del equipo.
                </p>
                {selected && (
                  <button className="btn btn--primary btn--lg" onClick={sendToWhatsApp} style={{ marginTop: 18 }}>
                    Coordinar canje por WhatsApp
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
