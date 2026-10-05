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
  catalogColors: 'catalog_colors',
  clientNotes: 'client_notes',
  invoiceInstallments: 'invoice_installments',
  dashboardLayouts: 'dashboard_layouts',
};

export const BUCKETS = {
  productImages: 'product-images',
  storeAssets: 'store-assets',
};

/** Ruta dentro del bucket a partir de una URL pública de Storage (null si no es de ese bucket). */
export function storagePathFromPublicUrl(url, bucket) {
  if (typeof url !== 'string') return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const start = url.indexOf(marker);
  if (start < 0) return null;
  return decodeURIComponent(url.slice(start + marker.length).split('?')[0]);
}

/** Mensaje para el usuario; detecta columnas faltantes (migración sin aplicar). */
export function friendlyDbError(error) {
  const message = error?.message || '';
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(error?.code) && /dashboard_layout/i.test(message)) {
    return 'Falta aplicar la migración 010_dashboard_layouts.sql en Supabase (SQL Editor).';
  }
  if (/model_id|battery_health|catalog_colors|catalog_models\.(line|is_active|image_url)/i.test(message)) {
    return 'Falta aplicar la migración 011_product_models.sql en Supabase (SQL Editor).';
  }
  if (error?.code === 'PGRST204' || error?.code === '42703' || /column .* does not exist|could not find the .* column/i.test(message)) {
    return 'Falta aplicar la migración 009_appearance.sql en Supabase (SQL Editor).';
  }
  return message || 'Ocurrió un error inesperado. Intentá de nuevo.';
}
