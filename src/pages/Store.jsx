import { useEffect, useMemo, useState } from 'react';
import { supabase, TABLES, friendlyDbError } from '../lib/supabase';
import { allRows } from '../lib/pagination';
import { useStoreProfile } from '../hooks/useStoreProfile';
import { useScrollObserver } from '../hooks/useScrollObserver';
import { useSnapScroll } from '../hooks/useSnapScroll';
import { useDocumentTheme, THEME_SCOPES } from '../lib/theme';
import { CATEGORY_ORDER, storefrontModels } from '../lib/inventory/variants';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import CategoryBar from '../components/CategoryBar';
import ProductCarousel from '../components/ProductCarousel';
import VariantPicker from '../components/VariantPicker';
import BentoGrid from '../components/BentoGrid';
import TradeInCalculator from '../components/TradeInCalculator';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import SocialFAB from '../components/SocialFAB';
import SectionDots from '../components/SectionDots';

const ALL = 'Todos';

export default function Store() {
  const { profile } = useStoreProfile();
  useDocumentTheme(THEME_SCOPES.storefront, profile.storefront_theme);
  useSnapScroll();
  const [models, setModels] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeCat, setActiveCat] = useState(ALL);
  const [activeLine, setActiveLine] = useState(null);
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [catalogModels, variants, conditions] = await Promise.all([
          allRows(() => supabase.from(TABLES.catalogModels).select('*').eq('is_active', true).order('id')),
          allRows(() => supabase.from(TABLES.products).select('*').eq('is_active', true).order('id')),
          allRows(() => supabase.from(TABLES.catalogConditions).select('name').order('sort_order').order('id')),
        ]);
        setModels(storefrontModels(catalogModels, variants, { conditions: conditions.map((c) => c.name) }));
      } catch (err) {
        setLoadError(friendlyDbError(err));
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const present = new Set(models.map((m) => m.type_name));
    return [ALL, ...CATEGORY_ORDER.filter((c) => present.has(c))];
  }, [models]);

  // Sub-filtro por línea ("iPhone 15" agrupa 15, Plus, Pro y Pro Max), de la más nueva a la más vieja
  const linesForCat = useMemo(() => {
    if (activeCat === ALL) return [];
    return [...new Set(models.filter((m) => m.type_name === activeCat).map((m) => m.line))];
  }, [models, activeCat]);

  const visible = useMemo(() => models.filter((m) => (activeCat === ALL || m.type_name === activeCat)
    && (!activeLine || m.line === activeLine)), [models, activeCat, activeLine]);

  useEffect(() => { setActiveLine(null); }, [activeCat]);

  useScrollObserver('.fade-in, .scale-in', [models, activeCat, activeLine, profile.id]);

  const handleContact = (model, variant) => {
    if (!profile?.whatsapp) return;
    const wa = profile.whatsapp.replace(/[^\d]/g, '');
    const item = variant?.name || model.name;
    const battery = variant?.battery_health != null ? `, batería ${variant.battery_health}%` : '';
    const msg = `Hola! Me interesa el *${item}*${battery} (${model.type_name}). ¿Tienen disponibilidad?`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // Un modelo con una sola variante no necesita selector: se consulta directo
  const openModel = (model) => {
    if (model.variants.length === 1) handleContact(model, model.variants[0]);
    else setPicked(model);
  };

  return (
    <>
      <Nav profile={profile} />

      <main>
        <Hero profile={profile} />

        <section className="section section--catalog snap-slide" id="productos">
          <div className="container slide-fit">
            <CategoryBar
              categories={categories}
              active={activeCat}
              onChange={setActiveCat}
              models={linesForCat}
              activeModel={activeLine}
              onChangeModel={setActiveLine}
              embedded
            />
            {loadingProducts ? (
              <div className="loading-state"><div className="spinner spinner--lg" /></div>
            ) : loadError ? (
              <div className="empty" role="alert">
                <div className="empty__title">No pudimos cargar el catálogo</div>
                <p>Probá recargar la página en unos minutos.</p>
              </div>
            ) : (
              <ProductCarousel models={visible} onOpen={openModel} />
            )}
          </div>
        </section>

        <BentoGrid />

        <TradeInCalculator profile={profile} />

        {/* Última pantalla: contacto + footer compacto */}
        <div className="snap-slide snap-slide--last">
          <ContactSection profile={profile} />
          <Footer profile={profile} />
        </div>
      </main>

      {picked && <VariantPicker model={picked} onClose={() => setPicked(null)} onContact={handleContact} />}

      <SectionDots />
      <SocialFAB profile={profile} />
    </>
  );
}
