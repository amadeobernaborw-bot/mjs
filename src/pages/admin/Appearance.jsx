import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import HeroImageEditor from '../../components/admin/HeroImageEditor';
import { supabase, TABLES, friendlyDbError } from '../../lib/supabase';
import { THEMES, DEFAULT_THEME, isValidTheme } from '../../lib/theme';

const THEME_TARGETS = [
  { column: 'storefront_theme', title: 'Tienda pública', hint: 'Lo que ven tus clientes en la landing.' },
  { column: 'admin_theme', title: 'Panel admin', hint: 'Este panel y la pantalla de login. Se aplica al instante.' },
];

/** Tarjeta con una miniatura dibujada con los tokens reales del tema (data-theme). */
function ThemeOption({ theme, name, checked, onSelect }) {
  return (
    <label className={`theme-option ${checked ? 'is-selected' : ''}`}>
      <input type="radio" name={name} value={theme.id} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="theme-option__mock" data-theme={theme.id} aria-hidden="true">
        <span className="theme-option__bar" />
        <span className="theme-option__card glass">
          <span className="theme-option__line" />
          <span className="theme-option__line theme-option__line--short" />
        </span>
        <span className="theme-option__cta" />
      </span>
      <span className="theme-option__label">
        {theme.label}
        {checked && <Check className="size-4" aria-hidden="true" />}
      </span>
      <span className="theme-option__desc">{theme.description}</span>
    </label>
  );
}

export default function Appearance() {
  const { profile, setProfile, profileLoading } = useOutletContext();
  const [status, setStatus] = useState({});

  const setColumnStatus = (column, state, text) =>
    setStatus((s) => ({ ...s, [column]: { state, text } }));

  // Guardado optimista: el tema del admin cambia al instante (AdminLayout lee el mismo perfil)
  const selectTheme = async (column, value) => {
    if (profile[column] === value) return;
    if (!profile.id) {
      setColumnStatus(column, 'error', 'Primero guardá los datos de la tienda en "Tienda".');
      return;
    }
    const previous = profile[column];
    setProfile((p) => ({ ...p, [column]: value }));
    setColumnStatus(column, 'saving', 'Guardando…');
    const { error } = await supabase
      .from(TABLES.storeProfile)
      .update({ [column]: value, updated_at: new Date().toISOString() })
      .eq('id', profile.id);
    if (error) {
      setProfile((p) => ({ ...p, [column]: previous }));
      setColumnStatus(column, 'error', friendlyDbError(error));
    } else {
      setColumnStatus(column, 'saved', 'Guardado.');
    }
  };

  if (profileLoading) {
    return <div className="loading-state"><div className="spinner" /></div>;
  }

  const themeOf = (column) => (isValidTheme(profile[column]) ? profile[column] : DEFAULT_THEME);

  return (
    <>
      <div className="admin__head">
        <div>
          <h1 className="admin__title">Apariencia</h1>
          <p className="admin__subtitle">Temas de la tienda y del panel, e imagen principal de la landing.</p>
        </div>
      </div>

      <Card className="appearance-section">
        <CardContent>
          <div className="appearance-section__head">
            <h2 className="appearance-section__title">Temas</h2>
            <p className="appearance-section__hint">Cada zona tiene su propio tema. Los cambios se guardan al elegir.</p>
          </div>
          <div className="theme-pickers">
            {THEME_TARGETS.map((target) => {
              const current = themeOf(target.column);
              const columnStatus = status[target.column];
              return (
                <fieldset key={target.column} className="theme-picker" disabled={columnStatus?.state === 'saving'}>
                  <legend className="theme-picker__title">{target.title}</legend>
                  <p className="theme-picker__hint">{target.hint}</p>
                  <div className="theme-picker__options">
                    {Object.values(THEMES).map((theme) => (
                      <ThemeOption
                        key={theme.id}
                        theme={theme}
                        name={target.column}
                        checked={current === theme.id}
                        onSelect={() => selectTheme(target.column, theme.id)}
                      />
                    ))}
                  </div>
                  <p className="theme-picker__status" role="status" data-state={columnStatus?.state}>
                    {columnStatus?.text || ''}
                  </p>
                </fieldset>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <HeroImageEditor
        key={profile.id || 'sin-perfil'}
        profile={profile}
        storefrontTheme={themeOf('storefront_theme')}
        onSaved={(saved) => setProfile((p) => ({ ...p, ...saved }))}
      />
    </>
  );
}
