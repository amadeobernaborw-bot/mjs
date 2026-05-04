import { useEffect, useState } from 'react';
import { supabase, TABLES, BUCKETS } from '../../lib/supabase';

export default function Profile() {
  const [form, setForm] = useState({
    id: null,
    store_name: 'MJ STORE',
    logo_url: '',
    whatsapp: '+5492994565758',
    instagram_url: '',
    facebook_url: '',
    google_maps_url: '',
    address: '',
    exchange_rate_ars_per_usd: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from(TABLES.storeProfile)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (data) setForm({ ...form, ...data });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMsg(null);
    const ext = file.name.split('.').pop();
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKETS.storeAssets)
      .upload(path, file, { cacheControl: '3600', upsert: true });
    if (error) {
      setMsg({ type: 'error', text: 'Error subiendo imagen: ' + error.message });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from(BUCKETS.storeAssets).getPublicUrl(path);
    set('logo_url', data.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const payload = {
      store_name: form.store_name,
      logo_url: form.logo_url || null,
      whatsapp: form.whatsapp,
      instagram_url: form.instagram_url || null,
      facebook_url: form.facebook_url || null,
      google_maps_url: form.google_maps_url || null,
      address: form.address || null,
      exchange_rate_ars_per_usd: form.exchange_rate_ars_per_usd
        ? Number(form.exchange_rate_ars_per_usd)
        : null,
      updated_at: new Date().toISOString(),
    };
    let resp;
    if (form.id) {
      resp = await supabase.from(TABLES.storeProfile).update(payload).eq('id', form.id).select().single();
    } else {
      resp = await supabase.from(TABLES.storeProfile).insert(payload).select().single();
    }
    setSaving(false);
    if (resp.error) {
      setMsg({ type: 'error', text: resp.error.message });
    } else {
      setForm({ ...form, ...resp.data });
      setMsg({ type: 'ok', text: 'Cambios guardados.' });
    }
  };

  if (loading) {
    return <div className="loading-state"><div className="spinner" /></div>;
  }

  return (
    <>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Perfil de la tienda</h1>
          <p className="admin__subtitle">Datos que se muestran al cliente y configuración global.</p>
        </div>
      </div>

      <form className="admin-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field field--full">
            <label className="field__label">Logo</label>
            <div className="image-uploader">
              <div className="image-uploader__preview">
                {form.logo_url ? <img src={form.logo_url} alt="Logo" /> : <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>sin logo</span>}
              </div>
              <div style={{ flex: 1 }}>
                <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                <p className="field__hint" style={{ marginTop: 6 }}>
                  {uploading ? 'Subiendo…' : 'JPG, PNG o WebP. Recomendado: cuadrado, fondo transparente.'}
                </p>
              </div>
            </div>
          </div>

          <div className="field">
            <label className="field__label">Nombre de la tienda</label>
            <input className="input" value={form.store_name || ''} onChange={(e) => set('store_name', e.target.value)} required />
          </div>

          <div className="field">
            <label className="field__label">WhatsApp (con +54)</label>
            <input className="input" value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} placeholder="+5492994565758" required />
          </div>

          <div className="field">
            <label className="field__label">Instagram URL</label>
            <input className="input" value={form.instagram_url || ''} onChange={(e) => set('instagram_url', e.target.value)} placeholder="https://instagram.com/mjstore" />
          </div>

          <div className="field">
            <label className="field__label">Facebook URL</label>
            <input className="input" value={form.facebook_url || ''} onChange={(e) => set('facebook_url', e.target.value)} placeholder="https://facebook.com/mjstore" />
          </div>

          <div className="field field--full">
            <label className="field__label">Google Maps (URL completa o embed)</label>
            <input className="input" value={form.google_maps_url || ''} onChange={(e) => set('google_maps_url', e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." />
            <p className="field__hint">Pegá la URL de "Compartir → Insertar mapa" para ver el mapa en la web.</p>
          </div>

          <div className="field field--full">
            <label className="field__label">Dirección del local</label>
            <input className="input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="Av. Argentina 123, Neuquén" />
          </div>

          <div className="field">
            <label className="field__label">Tipo de cambio (ARS por USD)</label>
            <input
              type="number"
              className="input"
              value={form.exchange_rate_ars_per_usd || ''}
              onChange={(e) => set('exchange_rate_ars_per_usd', e.target.value)}
              placeholder="1000"
              step="0.01"
            />
            <p className="field__hint">Se usa para calcular precios y facturas en ambas monedas.</p>
          </div>
        </div>

        {msg && (
          <p style={{ marginTop: 16, color: msg.type === 'error' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {msg.text}
          </p>
        )}

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn--primary btn--lg" disabled={saving || uploading}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </>
  );
}
