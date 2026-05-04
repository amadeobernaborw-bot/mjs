import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    '[supabase] Variables de entorno faltantes. Crear .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const TABLES = {
  products: 'products',
  tradeIn: 'trade_in_models',
  leads: 'leads',
  storeProfile: 'store_profile',
  clients: 'clients',
  invoices: 'invoices',
  cashMovements: 'cash_movements',
  cashCategories: 'cash_categories',
  paymentMethods: 'payment_methods',
  catalogTypes: 'catalog_types',
  catalogModels: 'catalog_models',
  catalogCapacities: 'catalog_capacities',
  catalogConditions: 'catalog_conditions',
};

export const BUCKETS = {
  productImages: 'product-images',
  storeAssets: 'store-assets',
};
