import { useEffect, useState } from 'react';
import { supabase, TABLES } from '../lib/supabase';

const DEFAULT_PROFILE = {
  store_name: 'MJ STORE',
  logo_url: '',
  whatsapp: '+5492994565758',
  instagram_url: '',
  facebook_url: '',
  google_maps_url: '',
  address: '',
  exchange_rate_ars_per_usd: 1000,
};

export function useStoreProfile() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLES.storeProfile)
        .select('*')
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setProfile(DEFAULT_PROFILE);
      } else if (data) {
        setProfile({ ...DEFAULT_PROFILE, ...data });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { profile, loading, error, setProfile };
}
