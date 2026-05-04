import { useEffect, useMemo, useState } from 'react';
import { supabase, TABLES } from '../lib/supabase';
import { useStoreProfile } from '../hooks/useStoreProfile';
import { useScrollObserver } from '../hooks/useScrollObserver';
import Nav from '../components/Nav';
import Hero from '../components/Hero';
import CategoryBar from '../components/CategoryBar';
import ProductCarousel from '../components/ProductCarousel';
import BentoGrid from '../components/BentoGrid';
import TradeInCalculator from '../components/TradeInCalculator';
import ContactSection from '../components/ContactSection';
import Footer from '../components/Footer';
import WhatsAppFAB from '../components/WhatsAppFAB';

const ALL = 'Todos';
const CATEGORY_ORDER = ['Todos', 'iPhone', 'Mac', 'iPad', 'Watch', 'AirPods', 'Accesorios'];

export default function Store() {
  const { profile } = useStoreProfile();
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeCat, setActiveCat] = useState(ALL);
  const [activeModel, setActiveModel] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from(TABLES.products)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setProducts(data || []);
      setLoadingProducts(false);
    })();
  }, []);

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return CATEGORY_ORDER.filter((c) => c === ALL || present.has(c));
  }, [products]);

  const modelsForCat = useMemo(() => {
    if (activeCat === ALL) return [];
    const set = new Set();
    products.forEach((p) => {
      if (p.category === activeCat) {
        const m = p.model || (p.name?.match(/iPhone\s+\d+\s*(Pro\s*Max|Pro|Plus)?/i)?.[0]) || null;
        if (m) set.add(m.trim());
      }
    });
    return [...set].sort();
  }, [products, activeCat]);

  const visible = useMemo(() => {
    let list = products;
    if (activeCat !== ALL) list = list.filter((p) => p.category === activeCat);
    if (activeModel) {
      list = list.filter((p) => {
        const m = p.model || (p.name?.match(/iPhone\s+\d+\s*(Pro\s*Max|Pro|Plus)?/i)?.[0]) || '';
        return m.trim().toLowerCase() === activeModel.toLowerCase();
      });
    }
    return list;
  }, [products, activeCat, activeModel]);

  useEffect(() => { setActiveModel(null); }, [activeCat]);

  useScrollObserver('.fade-in, .scale-in', [products, activeCat, activeModel, profile.id]);

  const handleContact = (product) => {
    if (!profile?.whatsapp) return;
    const wa = profile.whatsapp.replace(/[^\d]/g, '');
    const msg = `Hola! Me interesa el *${product.name}* (${product.category}). ¿Tienen disponibilidad?`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <>
      <Nav profile={profile} />
      <CategoryBar
        categories={categories}
        active={activeCat}
        onChange={setActiveCat}
        models={modelsForCat}
        activeModel={activeModel}
        onChangeModel={setActiveModel}
      />

      <main>
        <Hero profile={profile} />

        <section className="container section" id="productos">
          {loadingProducts ? (
            <div className="loading-state"><div className="spinner spinner--lg" /></div>
          ) : (
            <ProductCarousel products={visible} onContact={handleContact} />
          )}
        </section>

        <BentoGrid />

        <TradeInCalculator profile={profile} />

        <ContactSection profile={profile} />
      </main>

      <Footer profile={profile} />
      <WhatsAppFAB phone={profile?.whatsapp} />
    </>
  );
}
